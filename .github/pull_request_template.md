> **Before opening:** make sure there is an issue tracking this work, and link it below. PRs without a linked issue may be closed without review.

## Linked issue

Closes #

## What this PR does

<!-- 2–4 sentences. What changed and why? Focus on the "what" — the issue already explains the "why". -->

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] ML model / training pipeline
- [ ] Refactor (no behaviour change)
- [ ] Documentation
- [ ] Tests only

## ML tier (if applicable)

- [ ] Tier 1 — Triage
- [ ] Tier 2 — Predictive
- [ ] Tier 3 — Autonomous
- [ ] Not ML-related

## Stack affected

- [ ] Backend
- [ ] Frontend
- [ ] Both

---

## Changes

### Backend

<!-- List the meaningful backend changes. Delete if none. -->

-

### Frontend

<!-- List the meaningful frontend changes. Delete if none. -->

-

### New dependencies

<!-- List any new packages added to requirements.txt or package.json, and why each is needed. Delete if none. -->

-

### Database / schema changes

<!-- Describe any new tables, columns, or migrations. Delete if none. -->

-

---

## Testing

**How did you test this?**

<!-- Describe what you ran, on what kind of repo/ZIP, and what you observed. Screenshots welcome. -->

**Checklist**

- [ ] Tested locally end-to-end (upload ZIP or GitHub URL → scan → findings returned correctly)
- [ ] New ML model falls back gracefully when model file is absent
- [ ] No new `console.error` or unhandled Python exceptions introduced
- [ ] Added or updated tests where applicable
- [ ] `requirements.txt` / `package.json` updated if new dependencies added
- [ ] New model files (`.pkl`, `.pt`, etc.) are gitignored, not committed

---

## Anything reviewers should focus on

<!-- Is there a design decision you're unsure about? A tricky piece of logic? Tell reviewers where to look. -->

## Screenshots (if UI changed)

<!-- Before / after screenshots or a short screen recording. Delete if not applicable. -->
