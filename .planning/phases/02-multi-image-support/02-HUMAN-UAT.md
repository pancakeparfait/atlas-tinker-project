---
status: complete
phase: 02-multi-image-support
source: [02-VERIFICATION.md]
started: 2026-05-13
updated: 2026-05-20
---

## Current Test

[testing complete]

## Tests

### 1. Upload multiple files via drag-drop
expected: Navigate to `/recipes/[id]/edit`, drag 2–4 image files (mixed valid + an oversized or wrong-MIME file) onto the upload zone. Valid files upload; rejected files show the inline error rows ("Photo must be under 10MB" or "Only JPEG, PNG, WebP, and GIF are supported"). The thumbnail strip below repopulates with the uploaded images. (Note CR-03 — currently all uploaded rows show "done" even if the server rejected them mid-batch.)
result: pass

### 2. Empty state on detail page
expected: Navigate to a recipe with no images. The gallery renders "No photos yet" heading with the body copy "Add photos to help others follow along with ingredients, process, and the finished dish." and an ImageOff icon.
result: pass

### 3. Hero swap on thumbnail click
expected: Open a recipe with multiple images. The hero shows the order=0 image with "Primary" badge on its thumbnail. Click another thumbnail — hero swaps without a page reload; the active thumbnail picks up the `ring-2 ring-primary` outline.
result: issue
reported: "on the detail page, when clicking another image, primary stays the same, though the displayed hero changes"
severity: minor

### 4. Drag-to-reorder on edit page
expected: On `/recipes/[id]/edit` with 3+ images, drag a thumbnail to a new position via the GripVertical handle. The new order persists across page reload. The image at order=0 becomes the primary thumbnail on the list page.
result: pass

### 5. Per-thumbnail delete with confirm
expected: On the edit page, click a thumbnail's Trash2 icon. `window.confirm("Remove this photo from the recipe?")` appears. Confirming removes the image and renormalizes order on the server. The recipe list and detail views update after navigation.
result: pass

### 6. Recipe list thumbnails
expected: Navigate to `/recipes`. Each Card shows either a 160×120 primary thumbnail above the title, or a Utensils icon placeholder on the secondary background for recipes without `primaryImageId`. Click-through to detail still works.
result: pass

## Summary

total: 6
passed: 5
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "On detail page, clicking a thumbnail swaps the hero and the active thumbnail picks up the `ring-2 ring-primary` outline; the 'Primary' badge marks the order=0 image (unchanged by click)."
  status: failed
  reason: "User reported: on the detail page, when clicking another image, primary stays the same, though the displayed hero changes"
  severity: minor
  test: 3
  artifacts: []
  missing: []
