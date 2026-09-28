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
- Toggle RFD's own light/dark mode and use browser zoom to resize the page. Check post text, reply dates, author details, action labels, quotes, card titles, classic list titles and list metadata in both modes. Test at narrow width, 200% zoom and keyboard focus.
- On desktop Hot Deals card and classic lists with Hide sidebar on, confirm rows fill the content column and align with the list header, with 16 px page gutters and no extra centered-list margins. Open and close More Filters; its controls must remain usable. Threads and the forum home page should also have 16 px side gutters when the sidebar is hidden.
- On the forum home page, toggle Hide sidebar and confirm the forum directory remains usable while the primary column reclaims the space. On a deal thread, confirm original posts, replies, and quotes use the readable default size and remain usable at 200% browser zoom.
- Confirm the 1.1.0 update page opens only when upgrading from an earlier version, and that its popup link works. Reloading the same unpacked version must not reopen the page.
- Confirm page-local cleaned links still rewrite while Modern layout is off. Toggle Remove clutter independently and check promotions, sidebar, signatures and author details.
- Upgrade an existing installation with a custom rules URL and appearance choices. Check that the rules, update status and explicit choices survive the migration to extension storage.
- Signed in: enter a disposable draft and preview, inspect quote, voting, report, subscribe and edit controls. Do not submit votes, reports or posts merely for the smoke check.
- Check modal and editor layering, inline images/tables/quotes/spoilers, and the classic listing layout.
- In both Hot Deals list layouts, check text-first rows, muted metadata, thin separators and wrapped long titles. Card thumbnails and decorative badges should be hidden; sponsored labels must remain identifiable when Hide promotions is off. In classic lists, reply counts must remain visible on mobile and the last-post arrow must still work. Open each row's menu and verify it is not clipped. Turning Modern layout off should restore native rows, thumbnails and metadata.
- In both list layouts, check positive scores in green, zero in grey and negative scores in red, including after RFD updates a score and after switching between light and dark mode.
- Firefox Android requires a separate device check. Desktop responsive testing does not establish Android support.
- Verify Hide signatures on a live thread with a signature at desktop and narrow widths, with Modern layout on and off. Confirm the signature is present in the DOM before checking its visibility. Turning Remove clutter off should reveal it.

Record date, browser build, OS, page URL type (avoid private URLs), pass/fail and screenshots before store submission. Resolve failures before publishing.
