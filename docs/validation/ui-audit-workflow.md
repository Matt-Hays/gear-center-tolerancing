# UI Audit Workflow

Use `npm run audit:screenshots` to capture the five application routes in both themes and at desktop/mobile widths.

The script:

- starts `vite preview` automatically if `http://127.0.0.1:4173` is not already available,
- opens a local Chromium browser through the DevTools protocol,
- loads the sample project from the home screen,
- expands route details such as evidence drawers and the engineering trace,
- writes screenshots into `tmp-ui-audit-shots`.

Optional environment variables:

- `UI_AUDIT_BASE_URL`: preview URL to capture instead of `http://127.0.0.1:4173`
- `UI_AUDIT_BROWSER`: explicit Edge/Chrome executable path
- `UI_AUDIT_OUTPUT_DIR`: output folder for generated screenshots
- `UI_AUDIT_START_PREVIEW=false`: require an already running preview server instead of auto-starting one

Use the captured images alongside `npm run test:unit -- --run` so contrast regressions and dense-screen regressions are both checked before release.
