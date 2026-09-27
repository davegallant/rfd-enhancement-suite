# Modern RFD browser validation

Implementation worktree: `codex/modern-rfd`. Automated runs use sanitized, offline fixtures. They do not prove that the loaded extension works on the current live forum or with a signed-in account.

## Completed locally

- Node regression suite: 117 tests after review fixes, verified 2026-09-26.
- Earlier Playwright fixture rendering: Chromium and Firefox at 390, 768 and 1440 px for list/thread. Checked activation, row compactness, no page overflow and native theme restoration with layout improvements off.
- Saved public forum HTML from 2026-09-26 had 43 deal rows recognized when rendered offline with the site's public CSS. Its scripts were removed, so interactive controls were not validated.
- Headless live RFD navigation did not reach DOM ready or a visible `#forum-topics` within 20/12 seconds respectively. Do not treat this as a site defect or an extension pass/fail.

## Release gate: real extension and authenticated interaction

On a current RFD forum list and thread in Brave/Chromium and Firefox:

- Confirm layout improvements are initially on and there is no major layout breakage. Check menus, filters, sort, pagination, search, post anchors and recovery through the popup switch.
- Toggle RFD's own light/dark mode, then move the Text size slider through 16, 18 and 24 px. Check that post text, reply dates, author details, action labels, quotes, card titles, classic list titles and list metadata remain readable in both modes, and rows/posts have no added gap. Test at narrow width, 200% zoom and keyboard focus.
- On a desktop Hot Deals card list with Hide sidebar on, confirm each deal spans the list width with no space between rows. Open and close More Filters; its controls must remain usable.
- Confirm the 1.0.0 update page opens only when upgrading from an earlier version, and that its popup preview link works. Reloading the same unpacked version must not reopen the page.
- Confirm page-local cleaned links still rewrite while layout improvements are off.
- Signed in: enter a disposable draft and preview, inspect quote, voting, report, subscribe and edit controls. Do not submit votes, reports or posts merely for the smoke check.
- Check modal and editor layering, inline images/tables/quotes/spoilers, and old/classic listing fallback.
- Firefox Android requires a separate device check. Desktop responsive testing does not establish Android support.
- Verify Hide signatures on a live thread with a signature at desktop and narrow widths, with Simplify layout on and off. The switch targets `.signature` inside posts without changing page colours. Confirm the signature is present in the DOM before checking its visibility.

Record date, browser build, OS, page URL type (avoid private URLs), pass/fail and screenshots before store submission. Resolve failures before publishing.
