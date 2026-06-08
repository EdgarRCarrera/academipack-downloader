# Contributing

Thank you for helping make this tool better for everyone!

## Ways to contribute

### 🐛 Report a bug
Open an issue with:
- Your LMS platform and version
- What happened vs. what you expected
- The URL pattern of files that weren't detected (you can redact the domain)

### 🌐 Add a new platform
If you've tested the script on a platform not listed in `examples/`, please share your working `CONFIG` block. Even a comment in an issue is helpful.

### 💡 Suggest an improvement
Open an issue describing the feature and your use case.

### 🔧 Submit a pull request

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Test on at least one real LMS page
5. Update the relevant README if needed
6. Open a pull request with a clear description

## Code style

- Plain JavaScript only — no dependencies, no build step
- Keep the `CONFIG` block at the top of scripts so users can edit it easily
- Add a comment for every non-obvious line
- Test that the minified bookmarklet still fits in a browser bookmark URL field (~2000 chars max for some browsers)

## Adding a new platform example

1. Create a folder: `examples/your-platform/`
2. Add a `README.md` with:
   - Tested versions
   - Where to navigate before running the script
   - `activitySelectors` for that platform
   - `includePatterns` and `excludePatterns`
   - Any platform-specific notes or workarounds

## Questions?

Open an issue — no question is too basic.
