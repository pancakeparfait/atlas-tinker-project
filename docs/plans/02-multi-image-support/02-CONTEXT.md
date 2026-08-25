# Phase 2: Multi-Image Support - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can upload multiple images for a recipe, display them on recipe detail, reorder/set primary image, and see thumbnails in recipe lists. Removing images, image validation (file type/size), and thumbnail display in lists are all part of this phase.

</domain>

<decisions>
## Implementation Decisions

### Image Storage Model
- **Separate table:** New `RecipeImage` table with recipeId, order, mimeType, data, fileName fields
- **Pattern:** Extends existing StorageAdapter pattern (`saveImage`, `getImage`, `deleteImage`)
- **Migration:** Existing single image migrates to new table as first image with order=0

### Display Layout
- **Main + thumbnails:** Recipe detail shows large primary image at top, clickable thumbnail strip below
- **Interaction:** Clicking thumbnail updates the main view
- **Empty state:** Placeholder when no images uploaded

### Upload Experience
- **Multi-file drag-drop:** Drag-drop zone accepts multiple files simultaneously
- **Progress:** Shows individual upload progress per file
- **Validation:** Reuses existing image validation (10MB max, jpeg/png/webp/gif)

### Reordering Mechanism
- **Drag-drop thumbnails:** Users drag thumbnails to reorder
- **Auto-primary:** First image (order=0) automatically becomes primary
- **Visual feedback:** Clear drag handles and drop indicators

### List Thumbnails
- **Primary image:** Recipe list/grid shows the designated primary image
- **Edit control:** Users can change primary in edit view (set different image as thumbnail)

### OpenCode's Discretion
- Exact thumbnail dimensions in list view
- Loading skeleton design for image uploads
- Error state handling for failed uploads
- Delete confirmation UX

</decisions>

<specifics>
## Specific Ideas

- "Users want to show ingredients, process steps, and final dish" — three distinct image types in mind
- Extends current single-image storage pattern smoothly
- Keep consistent with Phase 1 fraction display approach: consistent everywhere

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- StorageAdapter interface: `saveImage`, `getImage`, `deleteImage`, `validateImage` — extend for multiple images
- IMAGE_CONFIG: Existing validation config (10MB, mime types)
- Card component: Can display image + recipe info in grid

### Established Patterns
- TanStack Query hooks for image mutations (`useUploadRecipeImage`, `useDeleteRecipeImage`)
- API routes follow Next.js App Router pattern with params await
- Prisma with PostgreSQL, existing migrations support

### Integration Points
- API: `/api/recipes/[id]/image` endpoint extends to array operations
- UI: Recipe detail page (`src/app/recipes/[id]/page.tsx`) needs new image gallery component
- Recipe list: Grid component needs to fetch primary image from new table

</code_context>

<deferred>
## Deferred Ideas

- File system storage for images (future optimization)
- Cloud storage migration (Strategy pattern already supports it)
- Image editing/cropping in-browser — add to backlog

</deferred>

---

_Phase: 02-multi-image-support_
_Context gathered: 2026-03-17_
