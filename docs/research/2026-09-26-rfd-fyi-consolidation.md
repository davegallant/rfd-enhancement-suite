# Consolidating rfd-fyi into RFD Enhancement Suite

> **Superseded:** The user decided to keep rfd-fyi as a separate product. This document is historical research, not an active migration or deprecation proposal. Follow the [RES-inspired enhancement plan](../superpowers/plans/2026-09-26-res-inspired-enhancements.md) for future extension work.

Research date: 2026-09-26. This is a migration assessment, not an approved implementation plan.

Sources inspected: rfd-fyi at [`aaf6ff8`](https://github.com/davegallant/rfd-fyi/tree/aaf6ff89ee3abaf0c58a06c1e5c0d1ee98d31159), RES at [`4defffc`](https://github.com/honestbleeps/Reddit-Enhancement-Suite/tree/4defffc12235b86b50e458d9f3565c96376609ec), and this extension at `e645cc4`. Findings describe repository code; live deployment parity and extension access to RFD's API have not been verified.

## Recommendation

Make the extension the primary product. Use rfd-fyi as the source for existing deal-discovery behavior and reusable domain logic; use RES as a reference for independent modules, shared DOM observers, reversible filtering, and later reading tools.

Separate three milestones:

1. Replace the hosted browsing UI for extension users.
2. Consolidate maintained code into the extension repository and archive the old repository.
3. Shut down the hosted feed and enrichment services.

The first two can happen while an optional service remains. The third requires a decision about cached-feed coverage, generated tags, and access without installing an extension. Moving service code into this repository would consolidate ownership but would not eliminate infrastructure.

## Feature intersection

| Capability | rfd-fyi today | Extension / RES contribution | Proposed destination |
| --- | --- | --- | --- |
| Cleaner appearance | Dedicated Vue interface, themes, merchant labels | Extension enhances native lists and threads | Keep enhancement reversible; adapt visual details selectively |
| Merchant filtering | Persistent hidden merchants, case-insensitive matching | RES suggests composable filter rules | Shared filter logic for classic lists, cards, and any future feed |
| Search | Multiple ANDed terms, regex, highlighting, tag terms | RES adds scoped rules and explanations | Preserve search semantics; distinguish temporary searches from saved exclusion rules |
| Seen deals | Seen/unseen, bulk marking, 30-day retention | RES adds reading and reply tracking | Local extension storage keyed by topic ID |
| Score filtering | Optional score below -5 exclusion | Current extension has no personal score filter | Preserve default-off behavior; leave unknown scores visible |
| Sorting | Title, last activity, creation, score, replies, views over cached topics | DOM can only expose loaded rows and available fields | Label page-local sorting; use a feed view for cached-dataset sorting |
| Sponsored deals | Filters sponsored API records | Extension recognizes native DOM sponsorship markers | One normalized sponsored property with source-specific extraction |
| Link cleaning | Server-side offer URL unwrapping | Extension has a dedicated cleaner | Consolidate on the extension cleaner after checking expected outputs |
| Tags | Generated separately, joined by topic ID; # completion | RES supplies filter concepts, not these categories | Optional enrichment client with cached data and graceful absence |
| Settings transfer | Versioned JSON export including preferences and seen IDs | RES demonstrates versioned backups | Import the existing rfd-fyi format; export a versioned suite format |
| Stable refresh | Pending updates, viewport anchoring, visibility-aware polling | Useful if a feed is added | Preserve these behaviors in the feed; avoid silently reordering a native page |
| User notes / new replies | Not found in inspected rfd-fyi implementation | RES has both concepts | Later additions after rfd-fyi parity |

Primary implementations: [filters](https://github.com/davegallant/rfd-fyi/blob/aaf6ff89ee3abaf0c58a06c1e5c0d1ee98d31159/src/filterTopics.js), [preferences](https://github.com/davegallant/rfd-fyi/blob/aaf6ff89ee3abaf0c58a06c1e5c0d1ee98d31159/src/preferences.js), [seen deals](https://github.com/davegallant/rfd-fyi/blob/aaf6ff89ee3abaf0c58a06c1e5c0d1ee98d31159/src/composables/useSeenDeals.js), [application](https://github.com/davegallant/rfd-fyi/blob/aaf6ff89ee3abaf0c58a06c1e5c0d1ee98d31159/src/App.vue).

## What is directly useful

- `src/filterTopics.js`: extract/adapt parsing, matching, merchant normalization, and sorting into framework-independent modules. Preserve AND semantics and regex state resetting. Adapt highlighting to native text nodes rather than replacing entire title elements and their event handlers.
- `src/preferences.js`: reuse validation and merchant deduplication concepts. Change persistence from page `localStorage` to extension storage.
- `src/settingsTransfer.js`: retain support for the existing `{ version: 1, settings }` envelope. Validate nested data before importing; the current helper validates the envelope and stored-string types, not every nested record.
- `src/composables/useSeenDeals.js`: retain topic IDs and expiry behavior, replacing Vue refs and synchronous persistence. Batch writes and define cross-tab merge behavior to avoid lost history.
- `src/enrichment.js`: tag attachment and completion are already framework independent.
- `src/fetchJson.js` and `App.vue`: reuse request cancellation and staged-refresh ideas when introducing remote feeds. Do not transfer the large application component wholesale into native forum pages.
- `functions/_shared/enrichment.ts` and `tools/enricher/`: preserve vocabulary, validation, versioning, and evaluation cases if generated tags remain a supported feature.

The RES modules inspected depend on its own framework and Reddit DOM. Independently implemented patterns are the practical starting point. Direct RES code incorporation also needs a GPLv3 licensing decision; this extension currently has an MIT license. The rfd-fyi tree inspected has no top-level license file, so establish the intended license and relevant contribution rights when moving code into this MIT repository.

## Data coverage is the main parity gap

rfd-fyi refreshes three Hot Deals pages, merges them with previous topics, checks six Expired Deals pages, revisits a rotating batch of older cached entries, and retains at most 1,000 topics. This is a rolling cache, not a complete history or a fresh scan of 1,000 deals on every refresh. Its Worker runs every ten minutes. [Refresh implementation](https://github.com/davegallant/rfd-fyi/blob/aaf6ff89ee3abaf0c58a06c1e5c0d1ee98d31159/functions/_shared/topics.ts), [schedule](https://github.com/davegallant/rfd-fyi/blob/aaf6ff89ee3abaf0c58a06c1e5c0d1ee98d31159/worker/wrangler.toml).

The extension currently operates on loaded forum content. Hiding and filtering those rows is useful but does not replace searching or sorting the larger cached feed. Missing metadata should be represented as unknown, not zero or an empty category.

For full feed parity, consider an optional extension-owned Deals tab. It would share filters, seen history, and preferences with enhanced forum pages, and open native RFD threads for reading and participation. The popup stays small. A separate feed surface is justified only if broad discovery is required; it is not necessary just to clean up native browsing.

## Hosted service choices

### Optional shared service

Retain the topic cache, enrichment JSON, and classifier while moving their maintained code into this repository. The extension fetches optional service data through a restricted background interface and the appropriate host permission. Native page enhancement must continue when this service is unavailable. [Chrome network model](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests).

Keep model credentials and enrichment write credentials in the existing external process. Serve generated tags as data. The classifier currently consumes the shared topics feed, so shutting down feed collection also requires changing the classifier's input. [Enricher](https://github.com/davegallant/rfd-fyi/blob/aaf6ff89ee3abaf0c58a06c1e5c0d1ee98d31159/tools/enricher/README.md).

### No hosted services

Use native DOM data and, only after validation, bounded on-demand RFD API fetching with a local cache. Do not run the shared crawler independently in every browser. A local cache will have different coverage depending on browsing activity; it cannot promise the same continuously collected corpus. Browser extension workers are event driven and can be stopped, so they should not be treated as an always-running server. [Worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle).

Generated tags would need a replacement: user-defined categories, explicitly supported local classification, or removal of that feature. Native RFD categories can be useful but are not equivalent to the existing generated vocabulary. Static snapshots eventually become stale. Loss of no-install browsing and the `/html` no-JavaScript view must be accepted before closing the website.

## Migration of user data and URLs

Use an explicit JSON export/import flow. The extension cannot assume access to another origin's localStorage.

| Existing data | Migration |
| --- | --- |
| `theme: auto` | Map to extension `system`; retain light/dark |
| `hiddenMerchants` | Normalize names; preserve exclusions; reconcile IDs when available |
| `hideSeen` | Import toggle and seen topic IDs |
| `hideBadDeals` | Import toggle with the existing strict `< -5` threshold |
| `sortMethod` | Preserve preference where that field and dataset scope are supported |
| `rfd-seen-deals` | Validate ID/timestamp map and expire old entries |
| `?filters=...&sort=...` and legacy filter fragments | Add a separate URL importer/compatibility flow |

The current backup exports display preferences and seen history, but active search terms are represented in URLs rather than those exported storage keys. Importing a backup alone therefore cannot preserve all bookmarked searches. Existing imports replace application settings; a suite importer should preview the fields it will change and avoid resetting unrelated extension settings. [Transfer code](https://github.com/davegallant/rfd-fyi/blob/aaf6ff89ee3abaf0c58a06c1e5c0d1ee98d31159/src/settingsTransfer.js), [URL handling](https://github.com/davegallant/rfd-fyi/blob/aaf6ff89ee3abaf0c58a06c1e5c0d1ee98d31159/src/App.vue).

## Suggested delivery sequence

1. **Independent cleanup and shared data:** separate appearance from filters/cleanup, normalize both native list layouts into one model, and retain reversible DOM changes.
2. **Local browsing parity:** merchant exclusions, temporary keyword/regex search, score filtering, seen/unseen tracking, and rfd-fyi backup import. Match documented semantics before adding richer RES-style rules.
3. **Discovery parity decision:** either add the optional Deals tab over the shared cache, or explicitly accept page-local/local-cache coverage. Integrate tags only after deciding their future source.
4. **Consolidation:** move retained service/enricher code and relevant tests into the extension repository, transfer deployment ownership, and stop new feature development in rfd-fyi.
5. **Deprecation:** ship an install-and-export notice on the old site, preserve data export and bookmarked-filter migration through a transition period, then archive the repository. Keep a small migration page or redirect where appropriate.
6. **Optional infrastructure retirement:** shut down Worker, KV, endpoints, and classifier only after every dependency has moved or its loss has been accepted.

Release acceptance should cover both classic/card lists, independent appearance/filter toggles, restoration of hidden content, saved-history preservation, invalid imports, stale/missing enrichment, unknown metadata, and the claimed filter/sort dataset scope. Browser/platform access and actual use of the no-JavaScript view remain to be assessed. No deployment, repository archival, or runtime migration has been performed.
