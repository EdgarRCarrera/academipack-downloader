# Console Script

This is the advanced method. Review the readable source before pasting anything into DevTools.

## Self-XSS warning

Chrome may require `allow pasting` before pasting into the console. Treat that warning as a self-XSS safeguard, not as a routine step. Never paste code that you have not personally reviewed from the readable source in this repository.

The script runs inside your current LMS session. Do not use modified copies from third parties.

## Review-first workflow

1. Read [script.js](./script.js)
2. Open your LMS course page
3. Open DevTools and go to the Console tab
4. Paste only the code you have reviewed yourself
5. Review the redacted preview, progress notes and explicit authorization prompt before continuing

## What it enforces

- Same-origin requests only
- Visible `a[href]` links only
- No raw HTML regex extraction
- `credentials: "same-origin"` and restrictive `referrerPolicy`
- One download attempt at a time
- Minimum delay of 3000 ms
- Maximum of 100 files per run
- Immediate stop on 401, 403 or 429

## What it does not do

- It does not guess URLs or enumerate identifiers
- It does not use cookies, local storage or session storage
- It does not transmit data to external services
- It does not continue after access-denied responses

## Maintainer note

`script.js` is generated with `npm run build`.
