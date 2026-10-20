# Working rules for this repository

- Follow `PROCESS.md`: evidence first, a task card with acceptance criteria before work, independent review, executable gates, honest reports. Update `WORKLOG.md` at the end of each meaningful task.
- Owner's rule (2026-10-20): Claude does all the work itself. Subagents are reviewers only: read-only, separate context, they never edit files.
- Design phase: no game code until the owner approves. Every screen, section or option needs a visual design the owner approves before it is built. The owner generates all AI images; ask for them.
- Agreed decisions live in `decisions/decisions.json`. Never change one without the owner's explicit answer, and log every approval in `decisions/decisions_log.txt`.
- Mockups use the approved tokens (see `design/shared/SCREEN3_BRIEF.md`) and must pass `python3 -I tools/check_screen.py <screen_dir>` on all 7 devices in `design/shared/devices.json`.
- Talk to the owner in simple Gulf Arabic, with Western digits. Never claim "tested on iPhone" for browser mockups.
- Files and code must not contain AI model identifiers (the standard commit attribution trailer is the only exception).
