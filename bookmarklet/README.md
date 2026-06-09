# Bookmarklet

The bookmarklet is the simpler user-facing method, but you should still review the readable source before using it.

## Canonical review flow

1. Review [bookmarklet.js](./bookmarklet.js), the readable bookmarklet source.
2. Use [bookmarklet.min.js](./bookmarklet.min.js), the generated `javascript:` bookmark payload.
3. Do not use modified copies from untrusted third parties.

## Installation

1. Copy the full contents of `bookmarklet.min.js`
2. Create a new browser bookmark
3. Name it `AcademiPack Downloader`
4. Paste the `javascript:` string as the bookmark URL

## Usage

1. Log in to your LMS with your own account
2. Navigate to a course page that visibly lists file links
3. Click the bookmarklet
4. Review the redacted preview, document count and progress notes
5. Confirm only if you are authorized to access and copy those files

## Safety limits

- Same-origin only
- Visible links only
- One download attempt at a time
- Minimum delay of 3000 ms between attempts
- Maximum of 100 files per run
- Stops on access denied, authentication required or rate limiting

## Limitations

- The bookmarklet does not inspect hidden resources
- It does not follow external redirects
- It does not use cookies, tokens or browser storage directly
- It does not guarantee compatibility with every LMS configuration

## For maintainers

`bookmarklet.min.js` must be generated with `npm run build` and checked with `npm run check:bookmarklet`.
