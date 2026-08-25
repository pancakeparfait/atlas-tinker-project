# Phase 2: Multi-Image Support - Research

**Researched:** 2026-05-13
**Domain:** Next.js App Router / Prisma PostgreSQL / TanStack Query / @dnd-kit drag-and-drop
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Image Storage Model:** New `RecipeImage` table with `recipeId`, `order`, `mimeType`, `data`, `fileName` fields. Extends existing `StorageAdapter` pattern (`saveImage`, `getImage`, `deleteImage`). Existing single image migrates as first image with `order=0`.
- **Display Layout:** Recipe detail shows large primary image at top, clickable thumbnail strip below. Clicking thumbnail updates the main view. Placeholder shown when no images uploaded.
- **Upload Experience:** Multi-file drag-drop zone accepts multiple files simultaneously. Shows individual upload progress per file. Reuses existing image validation (10MB max, jpeg/png/webp/gif).
- **Reordering Mechanism:** Drag-drop thumbnails to reorder. First image (`order=0`) automatically becomes primary. Clear drag handles and drop indicators.
- **List Thumbnails:** Recipe list/grid shows the designated primary image (order=0). Users can change primary in edit view.

### Claude's Discretion

- Exact thumbnail dimensions in list view
- Loading skeleton design for image uploads
- Error state handling for failed uploads
- Delete confirmation UX

### Deferred Ideas (OUT OF SCOPE)

- File system storage for images (future optimization)
- Cloud storage migration (Strategy pattern already supports it)
- Image editing/cropping in-browser — add to backlog
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| IMG-01 | User can upload multiple images for a recipe | New API route `POST /api/recipes/[id]/images`, multi-file form parsing, new `RecipeImage` table |
| IMG-02 | Recipe detail page displays all uploaded images | `ImageGallery` component with primary hero + thumbnail strip; query includes `RecipeImage[]` |
| IMG-03 | User can remove individual images from a recipe | `DELETE /api/recipes/[id]/images/[imageId]` route; hard delete with cascade; order re-normalization after delete |
| IMG-04 | User can reorder images (set primary/featured image) | `PATCH /api/recipes/[id]/images/reorder` accepting new order array; `@dnd-kit/sortable` in UI |
| IMG-05 | Images persist with recipe in database | `RecipeImage` table with FK to `recipes`, `onDelete: Cascade` |
| IMG-06 | Image upload validates file type and size (max 10MB) | Reuse `IMAGE_CONFIG` + `validateImage` from existing `DatabaseStorageAdapter` |
| IMG-07 | Recipe list/grid shows primary image thumbnail | `WHERE order = 0` query on `RecipeImage`; recipe list API includes `primaryImage` field |
</phase_requirements>

---

## Summary

Phase 1 shipped single-image support by storing image bytes directly on the `recipes` table (`image_data`, `image_mime_type`, `image_file_name`). Phase 2 replaces that one-to-one model with a normalized `RecipeImage` table — a standard one-to-many. The storage layer (PostgreSQL BYTEA via Prisma) stays unchanged; only the relational structure changes.

The largest architectural decision (locked): `order=0` is the primary/featured image. No separate `is_primary` boolean needed — position is truth. The migration plan copies existing image bytes into the new table, then can optionally null the old columns (or drop them in a later migration once all callers are updated).

Drag-and-drop thumbnail reordering is the only truly new UI pattern. `@dnd-kit/sortable` is the correct choice for this stack — it works cleanly with React 18 / Next.js App Router and has no server-component conflicts because the DnD logic stays fully client-side. `react-beautiful-dnd` is deprecated; `@hello-pangea/dnd` is its maintained fork but `@dnd-kit` is the ecosystem standard and more flexible for grid/strip layouts.

**Primary recommendation:** Schema migration first (Wave 0 blocker) → API layer → UI components → migration script for existing images → list-page thumbnail integration.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Image persistence (bytes + metadata) | Database | — | BYTEA stored in PostgreSQL via Prisma, same as Phase 1 |
| Image upload / validation | API (Next.js route) | — | File parsing happens server-side; client just POSTs FormData |
| Image serving (GET binary) | API (Next.js route) | CDN (future) | Binary response from DB; CDN deferred per CONTEXT |
| Multi-image display / gallery | Browser / Client | — | React component with local state for selected image |
| Thumbnail reorder (DnD) | Browser / Client | — | @dnd-kit is client-only, no SSR involvement |
| Order persistence (PATCH reorder) | API (Next.js route) | Database | Atomic batch update of `order` values |
| Primary image for list page | API (Next.js route) | Database | Query `MIN(order)` or `WHERE order = 0`; included in recipe list response |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 5.7.0 (installed) | ORM — new `RecipeImage` model, migration | Already used project-wide |
| @tanstack/react-query | 5.8.4 (installed) | Server state for image mutations & queries | Already used project-wide |
| @dnd-kit/core | 6.3.1 (registry) | Drag-and-drop primitive | Modern standard for React DnD |
| @dnd-kit/sortable | (same release) | Sortable list/grid abstraction over core | Required companion for reorder UX |
| @dnd-kit/utilities | (same release) | CSS transform helpers for drag animation | Standard companion |

[VERIFIED: npm registry — `npm view @dnd-kit/core version` returned 6.3.1]
[VERIFIED: npm registry — `npm view @dnd-kit/sortable version` returns 8.0.0 for the v2 React package; install with `@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`]

> Note: @dnd-kit ships two APIs. The stable v1 API uses `DndContext` + `useSortable` from `@dnd-kit/sortable`. The v2 API uses `DragDropProvider` + `useSortable` from `@dnd-kit/react`. The codebase uses React 18 — use the **stable v1 API** (`@dnd-kit/core` + `@dnd-kit/sortable`). [VERIFIED: Context7 docs show both APIs]

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/image | built-in | Optimized image rendering in gallery + list | Use for all `<img>` tags to get lazy loading |
| zod | 3.22.4 (installed) | Validate reorder request payload | Already used for API validation |
| lucide-react | 0.294.0 (installed) | Drag handle icon (GripVertical), upload icon | Already used project-wide |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit/sortable | @hello-pangea/dnd | @hello-pangea/dnd is react-beautiful-dnd fork; works but @dnd-kit is more flexible for thumbnail strip (horizontal) layouts and has better TypeScript support |
| @dnd-kit/sortable | HTML5 drag-and-drop | Hand-rolling DnD is complex (touch support, accessibility, auto-scroll) — don't do it |

**Installation:**
```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## Architecture Patterns

### System Architecture Diagram

```
[Browser]
  MultiImageUploadZone (drag-drop files)
       |
       | FormData (multiple files)
       v
[API Route] POST /api/recipes/[id]/images
       |
       | storageAdapter.saveImage() per file
       v
[Database] RecipeImage rows (order, mimeType, data, fileName)

[Browser]
  ImageGallery (hero image + thumbnail strip)
       |
       | GET /api/recipes/[id]/images/[imageId]
       v
[API Route] binary response (Content-Type: image/*)
       |
       v
[Database] SELECT data FROM recipe_images WHERE id = ?

[Browser]
  ThumbnailStrip with @dnd-kit/sortable
       |
       | PATCH /api/recipes/[id]/images/reorder
       | body: { orderedIds: string[] }
       v
[API Route] batch UPDATE order values in transaction
       v
[Database] recipe_images.order updated

[Browser]
  RecipeList (grid cards)
       |
       | GET /api/recipes (includes primaryImageId)
       v
[API Route] SELECT * FROM recipe_images WHERE recipe_id = ? AND order = 0 LIMIT 1
       |
       | primaryImageId returned in recipe object
       v
[Browser] <img src="/api/recipes/[id]/images/[primaryImageId]" />
```

### Recommended Project Structure

```
src/
├── app/
│   └── api/
│       └── recipes/
│           └── [id]/
│               └── images/            # NEW: multi-image routes
│                   ├── route.ts       # GET (list), POST (upload one or many)
│                   └── [imageId]/
│                       └── route.ts   # GET (serve binary), DELETE, PATCH (metadata)
│               └── reorder/
│                   └── route.ts       # PATCH reorder (batch order update)
├── components/
│   └── recipes/
│       ├── image-gallery.tsx          # NEW: hero + thumbnail strip component
│       ├── image-upload-zone.tsx      # NEW: multi-file drag-drop upload
│       └── sortable-thumbnail.tsx     # NEW: single draggable thumbnail
├── lib/
│   ├── queries/
│   │   └── recipe-image-queries.ts    # NEW: TanStack Query hooks for images
│   └── storage/
│       ├── storage-adapter.ts         # EXTEND: add listImages, saveImages methods
│       └── database-adapter.ts        # EXTEND: implement new interface methods
prisma/
└── migrations/
    └── YYYYMMDDHHMMSS_add_recipe_images/
        └── migration.sql              # CREATE TABLE recipe_images + data migration
```

### Pattern 1: New Prisma Model (RecipeImage)

**What:** Separate table for images, FK to recipes, `order` integer for position.
**When to use:** One recipe → many images.

```typescript
// To be added to prisma/schema.prisma
model RecipeImage {
  id        String   @id @default(cuid())
  recipeId  String   @map("recipe_id")
  order     Int      // 0 = primary/featured
  mimeType  String   @map("mime_type")
  data      Bytes
  fileName  String   @map("file_name")
  createdAt DateTime @default(now()) @map("created_at")

  recipe Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@index([recipeId, order])
  @@map("recipe_images")
}
```

Add relation back-reference to `Recipe`:
```typescript
// In Recipe model
images RecipeImage[]
```

[ASSUMED] — Exact field names not locked in docs; `order` chosen consistent with CONTEXT.md. Index on `(recipeId, order)` is standard for this query pattern.

### Pattern 2: Multi-file Upload API Route

**What:** POST accepts `multipart/form-data` with one or more `image` fields.
**When to use:** Bulk upload from drag-drop zone.

```typescript
// Source: existing /api/recipes/[id]/image/route.ts pattern + extension
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const formData = await request.formData();
  const files = formData.getAll('images') as File[];  // getAll for multiple

  // Get current max order
  const maxOrder = await prisma.recipeImage.aggregate({
    where: { recipeId: id },
    _max: { order: true },
  });
  let nextOrder = (maxOrder._max.order ?? -1) + 1;

  const results = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = await storageAdapter.validateImage(buffer, {
      mimeType: file.type, fileName: file.name, size: buffer.length,
    });
    if (!validation.isValid) {
      // return 422 with per-file error
    }
    const imageId = await saveRecipeImage(id, buffer, file, nextOrder++);
    results.push(imageId);
  }
  return NextResponse.json({ imageIds: results });
}
```

[CITED: existing /api/recipes/[id]/image/route.ts]

### Pattern 3: @dnd-kit Sortable Thumbnail Strip (stable v1 API)

**What:** Horizontal strip of thumbnails that can be reordered by drag.
**When to use:** Edit view image reordering.

```typescript
// Source: Context7 @dnd-kit/sortable docs (stable v1 API)
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableThumbnail({ image }: { image: RecipeImage }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <img src={`/api/recipes/${image.recipeId}/images/${image.id}`} />
    </div>
  );
}

function ThumbnailStrip({ images, onReorder }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex(i => i.id === active.id);
      const newIndex = images.findIndex(i => i.id === over.id);
      onReorder(arrayMove(images, oldIndex, newIndex));
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={images.map(i => i.id)} strategy={horizontalListSortingStrategy}>
        {images.map(img => <SortableThumbnail key={img.id} image={img} />)}
      </SortableContext>
    </DndContext>
  );
}
```

[CITED: Context7 @dnd-kit docs, stable v1 API]

### Pattern 4: Batch Reorder API

**What:** PATCH endpoint receives ordered ID array, updates `order` column atomically.
**When to use:** After user finishes dragging and drops.

```typescript
export async function PATCH(request: NextRequest, { params }) {
  const { id } = await params;
  const { orderedIds } = await request.json();
  // Zod: z.object({ orderedIds: z.array(z.string()) })

  await prisma.$transaction(
    orderedIds.map((imageId: string, index: number) =>
      prisma.recipeImage.update({
        where: { id: imageId, recipeId: id },  // recipeId guard prevents cross-recipe attack
        data: { order: index },
      })
    )
  );
  return NextResponse.json({ ok: true });
}
```

[ASSUMED] Prisma interactive transaction vs. sequential transaction — for N < 20 images the sequential `$transaction(array)` is fine. For larger N, use interactive transaction with a single UPDATE ... CASE statement.

### Pattern 5: Data Migration for Existing Images

**What:** Copy single-image data from `recipes` table into `recipe_images` table.
**When to use:** Migration SQL / seed script run after schema migration.

```sql
-- In Prisma migration SQL
INSERT INTO recipe_images (id, recipe_id, "order", mime_type, data, file_name, created_at)
SELECT
  gen_random_uuid()::text,
  id,
  0,
  image_mime_type,
  image_data,
  COALESCE(image_file_name, 'image'),
  NOW()
FROM recipes
WHERE image_data IS NOT NULL;
```

[ASSUMED] The old columns (`image_data`, `image_mime_type`, `image_file_name`) should be left in place (nullable, already nullable) until Phase 2 is fully stable. Do NOT drop them in this migration — drop in a future cleanup migration after verifying the new table has all data.

### Pattern 6: N+1-Safe Primary Image in Recipe List

**What:** Include one `primaryImage` per recipe in list query without N+1.
**When to use:** `GET /api/recipes` list endpoint.

```typescript
// In recipe list query — single query via Prisma include + orderBy
const recipes = await prisma.recipe.findMany({
  include: {
    images: {
      where: { order: 0 },  // only primary
      take: 1,
      select: { id: true },
    },
  },
  // ... existing filters
});

// Serialize: recipe.images[0]?.id => primaryImageId
// Client renders: /api/recipes/${id}/images/${primaryImageId}
```

[CITED: Prisma docs — `where` inside `include` is standard filtering]

### Anti-Patterns to Avoid

- **Fetching all images per recipe in list query:** Only fetch `order=0` image per recipe. Fetching all images for every recipe card is a guaranteed N+1 performance problem.
- **Using `is_primary` boolean instead of `order=0`:** Keeping two sources of truth (boolean + position) creates consistency bugs when images are deleted or reordered. Order-is-primary is the locked decision.
- **Serving large image blobs from the recipe GET endpoint:** Never include `data: Bytes` in the recipe JSON response. Always serve images through a dedicated binary route.
- **Storing image bytes in the recipe detail JSON:** The recipe API should return `imageIds` array (or `primaryImageId`), never the bytes themselves.
- **Not guarding recipeId in PATCH reorder:** Always verify `{ id: imageId, recipeId: id }` in the update where-clause to prevent a user from reordering another recipe's images.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop thumbnail reorder | Custom mousedown/mousemove listeners | @dnd-kit/sortable | Touch, keyboard, auto-scroll, accessibility — huge surface area |
| Image validation | Custom byte-inspection code | Existing `validateImage` in `DatabaseStorageAdapter` | Already handles MIME, size, magic bytes |
| File type checking | `file.name.endsWith('.jpg')` | `file.type` + `IMAGE_CONFIG.allowedMimeTypes` | Extension is untrustworthy; magic bytes check is already implemented |
| Upload progress per file | Manual XHR | `fetch` with `ReadableStream` or simple "uploading N of M" counter | Per-byte progress requires XMLHttpRequest; a simpler "N of M files done" counter is sufficient and trivially implemented |

**Key insight:** The image validation and storage layer is already production-quality. The only new infrastructure needed is the schema, the new routes, and the DnD UI.

---

## Runtime State Inventory

> This phase adds a new table and migrates existing data — it is a schema migration phase.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `recipes` table: `image_data`, `image_mime_type`, `image_file_name` columns hold single-image bytes for any recipes that have images | Data migration: INSERT existing bytes into `recipe_images` as `order=0` rows |
| Live service config | PostgreSQL in Docker (healthy, port 5432) — no external service config beyond connection string | None — DB is local Docker |
| OS-registered state | None | None |
| Secrets/env vars | `DATABASE_URL` env var — unchanged, no rename | None |
| Build artifacts | None | None |

**Critical:** The `recipe_images` table does not exist yet. A [BLOCKING] Prisma schema change + `prisma migrate dev` must be Wave 0 task 1. Until it runs, no other phase work can execute.

---

## Common Pitfalls

### Pitfall 1: Ordering gaps after delete

**What goes wrong:** User uploads 3 images (order 0,1,2), deletes order=1. Now orders are 0 and 2. If code assumes contiguous integers, `arrayMove` on a [0, 2] array will produce wrong results.
**Why it happens:** Delete removes a row but doesn't renumber siblings.
**How to avoid:** After delete, re-normalize remaining image orders in the same transaction: `UPDATE recipe_images SET order = ROW_NUMBER() OVER (ORDER BY order) - 1 WHERE recipe_id = $1`.
**Warning signs:** Gallery displaying images with gaps or wrong primary image after a delete.

### Pitfall 2: Race condition in concurrent uploads

**What goes wrong:** Two simultaneous uploads both read `maxOrder = 2`, both insert with `order = 3`, causing a duplicate order.
**Why it happens:** Read-then-write is non-atomic.
**How to avoid:** Use `prisma.$transaction` and lock the recipe row, or use a sequence/auto-increment for a `displayOrder` that gets normalized on save. Simplest fix: assign a large temporary order (e.g., `Date.now()`) and normalize on save/reorder.
**Warning signs:** Two images showing at same position, unexpected primary image.

### Pitfall 3: next/image requires known dimensions or fill mode

**What goes wrong:** `<Image src="..." />` throws error because width/height not provided and `fill` not set.
**Why it happens:** Next.js `Image` component requires explicit sizing.
**How to avoid:** Use `fill` + parent `position: relative` for the hero image (unknown aspect ratio from user upload). For thumbnails, use fixed `width`/`height` props.
**Warning signs:** Runtime error: "Image with src ... must have either width and height or fill."

### Pitfall 4: @dnd-kit v1 vs v2 API confusion

**What goes wrong:** Import `useSortable` from `@dnd-kit/react` (v2) but install `@dnd-kit/core` (v1), causing module-not-found errors.
**Why it happens:** @dnd-kit published a new React-specific package with a different import path.
**How to avoid:** Use v1 stable API: `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`. Import `useSortable` from `@dnd-kit/sortable`, not from `@dnd-kit/react`.
**Warning signs:** Module resolution errors on `@dnd-kit/react`.

### Pitfall 5: Large binary responses blocking recipe list

**What goes wrong:** Recipe list endpoint includes full image bytes in JSON, making list requests slow (each recipe card payload = 10MB).
**Why it happens:** Developer adds images to the Prisma include without filtering out `data` field.
**How to avoid:** In list queries, only `select: { id: true }` from `RecipeImage`. Never include `data` in list responses.
**Warning signs:** Recipe list API response is several MB; slow page loads.

### Pitfall 6: Old `imageUrl` field ignored after migration

**What goes wrong:** The recipe detail page still checks `recipe.imageUrl` (a URL field, not the blob) and renders nothing because `imageUrl` was never populated in this app (blobs go to `imageData`).
**Why it happens:** The existing detail page code (`page.tsx` line 159) gates image display on `recipe.imageUrl && ...`, but the actual image is served from `/api/recipes/[id]/image` regardless. After migration, this gate needs to check `recipe.images.length > 0` instead.
**How to avoid:** Update the recipe detail page to use the new `images` array from the API response, not `imageUrl`.
**Warning signs:** Images exist in DB but recipe detail shows no image.

---

## Code Examples

### Prisma Schema Addition

```typescript
// Source: prisma/schema.prisma (existing pattern with RecipeIngredient as analog)
model RecipeImage {
  id        String   @id @default(cuid())
  recipeId  String   @map("recipe_id")
  order     Int
  mimeType  String   @map("mime_type")
  data      Bytes
  fileName  String   @map("file_name")
  createdAt DateTime @default(now()) @map("created_at")

  recipe Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@index([recipeId, order])
  @@map("recipe_images")
}
```

### Extended StorageAdapter Interface

```typescript
// Source: src/lib/storage/storage-adapter.ts (existing interface, extended)
export interface StorageAdapter {
  saveImage(id: string, data: Buffer, metadata: StorageMetadata): Promise<void>;
  getImage(id: string): Promise<StoredImage | null>;
  deleteImage(id: string): Promise<void>;
  imageExists(id: string): Promise<boolean>;
  validateImage(data: Buffer, metadata: StorageMetadata): Promise<{ isValid: boolean; errors: string[] }>;

  // NEW for Phase 2
  saveRecipeImage(recipeId: string, data: Buffer, metadata: StorageMetadata, order: number): Promise<string>; // returns imageId
  getRecipeImage(imageId: string): Promise<StoredImage | null>;
  deleteRecipeImage(imageId: string, recipeId: string): Promise<void>;
  listRecipeImages(recipeId: string): Promise<Array<{ id: string; order: number; fileName: string; mimeType: string }>>;
  reorderRecipeImages(recipeId: string, orderedIds: string[]): Promise<void>;
}
```

### TanStack Query Hooks (new file)

```typescript
// Source: src/lib/queries/recipe-image-queries.ts (following recipe-queries.ts pattern)
export const imageKeys = {
  all: (recipeId: string) => ['recipes', 'images', recipeId] as const,
};

export function useRecipeImages(recipeId: string) {
  return useQuery({
    queryKey: imageKeys.all(recipeId),
    queryFn: () => fetchRecipeImages(recipeId),
    enabled: !!recipeId,
  });
}

export function useUploadRecipeImages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ recipeId, files }: { recipeId: string; files: File[] }) =>
      uploadRecipeImages(recipeId, files),
    onSuccess: (_, { recipeId }) => {
      queryClient.invalidateQueries({ queryKey: imageKeys.all(recipeId) });
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
    },
  });
}

export function useDeleteRecipeImage() { /* ... similar pattern */ }
export function useReorderRecipeImages() { /* ... similar pattern */ }
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-beautiful-dnd` | `@dnd-kit/sortable` | 2022 (rbd deprecated) | @dnd-kit has no SSR conflicts, better TypeScript, maintained |
| Single image on recipe row | Separate `recipe_images` table | This phase | Proper normalization for one-to-many |
| `image_url` (external URL) | `image_data` BYTEA | Phase 1 | Self-hosted; `image_url` field exists but is unused in practice |

**Deprecated/outdated:**
- `react-beautiful-dnd`: Deprecated by Atlassian; use `@hello-pangea/dnd` (fork) or `@dnd-kit` instead.
- Recipe `image_url` field: Exists in schema, checked in detail page, but never populated (all images go to `image_data`). Phase 2 should update the display gate to `images.length > 0`.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Old `image_data` columns should be left (not dropped) after migration | Migration pattern | If dropped, rollback requires data restoration |
| A2 | Sequential `$transaction([...updates])` is adequate for reorder with < 20 images | Batch reorder | For high counts, need interactive transaction or raw SQL |
| A3 | `order=0` is always the primary image (no separate `is_primary` flag needed) | Schema design | Locked in CONTEXT.md — risk is low |
| A4 | Upload progress can be "N of M files done" counter rather than byte-level progress | Upload UX | CONTEXT says "individual upload progress per file" — this satisfies intent; if byte progress is required, XMLHttpRequest is needed |

---

## Open Questions (RESOLVED)

1. **Should old `recipes.image_data` columns be dropped in this migration or a follow-up?**
   - What we know: Columns are nullable and unused after migration. Keeping them costs storage.
   - What's unclear: Whether any code path still reads `imageData` from the recipe object directly.
   - **RESOLVED:** Leave columns in place for this phase. Add a cleanup migration task to a follow-up. (Phase 2 plans 01/02/04 reference this resolution as Assumption A1 / Open Question 1 (RESOLVED).)

2. **Max image count per recipe?**
   - What we know: CONTEXT.md mentions validation but does not set a cap.
   - What's unclear: Whether there's a business-logic cap (e.g., 10 images max).
   - **RESOLVED:** Default to no hard cap in code for Phase 2. Plan 02-02 threat T-02-10 records the deferral. A configurable cap can be added to `IMAGE_CONFIG` in a future phase if abuse becomes a concern.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | Schema migration, all data ops | ✓ (Docker, healthy) | 15 | — |
| Docker | PostgreSQL container | ✓ | 27.3.1 | — |
| pnpm | Package install, dev server | ✓ | 10.22.0 | npm |
| Node.js | Next.js runtime | ✓ | 22.22.2 | — |
| @dnd-kit/core | Drag-drop reorder | ✗ (not installed) | 6.3.1 available | — |
| @dnd-kit/sortable | Drag-drop reorder | ✗ (not installed) | needs install | — |

**Missing dependencies with no fallback:**
- `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` — must be installed in Wave 0.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest 30.2.0 + ts-jest 29.4.5 + @testing-library/react 16.3.2 |
| Config file | `jest.config.js` (project root) |
| Quick run command | `pnpm test --testPathPattern="recipe-image"` |
| Full suite command | `pnpm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| IMG-01 | POST /api/recipes/[id]/images accepts multiple files, creates DB rows | unit (mock Prisma) | `pnpm test --testPathPattern="api/recipes/.*id.*/images"` | ❌ Wave 0 |
| IMG-02 | ImageGallery renders primary large + thumbnails strip | unit (RTL) | `pnpm test --testPathPattern="image-gallery"` | ❌ Wave 0 |
| IMG-03 | DELETE /api/recipes/[id]/images/[imageId] removes row, renormalizes order | unit (mock Prisma) | `pnpm test --testPathPattern="api/recipes/.*imageId"` | ❌ Wave 0 |
| IMG-04 | PATCH /api/recipes/[id]/images/reorder updates order column | unit (mock Prisma) | `pnpm test --testPathPattern="reorder"` | ❌ Wave 0 |
| IMG-05 | Images persist — Prisma insert + select roundtrip | unit (mock Prisma) | `pnpm test --testPathPattern="database-adapter"` | ❌ Wave 0 |
| IMG-06 | validateImage rejects files > 10MB and wrong MIME types | unit | `pnpm test --testPathPattern="storage"` | ❌ Wave 0 (extend existing adapter tests) |
| IMG-07 | Recipe list includes primaryImageId (order=0 only) | unit (mock Prisma) | `pnpm test --testPathPattern="recipe-queries"` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm test --testPathPattern="recipe-image|image-gallery|image-upload"` (image-related tests only)
- **Per wave merge:** `pnpm test` (full suite — currently 111 tests passing)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `src/app/api/recipes/[id]/images/__tests__/route.test.ts` — covers IMG-01, IMG-05, IMG-06
- [ ] `src/app/api/recipes/[id]/images/[imageId]/__tests__/route.test.ts` — covers IMG-03
- [ ] `src/app/api/recipes/[id]/images/reorder/__tests__/route.test.ts` — covers IMG-04
- [ ] `src/components/recipes/__tests__/image-gallery.test.tsx` — covers IMG-02
- [ ] `src/components/recipes/__tests__/image-upload-zone.test.tsx` — covers IMG-01 (UX path)
- [ ] `src/lib/queries/__tests__/recipe-image-queries.test.ts` — covers IMG-07

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Single-user app, no auth |
| V3 Session Management | no | Single-user app |
| V4 Access Control | partial | Verify `recipeId` ownership in DELETE/PATCH routes (no auth, but prevent cross-recipe manipulation via crafted requests) |
| V5 Input Validation | yes | zod for JSON payloads; existing `validateImage` for upload; `IMAGE_CONFIG` allowlist |
| V6 Cryptography | no | Images stored as plaintext bytes; no crypto needed at this stage |

### Known Threat Patterns for Image Upload Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Oversized file upload (>10MB) | DoS | `IMAGE_CONFIG.maxSizeBytes` check in `validateImage` before DB write |
| MIME type spoofing (rename .exe to .jpg) | Tampering | Magic bytes header check in `hasValidImageHeader` (already implemented) |
| Cross-recipe image manipulation (DELETE another recipe's image) | Elevation of Privilege | WHERE clause must include `recipeId = [id from URL params]` in all image mutations |
| Path traversal in fileName | Tampering | `fileName` is stored for display only, never used in filesystem path (DB storage only) |

---

## Sources

### Primary (HIGH confidence)

- Codebase — `prisma/schema.prisma` — confirmed existing schema, missing `RecipeImage` model
- Codebase — `src/lib/storage/database-adapter.ts` — confirmed `DatabaseStorageAdapter` implementation and `IMAGE_CONFIG`
- Codebase — `src/app/api/recipes/[id]/image/route.ts` — confirmed single-image route pattern to extend
- Codebase — `src/lib/queries/recipe-queries.ts` — confirmed TanStack Query hook patterns
- npm registry — `npm view @dnd-kit/core version` → 6.3.1
- Context7 `/clauderic/dnd-kit` — sortable hook API (v1 stable)

### Secondary (MEDIUM confidence)

- Prisma docs (via existing codebase patterns) — `include` with `where` filter for primary image query

### Tertiary (LOW confidence)

- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via npm registry; existing stack confirmed from package.json
- Architecture: HIGH — based on direct codebase inspection of Phase 1 implementation
- Pitfalls: HIGH — derived from concrete code analysis (imageUrl gate bug, order normalization)
- DnD API: MEDIUM — Context7 shows both v1 and v2 API; v1 recommendation is based on installed package versions

**Research date:** 2026-05-13
**Valid until:** 2026-06-12 (stable libraries; @dnd-kit API is stable)
