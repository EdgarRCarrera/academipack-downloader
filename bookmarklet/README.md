# Bookmarklet

The bookmarklet is the simplest method - no coding required.

## How it works

A bookmarklet is a regular browser bookmark where the URL is JavaScript code. When you click it, it runs on the current page using your active session.

## Installation (30 seconds)

1. **Copy** the bookmarklet code from `bookmarklet.min.js`
2. **Create a new bookmark** in your browser toolbar (right-click toolbar -> Add page, or Ctrl+D)
3. **Edit the bookmark:**
   - Name: `AcademiPack Downloader` (or anything you like)
   - URL: paste the entire contents of `bookmarklet.min.js`
4. **Save**

## Usage

1. Log in to your LMS
2. Navigate to a **course main page** (the page listing all activities)
3. **Click the bookmarklet** in your toolbar
4. A popup will show how many files were found - confirm to start
5. If Chrome blocks pop-ups, click **"Always allow pop-ups from [domain]"** - this is a one-time step

## Files

- `bookmarklet.js` - human-readable source code
- `bookmarklet.min.js` - minified version ready to paste as bookmark URL

## Customization

Edit `bookmarklet.js` to adjust:

```javascript
const DELAY_MS = 3000; // milliseconds between downloads - increase if downloads are cut off
```

To add file types, edit the `EXT` regex:

```javascript
const EXT = /\.(pdf|docx?|pptx?|xlsx?|odt|ods|odp)(\?|$)/i;
//                                                  ^ add new extensions here
```

## Limitations

- Requires pop-ups to be allowed for the LMS domain
- Cannot resolve intermediate redirect pages (use the Console Script for that)
- Only sees files visible in the current DOM - scroll down or expand collapsed sections first
