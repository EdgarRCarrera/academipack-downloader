# Third-Party Notices

## Source provenance note

The repository history currently starts with a single import-style commit. Because of that, the original provenance of the pre-existing project source cannot be independently verified from Git history alone.

No separate upstream repository, import manifest or preserved prior attribution metadata was found during this audit.

## Vendored runtime code

No third-party runtime source code is intentionally vendored into the repository as part of the audited downloader implementation.

## Development tooling

The repository uses third-party development dependencies declared in `package.json` and locked in `package-lock.json` for build and test tasks:

- `jsdom`
- `terser`

Those dependencies remain subject to their own licenses and notices.
