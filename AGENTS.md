# Release process

- Use the existing `vX.Y.Z` tag format for every release.
- Give each GitHub Release the exact matching title `vX.Y.Z`; do not add the product name or other text to the title.
- A version tag is not a published release. For every release tag, create and publish a GitHub Release with notes from that version's `CHANGELOG.md` section.
- After publishing, verify the release appears in `gh release list`, has the matching tag and title, and is marked latest when it is the newest release.
