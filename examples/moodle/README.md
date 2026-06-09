# Moodle Example

These selectors and URL patterns are examples for Moodle-style pages. They do not bypass access controls and they do not guarantee compatibility with every institution.

## Typical selectors

```javascript
activitySelectors: [
  ".activityname",
  ".instancename",
  "li.activity",
  "[data-type=\"resource\"]"
]
```

## Typical include patterns

```javascript
includePatterns: [
  "pluginfile.php",
  "mod/resource/view.php",
  "webservice/pluginfile.php"
]
```

## Typical exclusions

```javascript
excludePatterns: [
  "/mod/quiz/",
  "/mod/forum/",
  "/mod/assign/",
  "/mod/chat/",
  "/mod/choice/",
  "/mod/feedback/",
  "/mod/workshop/",
  "/mod/scorm/",
  "/mod/lti/",
  "/mod/url/",
  "/mod/label/",
  "/mod/page/"
]
```

Only use these examples on systems where you are explicitly authorized to test and download visible course files.
