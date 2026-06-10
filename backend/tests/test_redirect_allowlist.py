from unittest.mock import AsyncMock, patch

import httpx
import pytest
from fastapi import HTTPException

from app.main import ALLOWED_REDIRECT_HOSTS, MAX_REDIRECTS, download_to_path

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_redirect_response(location: str, status_code: int = 302) -> httpx.Response:
    """Build a minimal redirect httpx.Response."""
    return httpx.Response(
        status_code=status_code,
        headers={"location": location},
        request=httpx.Request(
            "GET", "https://github.com/owner/repo/archive/refs/heads/main.zip"
        ),
    )


def _make_ok_response(content: bytes = b"PK\x03\x04fakezip") -> httpx.Response:
    return httpx.Response(
        status_code=200,
        content=content,
        request=httpx.Request(
            "GET", "https://codeload.github.com/owner/repo/zip/refs/heads/main"
        ),
    )


# ---------------------------------------------------------------------------
# Allowlist constant sanity checks
# ---------------------------------------------------------------------------


def test_allowlist_contains_required_github_hosts():
    assert "github.com" in ALLOWED_REDIRECT_HOSTS
    assert "codeload.github.com" in ALLOWED_REDIRECT_HOSTS


def test_max_redirects_is_reasonable():
    assert 1 <= MAX_REDIRECTS <= 10


# ---------------------------------------------------------------------------
# SSRF / disallowed-host tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_blocks_redirect_to_internal_metadata_ip(tmp_path):
    """A redirect to the cloud-metadata endpoint must be blocked."""
    dest = tmp_path / "repo.zip"

    # First request: redirect to the AWS metadata IP
    redirect_resp = _make_redirect_response("http://169.254.169.254/latest/meta-data/")
    ok_resp = _make_ok_response()

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=[redirect_resp, ok_resp])

    with patch("app.main.httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=None)

        with pytest.raises(HTTPException) as exc_info:
            await download_to_path(
                "https://github.com/owner/repo/archive/refs/heads/main.zip", dest
            )

    assert exc_info.value.status_code == 400
    assert "169.254.169.254" in exc_info.value.detail


@pytest.mark.anyio
async def test_blocks_redirect_to_localhost(tmp_path):
    """A redirect to localhost must be blocked."""
    dest = tmp_path / "repo.zip"

    redirect_resp = _make_redirect_response("http://localhost/internal")
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=[redirect_resp])

    with patch("app.main.httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=None)

        with pytest.raises(HTTPException) as exc_info:
            await download_to_path(
                "https://github.com/owner/repo/archive/refs/heads/main.zip", dest
            )

    assert exc_info.value.status_code == 400
    assert "localhost" in exc_info.value.detail


@pytest.mark.anyio
async def test_blocks_redirect_to_arbitrary_external_host(tmp_path):
    """A redirect to an arbitrary external host must be blocked."""
    dest = tmp_path / "repo.zip"

    redirect_resp = _make_redirect_response("https://evil.example.com/malicious.zip")
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=[redirect_resp])

    with patch("app.main.httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=None)

        with pytest.raises(HTTPException) as exc_info:
            await download_to_path(
                "https://github.com/owner/repo/archive/refs/heads/main.zip", dest
            )

    assert exc_info.value.status_code == 400
    assert "evil.example.com" in exc_info.value.detail


# ---------------------------------------------------------------------------
# Happy-path tests (redirects within the allowlist)
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_follows_redirect_to_codeload_github(tmp_path):
    """
    github.com/…/archive/… normally redirects to codeload.github.com.
    That redirect must be followed successfully.
    """
    dest = tmp_path / "repo.zip"
    fake_zip = b"PK\x03\x04fakezip"

    redirect_resp = _make_redirect_response(
        "https://codeload.github.com/owner/repo/zip/refs/heads/main"
    )
    ok_resp = _make_ok_response(content=fake_zip)

    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=[redirect_resp, ok_resp])

    with patch("app.main.httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=None)

        await download_to_path(
            "https://github.com/owner/repo/archive/refs/heads/main.zip", dest
        )

    assert dest.exists()
    assert dest.read_bytes() == fake_zip


@pytest.mark.anyio
async def test_direct_200_no_redirect(tmp_path):
    """No redirect at all – a direct 200 response must succeed."""
    dest = tmp_path / "repo.zip"
    fake_zip = b"PK\x03\x04directzip"

    ok_resp = _make_ok_response(content=fake_zip)
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=ok_resp)

    with patch("app.main.httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=None)

        await download_to_path(
            "https://github.com/owner/repo/archive/refs/heads/main.zip", dest
        )

    assert dest.read_bytes() == fake_zip


# ---------------------------------------------------------------------------
# Edge-case tests
# ---------------------------------------------------------------------------


@pytest.mark.anyio
async def test_too_many_redirects_raises(tmp_path):
    """Exceeding MAX_REDIRECTS should raise an HTTPException."""
    dest = tmp_path / "repo.zip"

    # Every response is a redirect back to the same allowed URL
    redirect_resp = _make_redirect_response(
        "https://github.com/owner/repo/archive/refs/heads/main.zip"
    )
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=redirect_resp)

    with patch("app.main.httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=None)

        with pytest.raises(HTTPException) as exc_info:
            await download_to_path(
                "https://github.com/owner/repo/archive/refs/heads/main.zip", dest
            )

    assert exc_info.value.status_code == 400
    assert "Too many redirects" in exc_info.value.detail


@pytest.mark.anyio
async def test_redirect_missing_location_header_raises(tmp_path):
    """A 302 with no Location header should raise an HTTPException."""
    dest = tmp_path / "repo.zip"

    bad_redirect = httpx.Response(
        status_code=302,
        headers={},  # no location
        request=httpx.Request(
            "GET", "https://github.com/owner/repo/archive/refs/heads/main.zip"
        ),
    )
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=bad_redirect)

    with patch("app.main.httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=None)

        with pytest.raises(HTTPException) as exc_info:
            await download_to_path(
                "https://github.com/owner/repo/archive/refs/heads/main.zip", dest
            )

    assert exc_info.value.status_code == 400
    assert "Location" in exc_info.value.detail


@pytest.mark.anyio
async def test_non_200_non_redirect_raises(tmp_path):
    """A 404 (or any non-redirect, non-200) response should raise an HTTPException."""
    dest = tmp_path / "repo.zip"

    not_found = httpx.Response(
        status_code=404,
        request=httpx.Request(
            "GET", "https://github.com/owner/repo/archive/refs/heads/main.zip"
        ),
    )
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=not_found)

    with patch("app.main.httpx.AsyncClient") as mock_cls:
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=None)

        with pytest.raises(HTTPException) as exc_info:
            await download_to_path(
                "https://github.com/owner/repo/archive/refs/heads/main.zip", dest
            )

    assert exc_info.value.status_code == 400
    assert "404" in exc_info.value.detail
