# Changelog

## 1.1.0 - 2026-09-27

### Added

- Separate Clean links, Remove clutter, and Modern layout controls in a smaller popup.
- Let discussion threads use the available page width, with a bounded deal list width, clearer spacing and more readable metadata.
- Apply Hide sidebar on the forum home page and scale thread deal headers with the Text size control.
- Use the same small side gutters on forum lists and thread lists as on threads.
- Connect discussion replies with thin borders on both sides, consistent dividers and tighter spacing.
- Use RFD's divider color on deal rows as well as discussion posts.
- Match the popup accent to RFD red.
- Support hostname and query based redirect rules alongside existing regex rules.
- Migrate existing rule configuration from IndexedDB to extension storage.

### Changed

- Hide signatures and secondary author details on new installations; preserve version 1 settings on upgrade.
- Allow clutter removal while Modern layout is off.
- Group the link tester, recent activity, rule source, and update status under Advanced.
- Serialize background rule updates to avoid overlapping saves.

### Fixed

- Preserve a version 1 user's disabled layout choice when initializing the new clutter control.
- Apply signature cleanup only to recognized discussion threads.
- Recognize supported content added after the page initially loads, and details inserted inside existing posts.
- Match bundled affiliate wrappers by hostname, avoiding lookalike URLs.
- Let RFD determine signature display when the extension does not hide it.

## 1.0.1 - 2026-09-27

### Fixed

- Refresh changed link-cleaning rules in already-open forum tabs, including links cleaned under the previous rules.
- Hide sponsored placements added dynamically outside the deal list or discussion thread.
- Report Chrome Web Store upload, submission and validation states in the publishing workflow.
- Remove a documentation link to an ignored local plan.

### Changed

- Cache compiled redirect rules and limit link rescans after unrelated class changes.
- Apply appearance setting changes without rebuilding existing page annotations.

## 1.0.0 - 2026-09-26

### Added

- Rename the extension to RFD Enhancement Suite.
- Add default-on layout improvements for Hot Deals card listings and discussion threads, with a switch for users who want link cleaning alone.
- Add a text size slider and switches for promotions, sidebars, signatures and author statistics.
- Add an update page that opens once when an existing installation upgrades to 1.0.0, with a preview link in the popup.
- Add an independent, default-on **Clean links on forum pages** switch. Turning it off stops rewrites and restores links the extension changed when the site has not changed them since.
- Add Chromium and Firefox rendering fixtures and instructions for loading the source extension in Brave.

### Changed

- Use the full available page width on supported lists and threads, with sidebars hidden by default and restorable from the popup. Classic Hot Deals lists retain their native rows and controls while gaining the sidebar switch.
- Remove gaps between deal rows and discussion posts, default post text to 18 px, and scale quotes, reply details and Hot Deals list text with the text-size slider.
- Keep join date, post count, upvotes and location visible by default, with an option to hide them together. Preserve RFD's own timestamp and emoji sizing.
- Show signatures present in the page by default and let the signature switch hide them independently of other appearance settings.
- Rename the Modern view switch to Simplify layout and keep it independent of the signature and link-cleaning switches.
- Leave page colours and light/dark mode under RFD's own controls.
- Hide recognized sponsored placements, labeled sponsored threads, pencil ads and the member header leaderboard when **Hide promotions and sponsored threads** is on.
- Leave search, account, profile, forum directory and unknown layouts in their native view.

### Fixed

- Reapply layout improvements when supported forum content is replaced dynamically, while preserving the user's appearance settings.
- Restore the main column's width after hiding RFD's sidebar, including the sidebar nested inside Hot Deals filters.
- Convert desktop deal cards into contiguous full-width rows and move the filter sidebar into RFD's existing More Filters drawer when hidden.
- Clean matching links in forum post content and deal buttons even when RFD omits its usual link classes, and update full-URL link text when the destination changes.

## 0.8.1 - 2026-09-22

### Changed

- Match the popup to the browser's light or dark color preference with a neutral GitHub-inspired palette

## 0.8.0 - 2026-09-21

### Added

- Clean affiliate links added to a forum page after it loads, including links whose URL or eligible class changes
- Use bundled redirect rules when cached or remote rules are unavailable, so the extension works on a fresh offline installation
- Show the current page's cleaned-link count, recent original/destination pairs, and rules-update status in the popup
- Add a popup link tester that previews the cleaned destination and each matching rule without opening the link
- Validate remote redirect rules before applying them and retain the last valid rules when an update fails

### Fixed

- Preserve Amazon seller, variant, unrelated parameters, fragments, and encoded query values while removing tracking data
- Stop cyclic or expanding redirect chains after a bounded number of transformations
- Keep the Tampermonkey userscript synchronized with the extension's URL-cleaning behavior

### Changed

- Exclude development tests and notes from packaged extension artifacts

## 0.7.0 - 2026-07-23

### Added

- Strip `adclick.g.doubleclick.net` Google Ads redirects
- Strip `njih.net` (Impact Radius) affiliate redirects
- Strip stray `subId1` tracking parameters left dangling on destination URLs
- Strip Amazon `ref_` and `social_share` tracking parameters from mobile/share links

### Fixed

- Redirect stripping no longer rewrites a link to a non-http(s) URL (e.g. `javascript:`), closing a click-triggered DOM XSS path where a crafted forum link's tracking parameter could be replayed back into `href`
- Tampermonkey userscript (`script.js`) now shares the exact same stripping logic as the browser extension, instead of a hand-copied version that had drifted out of sync (it was missing chained-redirect handling and query param preservation)

### Changed

- `stripRedirect` logic extracted into a shared module (`js/stripRedirect.js`) used by the extension, the userscript template, and the test suite, so the two can no longer diverge silently

## 0.6.1 - 2026-03-13

### Added

- Strip Amazon affiliate `tag` parameter from direct product URLs
- Strip Amazon internal `ref` tracking from both URL path segments and query parameters
- Multiple redirect rules can now be applied to the same URL in successive passes
- Unit tests for all redirect stripping rules using Node's built-in test runner
- GitHub Actions workflow to run tests on push and pull request
- Popup now shows success/error feedback when saving or resetting config
- URL validation on save — checks for valid URL format, reachability, and valid JSON response

### Changed

- Replaced `chrome.storage` with IndexedDB for persisting config and redirects
- Content script now requests redirects from the background script via messaging instead of reading from `chrome.storage` directly

### Removed

- `chrome.storage` dependency
