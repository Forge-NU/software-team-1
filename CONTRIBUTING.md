# Contributing to [Project Name]

## Before You Start
- Every piece of work should have an issue. Open one under **Issues → New Issue** before you start coding — this keeps your PL and the rest of the team in sync on what's being worked on.
- Pick the right template: Feature/User Story, Bug Report, Task/Chore, or Design Review Follow-up.

## Git Workflow (minimum bar for every Forge repo)
- Work on a feature branch off `main` (or `dev` if the team uses one) — never commit directly to `main`.
- Name branches something legible, e.g. `feature/login-page` or `fix/broken-signup`.
- Open a Pull Request when your branch is ready. **At least one reviewer must approve before merging.**
- Write meaningful commit messages — not "fix stuff" or "wip".
- Never commit secrets, API keys, or `.env` files. If you accidentally do, tell your PL immediately — rotating the key matters more than the embarrassment.
- Reference the issue your PR closes: include `Closes #12` (or `Fixes #12`) in the PR description so the ticket auto-closes on merge.

## Code Review
- Every PR needs at least 1 approval before merging.
- Reviewers: check for correctness, but also readability — could the next person maintain this?

## Questions
Ask in the team Slack channel, or flag it to your Project Lead.
