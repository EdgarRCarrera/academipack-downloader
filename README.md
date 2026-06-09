# AcademiPack Downloader

AcademiPack Downloader is a platform-agnostic browser utility that helps users download documents visibly linked on supported LMS course pages and already available to their own authorized account.

Platform-agnostic means that the project can be adapted to different LMS page structures. It does not mean unrestricted access to every LMS or every resource.

The tool automates a repetitive action that the user can already perform manually. It does not grant new permissions.

The tool does not bypass authentication, authorization, paywalls, DRM or other access controls. It must not be used with another person's account or session, to discover hidden resources, or to access content the user is not authorized to download.

Downloading a document does not automatically grant permission to redistribute, publish, sell or share it.

Compatibility depends on the LMS version, the institution's configuration and the structure of the course page. Compatibility is not guaranteed.

The project has no backend, telemetry or credential collection. It does not intentionally read or transmit passwords, cookies or session tokens. Network requests are restricted to the current LMS origin.

## What the project does

- Works only with documents visibly linked on the current page
- Restricts requests to the same origin as the current LMS page
- Uses the user's own active session without credential prompts
- Stops on authentication failures, access denials and rate limiting
- Runs one download attempt at a time with a minimum safe delay

## What the project does not do

- It does not bypass authentication, authorization, paywalls, DRM or institutional controls
- It does not discover hidden resources, guess endpoints or enumerate identifiers
- It does not read cookies, tokens or browser storage
- It does not send data to external services
- It is not designed for exams, grades, assignments, forums or personal data

## Quick start

### Bookmarklet

Recommended for most users.

1. Review the readable source in [bookmarklet/bookmarklet.js](./bookmarklet/bookmarklet.js).
2. Use the generated bookmarklet in [bookmarklet/bookmarklet.min.js](./bookmarklet/bookmarklet.min.js).
3. Create a browser bookmark and paste the minified `javascript:` URL as the bookmark target.

See [bookmarklet/README.md](./bookmarklet/README.md) for the full workflow.

### Console Script (Advanced)

Advanced users can review and run [console-script/script.js](./console-script/script.js).

Chrome may require `allow pasting` before manual console input. Treat that warning as a self-XSS safeguard, not as a routine step. Never paste code you have not reviewed yourself. The code runs inside your current LMS session, so only use the readable source published in this repository and avoid modified third-party copies.

See [console-script/README.md](./console-script/README.md) for the full workflow.

## Authorized and Responsible Use

- Use only your own account and session
- Use only a session obtained legitimately through the LMS interface
- Download only visible resources that you are authorized to access and copy
- Do not share accounts, sessions, cookies or tokens
- Do not use third-party credentials, cookies or sessions
- Do not bypass authentication, authorization, paywalls, DRM or technical protection measures
- Do not try to discover hidden resources, guess endpoints or enumerate identifiers
- Do not continue using the tool after access has been revoked
- Do not use it to obtain restricted exams or answer keys
- Do not use it to extract grades, student submissions, forums or personal data
- Do not make excessive or disruptive requests
- Do not redistribute course materials without permission
- Respect copyright, contracts and institutional rules
- Stop immediately if the LMS returns access-denied or rate-limit responses
- Remember that the tool automates a task you can already perform manually; it does not grant new permissions

See [LEGAL_AND_RESPONSIBLE_USE.md](./LEGAL_AND_RESPONSIBLE_USE.md) for more detail.

## Privacy and security design

- Same-origin only: the tool rejects external URLs and external redirects
- Limited scope: it only accepts visible `a[href]` elements inside allowed activity containers
- Intermediate pages are only resolved when they are same-origin HTML pages linked from visible LMS content
- No raw HTML scraping by regex
- No `document.cookie`, `localStorage`, `sessionStorage`, `indexedDB`, `navigator.credentials`, `sendBeacon` or `WebSocket`
- No backend, telemetry or analytics
- URL previews and logs redact query strings, fragments and signed parameters

## Repository layout

- [bookmarklet/](./bookmarklet/) - bookmarklet source and generated minified artifact
- [console-script/](./console-script/) - advanced console script
- [examples/](./examples/) - example selector and pattern notes for supported LMS layouts

## Development

```bash
npm install
npm run build
npm run lint
npm test
npm run check:bookmarklet
npm run secret-scan
```

## Security and contribution

- Read [SECURITY.md](./SECURITY.md) before reporting vulnerabilities
- Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request

## No affiliation

AcademiPack Downloader is an independent community project. It is not affiliated with, endorsed by, sponsored by or officially supported by Moodle, Instructure Canvas, Anthology Blackboard, any university or any LMS provider. Product names and trademarks belong to their respective owners.

## License

MIT License. See [LICENSE](./LICENSE).
