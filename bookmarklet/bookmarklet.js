// -----------------------------------------------------------------------------
// AcademiPack Downloader - Bookmarklet (readable source)
// https://github.com/your-username/academipack-downloader
// -----------------------------------------------------------------------------
// To use: copy the minified version from bookmarklet.min.js and paste it
// as the URL of a browser bookmark.
// -----------------------------------------------------------------------------

(function () {
  // --- Configuration ---------------------------------------------------------
  const DELAY_MS = 3000; // pause between downloads in milliseconds

  // URL fragments that indicate a downloadable resource
  const INCLUDE_PATTERNS = [
    'pluginfile.php',
    'mod/resource/view.php',
    '/files/',
    '/download',
  ];

  // URL fragments to skip (non-file activities)
  const EXCLUDE_PATTERNS = [
    '/mod/quiz/',
    '/mod/forum/',
    '/mod/assign/',
    '/mod/chat/',
    '/mod/choice/',
    '/mod/feedback/',
  ];

  // File extensions to match as a fallback
  const EXT = /\.(pdf|docx?|pptx?|xlsx?|odt|ods|odp|zip|csv|txt)(\?|$)/i;

  // CSS selectors for activity/file link containers (covers major LMS themes)
  const ACTIVITY_SELECTORS = [
    '.activityname',      // Moodle (Boost theme)
    '.instancename',      // Moodle (legacy themes)
    'li.activity',        // Moodle generic
    '.ig-title',          // Canvas
    '.course-content li', // Generic fallback
  ].join(',');
  // ---------------------------------------------------------------------------

  const allLinks = [...document.querySelectorAll('a[href]')];

  const fileLinks = allLinks.filter(a => {
    const h = a.href;
    const inActivity = a.closest(ACTIVITY_SELECTORS);
    const included = INCLUDE_PATTERNS.some(p => h.includes(p)) || EXT.test(h);
    const excluded = EXCLUDE_PATTERNS.some(p => h.includes(p));
    return inActivity && included && !excluded;
  });

  // Remove duplicates
  const unique = [...new Map(fileLinks.map(a => [a.href, a])).values()];

  if (unique.length === 0) {
    alert('No downloadable files found on this page.\n\nMake sure you are on the course main page, not inside an individual activity.');
    return;
  }

  const confirmed = confirm(
    `Found ${unique.length} file(s).\n\nDownload all with a ${DELAY_MS / 1000}s delay between each?`
  );
  if (!confirmed) return;

  unique.forEach((link, i) => {
    setTimeout(() => {
      const a = document.createElement('a');
      a.href = link.href;
      a.target = '_blank';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, i * DELAY_MS);
  });
})();
