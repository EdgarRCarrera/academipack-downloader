# Canvas (Instructure) Example

Configuration for Canvas LMS by Instructure.

> **Beta** - Canvas uses a React-rendered interface that loads content dynamically. The script may not detect all files if the page has not fully loaded. Scroll to the bottom of the Modules page before running.

## Where to run the script

Navigate to your course's **Modules** page:

```
https://[your-canvas-domain]/courses/[course-id]/modules
```

## activitySelectors for Canvas

```javascript
activitySelectors: [
  '.ig-title',              // Module item title
  '.module-item-title',     // Alternative selector
  'li.context_module_item', // Module item container
]
```

## includePatterns for Canvas

```javascript
includePatterns: [
  '/files/',                 // Canvas file URLs
  'download?download_frd=1', // Canvas force download
  '/courses/',               // Course file links
]
```

## excludePatterns for Canvas

```javascript
excludePatterns: [
  '/assignments/',
  '/quizzes/',
  '/discussion_topics/',
  '/pages/',
  '/external_tools/',
  '/modules/items/', // Module item pages (not files)
]
```

## Canvas-specific tip

Canvas file links often look like:

```
https://[domain]/courses/[id]/files/[file-id]/download?download_frd=1
```

If the script detects 0 files, try adding `'download?download_frd'` to `includePatterns`.
