from collections import defaultdict

from sklearn.cluster import DBSCAN

from app.ml.embedder import embed_findings


def deduplicate(
    findings: list[dict],
    epsilon: float = 0.15,
) -> list[dict]:
    """
    Group similar findings using DBSCAN and return
    representative findings with duplicate metadata.
    """

    if not findings:
        return []

    embeddings = embed_findings(findings)

    clustering = DBSCAN(
        eps=epsilon,
        min_samples=2,
        metric="cosine",
    )

    labels = clustering.fit_predict(embeddings)

    results = []
    clusters = defaultdict(list)

    for idx, label in enumerate(labels):
        clusters[label].append(findings[idx])

    for label, cluster_findings in clusters.items():
        # Noise point
        if label == -1:
            for finding in cluster_findings:
                finding["duplicate_count"] = 0
                finding["related_files"] = []
                results.append(finding)
            continue

        representative = max(
            cluster_findings,
            key=lambda finding: finding.get("raw_severity", 0),
        )

        related_files = [
            finding.get("file_path")
            for finding in cluster_findings
            if finding.get("file_path")
            != representative.get("file_path")
        ]

        representative["duplicate_count"] = len(cluster_findings)

        representative["related_files"] = related_files

        results.append(representative)

    return resultsfrom collections import defaultdict

from sklearn.cluster import DBSCAN

from app.ml.embedder import embed_findings


def deduplicate(
    findings: list[dict],
    epsilon: float = 0.15,
) -> list[dict]:
    """
    Group similar findings using DBSCAN and return
    representative findings with duplicate metadata.
    """

    if not findings:
        return []

    embeddings = embed_findings(findings)

    clustering = DBSCAN(
        eps=epsilon,
        min_samples=2,
        metric="cosine",
    )

    labels = clustering.fit_predict(embeddings)

    results = []
    clusters = defaultdict(list)

    for idx, label in enumerate(labels):
        clusters[label].append(findings[idx])

    for label, cluster_findings in clusters.items():
        # Noise point
        if label == -1:
            for finding in cluster_findings:
                finding["duplicate_count"] = 0
                finding["related_files"] = []
                results.append(finding)
            continue

        representative = max(
            cluster_findings,
            key=lambda finding: finding.get("raw_severity", 0),
        )

        related_files = [
            finding.get("file_path")
            for finding in cluster_findings
            if finding.get("file_path")
            != representative.get("file_path")
        ]

        representative["duplicate_count"] = len(cluster_findings)

        representative["related_files"] = related_files

        results.append(representative)

    return results
