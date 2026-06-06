import aiosqlite
import os
import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "patchpilot.db")


async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS findings (
                id              TEXT PRIMARY KEY,
                job_id          TEXT NOT NULL,
                rule_id         TEXT,
                severity        TEXT,
                category        TEXT,
                file_path       TEXT,
                line_number     INTEGER,
                cwe             TEXT,
                scanner         TEXT,
                message         TEXT,
                package_name    TEXT,
                package_version TEXT,
                created_at      TEXT DEFAULT (datetime('now'))
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                job_id       TEXT PRIMARY KEY,
                project_name TEXT,
                scan_method  TEXT,
                created_at   TEXT DEFAULT (datetime('now'))
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS verify_outcomes (
                id TEXT PRIMARY KEY,
                job_id TEXT NOT NULL,
                passed INTEGER NOT NULL,
                new_issues_introduced INTEGER DEFAULT 0,
                verified_at TEXT DEFAULT (datetime('now'))
            )
        """)
        await db.commit()


async def get_db():
    return await aiosqlite.connect(DB_PATH)


async def get_trend_data(limit: int = 6):
    """Fetches the finding counts for the last N scans for the dashboard."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT 
                j.created_at, 
                COUNT(f.id) as findings_count
            FROM jobs j
            LEFT JOIN findings f ON j.job_id = f.job_id
            GROUP BY j.job_id
            ORDER BY j.created_at DESC
            LIMIT ?
        """,
            (limit,),
        )

        rows = await cursor.fetchall()
        rows = list(reversed(rows))

        formatted_data = []
        for row in rows:
            dt_obj = datetime.datetime.strptime(row["created_at"], "%Y-%m-%d %H:%M:%S")
            formatted_data.append(
                {"date": dt_obj.strftime("%b %d"), "findings": row["findings_count"]}
            )

        return formatted_data


async def get_cwe_distribution():
    """Fetches the vulnerability distribution for the most recent scan."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        cursor = await db.execute(
            "SELECT job_id FROM jobs ORDER BY created_at DESC LIMIT 1"
        )
        latest_job = await cursor.fetchone()

        if not latest_job:
            return []

        job_id = latest_job["job_id"]
        cursor = await db.execute(
            """
            SELECT category as name, COUNT(id) as value
            FROM findings
            WHERE job_id = ?
            GROUP BY category
            ORDER BY value DESC
        """,
            (job_id,),
        )

        rows = await cursor.fetchall()
        return [{"name": row["name"], "value": row["value"]} for row in rows]


async def get_dependency_diff():
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        cursor = await db.execute(
            "SELECT job_id FROM jobs ORDER BY created_at DESC LIMIT 2"
        )
        jobs = await cursor.fetchall()

        if len(jobs) < 2:
            return {"introduced": [], "resolved": [], "persistent": []}

        new_job_id = jobs[0]["job_id"]
        old_job_id = jobs[1]["job_id"]

        query = """
            SELECT id, rule_id, severity, message, package_name, package_version
            FROM findings
            WHERE job_id = ? AND category = 'dependency'
        """

        cur_new = await db.execute(query, (new_job_id,))
        new_findings = await cur_new.fetchall()

        cur_old = await db.execute(query, (old_job_id,))
        old_findings = await cur_old.fetchall()

        def make_key(f):
            return (f["rule_id"], f["package_name"])

        old_dict = {make_key(f): dict(f) for f in old_findings}
        new_dict = {make_key(f): dict(f) for f in new_findings}

        introduced = []
        resolved = []
        persistent = []

        for key, new_f in new_dict.items():
            if key in old_dict:
                persistent.append(new_f)
            else:
                introduced.append(new_f)

        for key, old_f in old_dict.items():
            if key not in new_dict:
                resolved.append(old_f)

        return {
            "introduced": introduced,
            "resolved": resolved,
            "persistent": persistent,
        }
