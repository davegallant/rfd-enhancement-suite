# RFD Enhancement Suite

<img src="docs/images/popup.png" alt="RFD Enhancement Suite popup with cleanup options expanded" width="360">

Gives [RedFlagDeals forums](https://forums.redflagdeals.com/) a simpler interface for Hot Deals lists and discussion threads, and cleans supported affiliate redirects and tracking parameters from forum links. Appearance improvements and link cleaning are independent, and both are on by default.

[![Get the Firefox add-on](docs/images/firefox-add-on-button.png)](https://addons.mozilla.org/en-US/firefox/addon/rfd-redirect-stripper/) [![Available in the Chrome Web Store](docs/images/chrome-web-store-badge.png)](https://chromewebstore.google.com/detail/rfd-affiliate-stripper/nhjomcijhonhoggkckbjjfnjdcefbblo)

The latest release is available from source; store listings may lag while a new version is under review.

## Appearance

Hot Deals listings get a quieter, text-first layout: clear titles, muted metadata, thin separators, no product thumbnails or decorative card styling. Both card and classic lists use connected rows in the same system font as discussion replies, with scores in green above zero, grey at zero and red below zero — including in RFD's dark mode. Classic lists hide view counts, category columns and repeated author details. Discussion threads use the available page width with small side gutters. RFD keeps control of page colours and light/dark mode, and the extension preserves RFD's links, filters, pagination, posting controls, thread order, timestamps and emoji sizing. The forum home page keeps its native content and controls (the sidebar setting still applies there), search results support sidebar cleanup, and account, profile and unrecognized page layouts stay native.

| Popup control | Default | Effect |
| --- | --- | --- |
| Modern layout | On | Use clearer deal rows and a spacious discussion layout. |
| Remove clutter | On | Master switch for the cleanup options below. Works independently of Modern layout. |
| Hide promotions and sponsored threads | On | Hide recognized ads, sponsored placements and labeled sponsored threads in both Hot Deals list layouts, including pencil ads and the member header leaderboard. This changes display; it does not block requests. |
| Hide sidebar | On | Hide sidebars on the forum home page, search results, card lists, classic Hot Deals lists and threads, using the freed space. On card lists, RFD's filters remain available through More Filters. Turn it off to restore RFD's sidebar spacing. |
| Hide footer | On | Hide the site footer and reserved bottom ad spaces across forum pages. Turn it off to restore footer links. |
| Hide signatures | On for new installs | Hide signatures present in discussion posts. Existing version 1 choices are preserved. |
| Compact author details | On for new installs | Hide join date, post count, upvotes and location; names and ranks remain. Existing version 1 choices are preserved. |

Discussion text defaults to 17 px. Use your browser’s zoom controls to adjust the page size.

Settings persist across supported tabs, and **Reset appearance** restores the defaults above. Turning Modern layout off leaves cleanup and link cleaning active — unless you're upgrading from version 1 with the layout disabled, in which case Remove clutter starts off too. Turning Remove clutter off reveals promotions, sidebars, the footer, signatures and secondary author details without discarding your individual preferences. The popup links to the latest update page, and patch releases update quietly without opening a new tab. Note that RFD sometimes omits signature markup itself; the extension can only hide signatures present in the page.

### Quick test in a Chromium browser

1. Open the extensions page (`chrome://extensions`, `brave://extensions`, …) and turn on **Developer mode**.
2. Select **Load unpacked** and choose this checkout's folder — the one containing `manifest.json`. No build step needed.
3. Open or reload `https://forums.redflagdeals.com/hot-deals-f9/`, then open a deal thread. The layout improvements apply by default.
4. Use the popup to toggle the appearance and link-cleaning switches. After editing source files, reload the extension on the extensions page and refresh the forum tab.

## How it works

When link cleaning is on, the extension checks forum post and deal-button links against its [redirect rules](redirects.json). A `go.redirectingat.com` link wrapping an Amazon product URL becomes the direct `amazon.ca/dp/...` link, and Amazon rules strip selected tracking parameters while preserving unrelated query values, seller and variant info, URL fragments and search keywords. Visible link text is updated when it shows the full original URL.

Turning cleaning off stops new rewrites and restores previously cleaned links the site hasn't changed since; turning it back on resumes. Reload any RFD tabs that were open before installation.

## Using the popup

- **Cleaned links:** how many distinct links were cleaned on the current page. **Recent cleaned links** lists up to 50 recent original/cleaned pairs; the history lives in page memory and clears on reload, when cleaning is turned off, or when rules change.
- **Clean links:** the automatic rewrite switch, independent of appearance settings.
- **Test a link:** preview the cleaned destination and each applied rule for a pasted URL, without opening it. Reports invalid URLs and warns on cycles or the 20-step limit.
- **Rules status:** last successful update or error. Bundled rules cover fresh installs and failed updates.
- **Rules URL:** validate and use a trusted JSON rules file, or **Use default** to restore the bundled source. Open forum pages pick up changed rules automatically.

Rules are re-checked hourly and open forum pages refresh when they change; failed downloads keep the last valid rules and surface the error in the popup.

## Running from source

Requires Node.js and npm.

```sh
npm ci
npm run start:firefox   # dev loop in Firefox (auto-reload)
```

```sh
npm test                         # unit tests
npx playwright install chromium firefox
npm run test:browser              # browser tests
npm run lint
npm run build                     # package in web-ext-artifacts/
```

`web-ext run` does not work with LibreWolf ([upstream issue](https://github.com/mozilla/web-ext/issues/3473)); load it there via `about:debugging` → Load Temporary Add-on → `manifest.json`.

## Contributing redirect rules

Rules live in [redirects.json](redirects.json) — open a pull request to add or update one. To try rules from a branch, point **Rules URL** at its raw JSON file, for example:

```text
https://raw.githubusercontent.com/davegallant/rfd-enhancement-suite/my-new-branch/redirects.json
```

The file must be a JSON array. A rule matches by regex `pattern` (with a named `baseUrl` capture group), exact `host`, `hosts` list, `hostSuffixes` (a domain plus its subdomains), or regex `hostPattern` on the hostname. Structured rules need at least one operation, and `name` labels the rule in the link tester. Supported operations are:

| Field | Effect |
| --- | --- |
| `destinationParam` | Read the destination URL from this query parameter. |
| `removeParams` | Remove the listed query parameters while preserving the encoding of retained values. |
| `removePathRef` | Remove a trailing `/ref=...` path segment. |
| `pathPattern` | Limit a structured rule to matching URL paths. |

When a rule sets `destinationParam`, it takes precedence: `removeParams` and `removePathRef` on the same rule are ignored.

Operations run only when the rule matches; regex-only rules remain supported. Only HTTP/HTTPS destinations are accepted, and cleaning stops after 20 steps or a cycle. Use trusted rule sources: validation does not bound an individual regex's runtime — [regex101.com](https://regex101.com/) helps test patterns.

## Tampermonkey userscript

The project began as a [Tampermonkey](https://www.tampermonkey.net/) userscript. You can copy [script.js](script.js) into Tampermonkey if you prefer that format. It contains the cleaning rules and URL preservation logic, but the browser extension provides dynamic link monitoring, rule updates, and the popup. Regenerate it from the template after changing rules or the cleaning logic with `npm run build:userscript`.

## Store publishing

The [publish workflow](.github/workflows/publish.yaml) runs for `v*` tags (the tag must match [manifest.json](manifest.json)) and can be triggered manually. It tests, lints, builds, and submits to each store with credentials configured. The Chrome job reports upload/submission states and API errors; a successful submission may still await store review.

To release: complete the [live browser release checks](docs/testing/modern-rfd-manual.md), bump the manifest version, update the changelog, and tag.

Set the Actions variable `CHROME_PUBLISH_PAUSED` to `true` to skip Chrome submissions while an earlier version is under review (GitHub releases and Firefox submissions continue); clear it before manually publishing the latest tag to Chrome.

Add these secrets after completing the store listings in their dashboards:

| Store | Required secrets |
| --- | --- |
| Chrome Web Store | `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`, `CWS_PUBLISHER_ID`, `CWS_EXTENSION_ID` |
| Firefox Add-ons | `AMO_JWT_ISSUER`, `AMO_JWT_SECRET` |

Chrome uses an OAuth client + refresh token with the `chromewebstore` scope and IDs from the Chrome Developer Dashboard; Firefox uses an AMO API key and secret. A store's job is skipped until all its secrets are present.
