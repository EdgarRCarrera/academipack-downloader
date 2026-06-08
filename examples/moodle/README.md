# Moodle Example

Configuration for standard and custom Moodle installations.

## Tested versions

- Moodle 3.9+
- Moodle 4.x (Boost theme)
- Custom themes (e.g. IRIS at Universite Toulouse Jean Jaures)

## activitySelectors for Moodle

```javascript
activitySelectors: [
  '.activityname',          // Moodle 4.x Boost
  '.instancename',          // Moodle 3.x legacy
  'li.activity',            // All versions
  '[data-type="resource"]', // Some custom themes
]
```

## includePatterns for Moodle

```javascript
includePatterns: [
  'pluginfile.php',            // Direct file downloads
  'mod/resource/view.php',     // Resource redirect pages
  'webservice/pluginfile.php', // Webservice variant
]
```

## excludePatterns for Moodle

```javascript
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
  '/mod/url/',   // External URL links
  '/mod/label/', // Text labels
  '/mod/page/',  // HTML pages (not files)
]
```

## Notes

- Some Moodle instances collapse sections by default - expand all sections before running the script
- If files are behind a `/mod/resource/view.php` redirect, use the **console script** (not the bookmarklet) for best results
- The `forcedownload=1` parameter works on all standard Moodle installations
