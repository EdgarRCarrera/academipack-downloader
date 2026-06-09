# Contributing

Thank you for helping improve AcademiPack Downloader safely.

## Before you contribute

- Read [SECURITY.md](./SECURITY.md)
- Read [LEGAL_AND_RESPONSIBLE_USE.md](./LEGAL_AND_RESPONSIBLE_USE.md)
- Test only on systems you own, local fixtures, demo environments or systems where you have express authorization

## Safe testing rules

- Prefer synthetic HTML fixtures over real LMS pages
- Use your own local, demo or expressly authorized environments when you need interactive testing
- Never attach real course HTML to an issue or pull request
- Never publish student data, teacher data, grades, assignments, forum data or other personal information
- Never publish real cookies, session tokens or browser-profile exports
- Redact domains, query strings, tokens, course IDs and names before sharing examples
- Report vulnerabilities privately through [SECURITY.md](./SECURITY.md)

## Changes we welcome

- Better compatibility with additional LMS page structures
- Accessibility improvements
- Safer document detection for visible resources
- Privacy or security hardening
- Reductions in false positives
- UI and preview improvements
- Documentation and translation updates
- Tests built on synthetic fixtures

## Changes we do not accept

- Authentication or authorization bypass
- Credential access, cookie access or browser-storage access
- CAPTCHA bypass
- Paywall or DRM bypass
- Rate-limit bypass or aggressive retry logic
- Endpoint guessing or identifier enumeration
- Hidden-resource discovery
- Session reuse from third parties
- Scraping of exams, grades, assignments, forums or personal data
- Testing against real systems without authorization

## Development workflow

1. Create a branch for your work
2. Run `npm install`
3. Run `npm run build`
4. Run `npm run lint`
5. Run `npm test`
6. Run `npm run check:bookmarklet`
7. Run `npm run secret-scan`
8. Update documentation if behavior changes

## Reporting vulnerabilities

Do not open public issues for sensitive security problems. Follow the private reporting process in [SECURITY.md](./SECURITY.md).
