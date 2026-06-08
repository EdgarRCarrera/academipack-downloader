# Blackboard Example

Configuration for Blackboard Learn (Original and Ultra experience).

> **Beta** - Blackboard's two interfaces (Original and Ultra) have very different DOM structures. See sections below for each.

## Blackboard Original

### Where to run

Navigate to a **Content Area** page (e.g. Course Documents, Course Materials).

### activitySelectors

```javascript
activitySelectors: [
  '.contentListItem', // Original content list items
  'li.liItem',
  '.item',
]
```

### includePatterns

```javascript
includePatterns: [
  '/bbcswebdav/', // Blackboard file storage
  '/xid-',        // Blackboard file IDs
  '/content/file',
]
```

---

## Blackboard Ultra

### Where to run

Navigate to the **Course Content** page.

### activitySelectors

```javascript
activitySelectors: [
  '[data-type="document"]',
  '.cl-file',
  'bb-content-file',
]
```

### includePatterns

```javascript
includePatterns: [
  '/ultra/file',
  '/learn/api/public/v1/contents/',
  '/bbcswebdav/',
]
```

### excludePatterns (both versions)

```javascript
excludePatterns: [
  '/assessment/',
  '/discussion/',
  '/assignment/',
  '/blog/',
  '/wiki/',
]
```

## Notes

- Blackboard often requires you to be on a specific content folder page - there is no single "all files" view like Moodle's course page
- Consider running the script once per content folder or section
