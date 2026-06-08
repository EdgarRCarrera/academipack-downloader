# 📥 AcademiPack Downloader

A lightweight, open-source toolkit to **batch download all course files** from any Learning Management System (Moodle, Canvas, Blackboard, and more) — directly from your browser, using your active session.

No installation required. No external servers. Your credentials never leave your browser.

---

## ✨ Features

- 📎 Downloads PDFs, Word, PowerPoint, Excel, and other documents in one click
- 🔒 Works with your existing browser session — no login automation needed
- ⏱️ Configurable delay between downloads to avoid server throttling
- 🚫 Filters out non-file activities (quizzes, forums, assignments)
- 🌐 Adaptable to any LMS platform
- 🆓 100% free and open source (MIT License)

---

## 🚀 Quick Start

There are **two methods** depending on your technical comfort level:

| Method | Best for | Setup time |
|--------|----------|------------|
| [Bookmarklet](./bookmarklet/) | Anyone, no coding needed | 30 seconds |
| [Console Script](./console-script/) | Advanced users, more reliable | 2 minutes |

---

## 📚 Method 1 — Bookmarklet (No-code)

A bookmarklet is a browser bookmark that runs JavaScript when clicked.

### Installation

1. Copy the code below
2. Create a new bookmark in your browser (Ctrl+D)
3. Edit the bookmark → paste the code as the URL
4. Name it something like `📥 AcademiPack Downloader`

### Generic Bookmarklet

```
javascript:(function(){const D=3000;const EXT=/\.(pdf|docx?|pptx?|xlsx?|odt|ods|odp)(\?|$)/i;const PAT=['pluginfile.php','mod/resource/view.php','download','files'];const links=[...new Set([...document.querySelectorAll('a[href]')].filter(a=>{const h=a.href;return(PAT.some(p=>h.includes(p))||EXT.test(h))&&!h.includes('/quiz/')&&!h.includes('/forum/')&&!h.includes('/assign/');}).map(a=>a.href))];if(!links.length){alert('No downloadable files found on this page.');return;}if(!confirm('Download '+links.length+' file(s)?'))return;links.forEach((href,i)=>setTimeout(()=>{const a=document.createElement('a');a.href=href;a.target='_blank';document.body.appendChild(a);a.click();document.body.removeChild(a);},i*D));})();
```

### Usage

1. Log in to your LMS and navigate to a course page
2. Click the bookmarklet
3. Confirm the download in the popup
4. Allow pop-ups if prompted by your browser (one-time setup)

> ⚠️ Make sure you are on the **course main page** (the one listing all activities), not inside an individual file or activity.

---

## 🛠️ Method 2 — Console Script (Advanced)

This method uses `fetch()` to silently resolve intermediate redirect pages before downloading — more reliable, no pop-up issues.

### Usage

1. Navigate to the course main page
2. Open DevTools → Console (`F12` → Console tab)
3. Type `allow pasting` and press Enter (one-time Chrome security prompt)
4. Paste the script and press Enter

### Generic Console Script

```javascript
(async function(){
  // ─── CONFIGURATION ───────────────────────────────────────────────
  const CONFIG = {
    delay: 3000,           // milliseconds between downloads
    base: window.location.origin,
    // URL patterns that indicate a downloadable resource
    includePatterns: ['pluginfile.php', 'mod/resource/view.php', '/files/'],
    // URL patterns to exclude (non-file activities)
    excludePatterns: ['/quiz/', '/forum/', '/assign/', '/chat/', '/choice/'],
    // File extensions to match as fallback
    extensions: /\.(pdf|docx?|pptx?|xlsx?|odt|ods|odp|zip|csv|txt)(\?|$)/i,
    // CSS selectors for activity containers (customize per platform)
    activitySelectors: [
      '.activityname',       // Moodle
      '.instancename',       // Moodle legacy
      'li.activity',         // Moodle
      '.ig-title',           // Canvas
      '.course-content li',  // Generic
    ]
  };
  // ─────────────────────────────────────────────────────────────────

  const activitySelector = CONFIG.activitySelectors.join(',');

  const links = [...new Set(
    [...document.querySelectorAll('a[href]')]
      .filter(a => {
        const h = a.href;
        const inActivity = a.closest(activitySelector);
        const included = CONFIG.includePatterns.some(p => h.includes(p)) || CONFIG.extensions.test(h);
        const excluded = CONFIG.excludePatterns.some(p => h.includes(p));
        return included && !excluded;
      })
      .map(a => a.href)
  )];

  if (!links.length) {
    alert('No downloadable files found. Check the activitySelectors in CONFIG.');
    return;
  }

  if (!confirm(`Found ${links.length} file(s). Start downloading with ${CONFIG.delay/1000}s delay?`)) return;

  console.log(`🚀 Starting download of ${links.length} files...`);

  for (let i = 0; i < links.length; i++) {
    const href = links[i];
    console.log(`⏳ (${i+1}/${links.length}) Processing: ${href}`);

    try {
      let finalUrl = href;

      // Resolve intermediate redirect pages (e.g. Moodle's view.php)
      if (!CONFIG.extensions.test(href) && !href.includes('forcedownload')) {
        const res = await fetch(href, { credentials: 'include' });
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        const fileLink = [...doc.querySelectorAll('a[href]')]
          .find(a => CONFIG.extensions.test(a.href) || a.href.includes('pluginfile.php'));

        if (fileLink) {
          finalUrl = fileLink.href;
        } else {
          const match = html.match(new RegExp(
            CONFIG.base.replace('.', '\\.') + '/[^"\'&\\s]+(' +
            CONFIG.extensions.source + ')', 'i'
          ));
          if (match) finalUrl = match[0];
        }
      }

      // Force download instead of opening in browser
      if (!finalUrl.includes('forcedownload')) {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'forcedownload=1';
      }

      const a = document.createElement('a');
      a.href = finalUrl;
      a.download = '';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      console.log(`✅ (${i+1}/${links.length}) Downloaded`);

    } catch(e) {
      console.log(`❌ (${i+1}/${links.length}) Error: ${e.message}`);
    }

    if (i < links.length - 1) {
      await new Promise(r => setTimeout(r, CONFIG.delay));
    }
  }

  console.log('🎉 All done!');
  alert(`Download complete. Check the console for details.`);
})();
```

---

## 🌐 Platform-Specific Examples

Tested configurations for common LMS platforms:

| Platform | Example | Notes |
|----------|---------|-------|
| [Moodle](./examples/moodle/) | Standard + custom themes | Most tested |
| [Canvas](./examples/canvas/) | Instructure Canvas | Beta |
| [Blackboard](./examples/blackboard/) | Ultra + Original | Beta |

---

## ⚙️ Customization

The console script has a `CONFIG` block at the top you can edit:

```javascript
const CONFIG = {
  delay: 3000,           // increase if downloads get cut off
  includePatterns: [...], // URL fragments that signal a file
  excludePatterns: [...], // activity types to skip
  activitySelectors: [...] // CSS selectors for your LMS layout
};
```

---

## ⚠️ Responsible Use

- Only download files **you are authorized to access**
- Do not use this to bypass paywalls or access restricted content
- Check your institution's terms of service
- This tool does not bypass authentication — it uses your existing session

---

## 🤝 Contributing

Found a bug or want to add support for a new platform? See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## 📄 License

MIT License — free to use, modify, and distribute. See [LICENSE](./LICENSE).
