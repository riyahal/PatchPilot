from backend.app.ml.embedder import embed_findings

findings = [
    {
        "rule_id": "SQL001",
        "message": "Possible SQL injection",
        "file_path": "src/user.py"
    },
    {
        "rule_id": "AUTH001",
        "message": "Weak password policy",
        "file_path": "src/auth.py"
    }
]

embeddings = embed_findings(findings)

print(embeddings.shape)