# Console Script

The console script is more powerful than the bookmarklet - it resolves intermediate redirect pages before downloading, which avoids browser pop-up blocking entirely.

## When to use this instead of the bookmarklet

- The bookmarklet downloaded fewer files than expected
- Browser keeps blocking pop-ups even after allowing them
- Your LMS uses redirect pages before serving files (e.g. Moodle's `view.php`)
- You want real-time progress feedback in the console

## Usage

1. Log in to your LMS and navigate to the **course main page**
2. Open DevTools: `F12` (or `Cmd+Option+I` on Mac) -> click the **Console** tab
3. Type `allow pasting` and press **Enter** (Chrome security prompt - one time only)
4. Paste the contents of `script.js` and press **Enter**
5. Confirm the download in the popup
6. Watch the progress in the console - each file shows success or error output

## Configuration

Edit the `CONFIG` block at the top of `script.js`:

```javascript
const CONFIG = {
  delay: 3000,              // ms between downloads - increase if files are cut off
  includePatterns: [...],   // URL fragments that signal a downloadable resource
  excludePatterns: [...],   // activity types to skip
  extensions: /\.(pdf...)/, // file extensions to match
  activitySelectors: [...]  // CSS selectors for your LMS layout (see examples/)
};
```

## Files

- `script.js` - full configurable script with comments

There is no separate minified console script. Paste `script.js` directly into the browser console.

## Platform examples

See the [`../examples/`](../examples/) folder for pre-configured versions for Moodle, Canvas, and Blackboard.
