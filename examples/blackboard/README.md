# Blackboard Example

These selectors and URL patterns are examples for Blackboard layouts. They are intentionally limited to visible same-origin links and do not attempt to discover hidden resources.

## Original experience

```javascript
activitySelectors: [
  ".contentListItem",
  "li.liItem",
  ".item"
]
```

## Ultra experience

```javascript
activitySelectors: [
  "[data-type=\"document\"]",
  ".cl-file",
  "bb-content-file"
]
```

## Typical include patterns

```javascript
includePatterns: [
  "/bbcswebdav/",
  "/xid-",
  "/content/file",
  "/ultra/file",
  "/learn/api/public/v1/contents/"
]
```

## Typical exclusions

```javascript
excludePatterns: [
  "/assessment/",
  "/discussion/",
  "/assignment/",
  "/blog/",
  "/wiki/"
]
```

Use only on systems where you have express authorization to test and download visible course files.
