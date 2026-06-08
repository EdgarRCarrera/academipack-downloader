// -----------------------------------------------------------------------------
// AcademiPack Downloader - Console Script
// https://github.com/your-username/academipack-downloader
//
// HOW TO USE:
//   1. Go to your LMS course main page (the one listing all activities)
//   2. Open DevTools Console (F12 -> Console)
//   3. Type: allow pasting -> press Enter
//   4. Paste this entire script -> press Enter
// -----------------------------------------------------------------------------

(async function () {

  // --- CONFIGURATION ---------------------------------------------------------
  // Edit this block to adapt the script to your platform.
  const CONFIG = {

    // Milliseconds to wait between each download.
    // Increase if files are getting cut off or the server throttles you.
    delay: 3000,

    // The base URL of your LMS (auto-detected, usually no need to change)
    base: window.location.origin,

    // URL fragments that indicate a downloadable resource.
    // Add your LMS's file URL pattern here if it's not already listed.
    includePatterns: [
      'pluginfile.php',          // Moodle direct file URL
      'mod/resource/view.php',   // Moodle resource page
      '/files/',                 // Canvas, generic
      '/bbcswebdav/',            // Blackboard
      '/download',               // Generic
    ],

    // URL fragments to exclude - these are activities, not files.
    // Add more if your LMS has other non-file activity types.
    excludePatterns: [
      '/mod/quiz/',
      '/mod/forum/',
      '/mod/assign/',
      '/mod/chat/',
      '/mod/choice/',
      '/mod/feedback/',
      '/mod/workshop/',
      '/mod/scorm/',
      '/mod/lti/',
    ],

    // File extensions to match as a fallback (when URL patterns don't apply).
    extensions: /\.(pdf|docx?|pptx?|xlsx?|odt|ods|odp|zip|csv|txt|mp4|mp3)(\?|$)/i,

    // CSS selectors for activity/resource containers.
    // These tell the script where to look for file links on the page.
    // See examples/ folder for platform-specific selectors.
    activitySelectors: [
      '.activityname',         // Moodle Boost theme
      '.instancename',         // Moodle legacy themes
      'li.activity',           // Moodle generic
      '.ig-title',             // Canvas
      '.course-content li',    // Generic fallback
      '[data-type="resource"]' // Some custom themes
    ],
  };
  // ---------------------------------------------------------------------------

  const activitySelector = CONFIG.activitySelectors.join(',');

  // Collect all matching file links on the page
  const links = [...new Set(
    [...document.querySelectorAll('a[href]')]
      .filter(a => {
        const h = a.href;
        const included = CONFIG.includePatterns.some(p => h.includes(p)) || CONFIG.extensions.test(h);
        const excluded = CONFIG.excludePatterns.some(p => h.includes(p));
        return included && !excluded;
      })
      .map(a => a.href)
  )];

  if (!links.length) {
    alert(
      'No downloadable files found.\n\n' +
      'Possible reasons:\n' +
      '- You are not on the course main page\n' +
      '- The activitySelectors in CONFIG do not match your LMS layout\n' +
      '- All sections are collapsed - try expanding them first'
    );
    return;
  }

  if (!confirm(
    `Found ${links.length} file(s).\n\n` +
    `Download all with a ${CONFIG.delay / 1000}s delay between each?\n\n` +
    `Estimated time: ~${Math.ceil(links.length * CONFIG.delay / 60000)} minute(s)`
  )) return;

  console.log(`Starting download of ${links.length} files from ${window.location.href}`);
  console.log(`Delay: ${CONFIG.delay}ms between downloads`);
  console.log('-'.repeat(60));

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < links.length; i++) {
    const href = links[i];
    console.log(`(${i + 1}/${links.length}) Processing: ${href}`);

    try {
      let finalUrl = href;

      // If the URL is an intermediate page (not a direct file link),
      // fetch it silently and extract the real file URL from the response HTML.
      const isDirectFile = CONFIG.extensions.test(href) || href.includes('forcedownload');
      if (!isDirectFile) {
        const res = await fetch(href, { credentials: 'include' });
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        // Strategy 1: find a direct file link in the response page
        const fileLink = [...doc.querySelectorAll('a[href]')]
          .find(a =>
            CONFIG.extensions.test(a.href) ||
            CONFIG.includePatterns.some(p => a.href.includes(p))
          );

        if (fileLink) {
          finalUrl = fileLink.href;
        } else {
          // Strategy 2: regex search for a file URL in the raw HTML
          const escapedBase = CONFIG.base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const match = html.match(
            new RegExp(escapedBase + '\\/[^"\'&\\s]+' + CONFIG.extensions.source, 'i')
          );
          if (match) finalUrl = match[0];
        }
      }

      // Append forcedownload=1 to trigger browser download instead of opening
      if (!finalUrl.includes('forcedownload')) {
        finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'forcedownload=1';
      }

      // Trigger the download
      const a = document.createElement('a');
      a.href = finalUrl;
      a.download = '';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      successCount++;
      console.log(`(${i + 1}/${links.length}) Done`);

    } catch (e) {
      errorCount++;
      console.log(`(${i + 1}/${links.length}) Error: ${e.message}`);
    }

    // Wait before next download (skip delay after last file)
    if (i < links.length - 1) {
      await new Promise(r => setTimeout(r, CONFIG.delay));
    }
  }

  console.log('-'.repeat(60));
  console.log(`Finished! ${successCount} downloaded, ${errorCount} errors.`);
  alert(`Download complete!\n\nOK: ${successCount} file(s) downloaded\nErrors: ${errorCount}\n\nCheck the console for details.`);

})();
