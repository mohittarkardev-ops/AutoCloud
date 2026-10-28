# AutoCloud — Project Checklist (pointer)

The full checklist (what is done, what is left, bucket, ideas, known issues) lives in:

`..\python-wrapper\PROJECT_CHECKLIST.md`

Quick web-dashboard status (details in the master file):
- [x] design.md + global tokens, Sidebar, shared UI (button/card/input/badge/table/dialog), Overview, Nodes table (compact, 12 rows/page)
- [~] Not yet built/clicked through by Claude → run `npm run lint && npm run build` after each UI batch
- [ ] Bucket: "Date format" dropdown in the Type Text node; workflow "Validate" button; Pause-all / live progress per node
- [ ] Left: workflow editor canvas, login page, node-details page only have the global colours

Rules: UI-only changes (see `design.md`); show the approach and get approval before building.
