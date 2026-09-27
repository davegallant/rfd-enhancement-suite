# Modern RFD browser validation

Version 1.1.0 implementation checkout: `main`. Automated runs use sanitized, offline fixtures. They do not prove that the loaded extension works on the current live forum or with a signed-in account.

## Completed locally

- Node regression suite: 133 tests, verified 2026-09-27.
- Earlier Playwright fixture rendering: Chromium and Firefox at 390, 768 and 1440 px for list/thread. Repeat after the thread width change to check for overflow, native theme restoration and independent clutter controls.
- Saved public forum HTML from 2026-09-26 had 43 deal rows recognized when rendered offline with the site's public CSS. Its scripts were removed, so interactive controls were not validated.
- Headless live RFD navigation did not reach DOM ready or a visible `#forum-topics` within 20/12 seconds respectively. Do not treat this as a site defect or an extension pass/fail.

## Release gate: real extension and authenticated interaction

On a current RFD forum list and thread in Brave/Chromium and Firefox:

- Confirm layout improvements are initially on and there is no major layout breakage. Check menus, filters, sort, pagination, search, post anchors and recovery through the popup switch.
- Toggle RFD's own light/dark mode, then move the Text size slider through 16, 18 and 24 px. Check post text, reply dates, author details, action labels, quotes, card titles, classic list titles and list metadata in both modes. Test at narrow width, 200% zoom and keyboard focus.
- On a desktop Hot Deals card list with Hide sidebar on, confirm rows form a centered list no wider than 1280 px. Open and close More Filters; its controls must remain usable. Threads should use the available width with 16 px side gutters.
- Confirm the 1.1.0 update page opens only when upgrading from an earlier version, and that its popup link works. Reloading the same unpacked version must not reopen the page.
- Confirm page-local cleaned links still rewrite while Modern layout is off. Toggle Remove clutter independently and check promotions, sidebar, signatures and author details.
- Upgrade an existing installation with a custom rules URL and appearance choices. Check that the rules, update status and explicit choices survive the migration to extension storage.
- Signed in: enter a disposable draft and preview, inspect quote, voting, report, subscribe and edit controls. Do not submit votes, reports or posts merely for the smoke check.
- Check modal and editor layering, inline images/tables/quotes/spoilers, and old/classic listing fallback.
- Firefox Android requires a separate device check. Desktop responsive testing does not establish Android support.
- Verify Hide signatures on a live thread with a signature at desktop and narrow widths, with Modern layout on and off. Confirm the signature is present in the DOM before checking its visibility. Turning Remove clutter off should reveal it.

Record date, browser build, OS, page URL type (avoid private URLs), pass/fail and screenshots before store submission. Resolve failures before publishing.
