# Canvas Example

These selectors and URL patterns are examples for Canvas-style module pages. Compatibility depends on the institution's configuration and the visible DOM on the current page.

## Typical page

```
https://[your-canvas-domain]/courses/[course-id]/modules
```

## Typical selectors

```javascript
activitySelectors: [
  ".ig-title",
  ".module-item-title",
  "li.context_module_item"
]
```

## Typical include patterns

```javascript
includePatterns: [
  "/files/",
  "download?download_frd=1",
  "/courses/"
]
```

## Typical exclusions

```javascript
excludePatterns: [
  "/assignments/",
  "/quizzes/",
  "/discussion_topics/",
  "/pages/",
  "/external_tools/",
  "/modules/items/"
]
```

Use only your own authorized session. Do not treat these examples as a guarantee that every Canvas deployment is supported.
