# Phase 02: Multi-Image Support - Pattern Map

**Mapped:** 2026-05-13
**Files analyzed:** 15 (new/modified)
**Analogs found:** 14 / 15

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `prisma/schema.prisma` (MODIFY: add `RecipeImage` model + `Recipe.images` back-relation) | schema/model | persistence | `prisma/schema.prisma` (`RecipeIngredient`) | exact (one-to-many with cascade + map + index) |
| `prisma/migrations/{TS}_add_recipe_images/migration.sql` (NEW) | migration | DDL + data migration | `prisma/migrations/20251119180113_add_recipe_image/migration.sql` | role-match (single ALTER, no data copy) |
| `src/lib/storage/storage-adapter.ts` (MODIFY: extend `StorageAdapter` interface) | interface/contract | request-response | `src/lib/storage/storage-adapter.ts` (existing methods) | exact |
| `src/lib/storage/database-adapter.ts` (MODIFY: implement new methods) | service/adapter | CRUD | `src/lib/storage/database-adapter.ts` (existing class) | exact |
| `src/lib/storage/__tests__/database-adapter.test.ts` (NEW) | test (unit) | request-response | `src/lib/__tests__/utils.test.ts` + `src/lib/recipe-importers/__tests__/json-ld-parser.test.ts` | role-match (no existing adapter tests) |
| `src/app/api/recipes/[id]/images/route.ts` (NEW) | controller (route) | request-response (multipart upload + JSON list) | `src/app/api/recipes/[id]/image/route.ts` (GET/PUT/DELETE) | exact (extends single→multi) |
| `src/app/api/recipes/[id]/images/[imageId]/route.ts` (NEW) | controller (route) | request-response (binary GET, DELETE) | `src/app/api/recipes/[id]/image/route.ts` (GET binary) | exact |
| `src/app/api/recipes/[id]/images/reorder/route.ts` (NEW) | controller (route) | request-response (JSON PATCH) | `src/app/api/recipes/[id]/route.ts` (PUT with zod + `$transaction`) | role-match (different verb/payload, same validation+transaction pattern) |
| `src/app/api/recipes/[id]/images/__tests__/route.test.ts` (NEW) | test (unit) | request-response | `src/app/recipes/[id]/__tests__/page.test.tsx` (jest mock pattern) | role-match (no existing API route tests) |
| `src/app/api/recipes/[id]/images/[imageId]/__tests__/route.test.ts` (NEW) | test (unit) | request-response | `src/app/recipes/[id]/__tests__/page.test.tsx` | role-match |
| `src/app/api/recipes/[id]/images/reorder/__tests__/route.test.ts` (NEW) | test (unit) | request-response | `src/app/recipes/[id]/__tests__/page.test.tsx` | role-match |
| `src/lib/queries/recipe-image-queries.ts` (NEW) | hook (query/mutation) | request-response (TanStack Query) | `src/lib/queries/recipe-queries.ts` (`useUploadRecipeImage`, `useDeleteRecipeImage`) | exact |
| `src/lib/queries/recipe-queries.ts` (MODIFY: add `images: RecipeImage[]` to `Recipe`; add `primaryImageId` typing) | hook | request-response | `src/lib/queries/recipe-queries.ts` (existing `Recipe` interface) | exact (self-modify) |
| `src/components/recipes/image-gallery.tsx` (NEW) — read-only hero + clickable thumbnail strip | component (client) | event-driven (local state) | `src/app/recipes/[id]/page.tsx` lines 158-169 (existing `next/image` hero block) | role-match (extracts existing image block + adds thumbnails) |
| `src/components/recipes/image-upload-zone.tsx` (NEW) — multi-file drag-drop | component (client) | event-driven (file input + fetch mutation) | `src/components/recipes/recipe-form.tsx` (import URL block lines 126-148; Button/Input/Label usage) | partial (no existing drag-drop; reuses lucide/Button/state-progress idioms) |
| `src/components/recipes/sortable-thumbnail-strip.tsx` (NEW) — DnD reorder + per-thumb delete | component (client) | event-driven (DnD callbacks → mutation) | RESEARCH.md Pattern 3 (`@dnd-kit/sortable`) + `src/components/recipes/ingredient-list.tsx` (list-of-rows with controls) | partial (DnD library is new; row layout maps to ingredient-list) |
| `src/components/recipes/__tests__/image-gallery.test.tsx` (NEW) | test (component) | event-driven | `src/app/recipes/[id]/__tests__/page.test.tsx` (RTL + jest.mock for `next/image`) | exact |
| `src/components/recipes/__tests__/image-upload-zone.test.tsx` (NEW) | test (component) | event-driven | `src/app/recipes/[id]/__tests__/page.test.tsx` | role-match |
| `src/lib/queries/__tests__/recipe-image-queries.test.ts` (NEW) | test (unit) | request-response | `src/lib/recipe-importers/__tests__/json-ld-parser.test.ts` | role-match |
| `src/app/recipes/[id]/page.tsx` (MODIFY: replace `recipe.imageUrl &&` gate at line 159 with `<ImageGallery>`) | page (client) | event-driven | same file lines 158-169 | exact (self-modify) |
| `src/app/recipes/[id]/edit/page.tsx` (MODIFY: render `<ImageUploadZone>` + `<SortableThumbnailStrip>` above `<RecipeForm>`) | page (client) | event-driven | same file lines 75-89 | exact (self-modify) |
| `src/app/recipes/page.tsx` (MODIFY: render primary thumbnail in `Card`) | page (client) | request-response | same file lines 151-213 (`Card` rendering) | exact (self-modify) |
| `src/app/api/recipes/route.ts` (MODIFY: include `images: { where: { order: 0 }, take: 1, select: { id: true } }` in list query) | controller (route) | CRUD | same file lines 82-97 (`prisma.recipe.findMany` with include) | exact (self-modify) |
| `src/app/api/recipes/[id]/route.ts` (MODIFY: include full `images` array in `GET`; serialize without `data: Bytes`) | controller (route) | CRUD | same file lines 31-92 (`GET` with include + serialization) | exact (self-modify) |

---

## Pattern Assignments

### `prisma/schema.prisma` — add `RecipeImage` model

**Analog:** `prisma/schema.prisma` lines 62-76 (`RecipeIngredient`)

**One-to-many child model with cascade, `@map`, composite index** (lines 62-76):
```prisma
model RecipeIngredient {
  id              String  @id @default(cuid())
  recipeId        String  @map("recipe_id")
  ingredientId    String  @map("ingredient_id")
  quantity        Float
  unit            String
  preparationNote String? @map("preparation_note")
  isOptional      Boolean @default(false) @map("is_optional")

  // Relations
  recipe     Recipe     @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  ingredient Ingredient @relation(fields: [ingredientId], references: [id])

  @@map("recipe_ingredients")
}
```

**Back-relation idiom on `Recipe`** (line 39):
```prisma
ingredients       RecipeIngredient[]
plannedMeals      PlannedMeal[]
```
Add `images RecipeImage[]` alongside.

**Copy:** `@id @default(cuid())`, `String @map("recipe_id")` foreign-key style, `onDelete: Cascade`, `@@map("recipe_images")` table name. Add `@@index([recipeId, order])` (no analog in this schema — only `@@map` is used — but indexes are standard Prisma).

**Field decisions** (from RESEARCH.md Pattern 1):
- `data Bytes` (matches `Recipe.imageData Bytes?` at line 27 — but new column is `NOT NULL`)
- `mimeType String @map("mime_type")` (matches line 28)
- `fileName String @map("file_name")` (matches line 29)
- `order Int` (no analog; new field)
- `createdAt DateTime @default(now()) @map("created_at")` (matches line 35)

---

### `prisma/migrations/{TS}_add_recipe_images/migration.sql`

**Analog:** `prisma/migrations/20251119180113_add_recipe_image/migration.sql` (5 lines — only ALTER TABLE pattern)

**Existing pattern:**
```sql
-- AlterTable
ALTER TABLE "recipes" ADD COLUMN     "image_data" BYTEA,
ADD COLUMN     "image_file_name" TEXT,
ADD COLUMN     "image_mime_type" TEXT,
ADD COLUMN     "import_status" JSONB,
ADD COLUMN     "is_draft" BOOLEAN NOT NULL DEFAULT false;
```

Note: this is a Prisma-generated migration — `prisma migrate dev --name add_recipe_images` will generate `CREATE TABLE recipe_images` + indexes automatically. The data-migration `INSERT INTO recipe_images SELECT FROM recipes` (RESEARCH.md Pattern 5) must be appended **manually** to the generated SQL before commit:

```sql
-- Data migration (appended manually after `prisma migrate dev` generation)
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

Per RESEARCH.md A1: do NOT drop `recipes.image_data`/`image_mime_type`/`image_file_name` in this migration — defer to a follow-up cleanup migration.

---

### `src/lib/storage/storage-adapter.ts` — extend `StorageAdapter` interface

**Analog:** `src/lib/storage/storage-adapter.ts` lines 13-41 (existing interface, same file self-extend)

**Imports & type-export idiom** (lines 1-11):
```typescript
export interface StorageMetadata {
  mimeType: string;
  fileName: string;
  size: number;
}

export interface StoredImage {
  id: string;
  data: Buffer;
  metadata: StorageMetadata;
}
```

**Existing method-signature style** (lines 13-41):
```typescript
export interface StorageAdapter {
  saveImage(id: string, data: Buffer, metadata: StorageMetadata): Promise<void>;
  getImage(id: string): Promise<StoredImage | null>;
  deleteImage(id: string): Promise<void>;
  imageExists(id: string): Promise<boolean>;
  validateImage(data: Buffer, metadata: StorageMetadata): Promise<{
    isValid: boolean;
    errors: string[];
  }>;
}
```

**`IMAGE_CONFIG` const-export at file foot** (lines 44-54): retain; consider adding optional `maxImagesPerRecipe?: number` (RESEARCH.md Q2 — leave unset for now).

**New methods to add** (RESEARCH.md):
```typescript
saveRecipeImage(recipeId: string, data: Buffer, metadata: StorageMetadata, order: number): Promise<string>;
getRecipeImage(imageId: string): Promise<StoredImage | null>;
deleteRecipeImage(imageId: string, recipeId: string): Promise<void>;
listRecipeImages(recipeId: string): Promise<Array<{ id: string; order: number; fileName: string; mimeType: string }>>;
reorderRecipeImages(recipeId: string, orderedIds: string[]): Promise<void>;
```

Keep the legacy `saveImage`/`getImage`/`deleteImage` signatures intact during Phase 2 (callers still exist on the single-image route until cleanup phase).

---

### `src/lib/storage/database-adapter.ts` — implement new methods

**Analog:** `src/lib/storage/database-adapter.ts` (same file self-extend)

**Class-with-prisma-import pattern** (lines 1-4):
```typescript
import { prisma } from '@/lib/prisma';
import { StorageAdapter, StorageMetadata, StoredImage, IMAGE_CONFIG } from './storage-adapter';

export class DatabaseStorageAdapter implements StorageAdapter {
```

**Validate-then-write pattern** (lines 5-21) — copy structure for `saveRecipeImage`:
```typescript
async saveImage(id: string, data: Buffer, metadata: StorageMetadata): Promise<void> {
  // Validate the image first
  const validation = await this.validateImage(data, metadata);
  if (!validation.isValid) {
    throw new Error(`Invalid image: ${validation.errors.join(', ')}`);
  }

  // Update the recipe with image data
  await prisma.recipe.update({
    where: { id },
    data: {
      imageData: data,
      imageMimeType: metadata.mimeType,
      imageFileName: metadata.fileName,
    },
  });
}
```

For `saveRecipeImage`: replace `prisma.recipe.update` with `prisma.recipeImage.create({ data: { recipeId, order, data, mimeType, fileName } })` and `return created.id`.

**Get-with-select pattern** (lines 23-47) — copy for `getRecipeImage`:
```typescript
async getImage(id: string): Promise<StoredImage | null> {
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: {
      id: true,
      imageData: true,
      imageMimeType: true,
      imageFileName: true,
    },
  });

  if (!recipe?.imageData || !recipe.imageMimeType || !recipe.imageFileName) {
    return null;
  }

  return {
    id: recipe.id,
    data: recipe.imageData,
    metadata: {
      mimeType: recipe.imageMimeType,
      fileName: recipe.imageFileName,
      size: recipe.imageData.length,
    },
  };
}
```

For `getRecipeImage(imageId)`: `prisma.recipeImage.findUnique({ where: { id: imageId } })`.

**Validation pattern — reuse as-is** (lines 69-120): `validateImage` + `hasValidImageHeader`. No changes — new flow calls the same function.

**For `deleteRecipeImage(imageId, recipeId)` + order re-normalization** (RESEARCH.md Pitfall 1) — no direct analog; use `prisma.$transaction`:
```typescript
async deleteRecipeImage(imageId: string, recipeId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.recipeImage.delete({ where: { id: imageId, recipeId } });
    const remaining = await tx.recipeImage.findMany({
      where: { recipeId },
      orderBy: { order: 'asc' },
      select: { id: true },
    });
    await Promise.all(
      remaining.map((img, idx) =>
        tx.recipeImage.update({ where: { id: img.id }, data: { order: idx } })
      )
    );
  });
}
```
(Transaction-with-callback shape matches `src/app/api/recipes/[id]/route.ts` lines 103-171.)

---

### `src/app/api/recipes/[id]/images/route.ts` — list + multi-upload

**Analog:** `src/app/api/recipes/[id]/image/route.ts` (entire file)

**Imports pattern** (lines 1-2):
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { storageAdapter } from '@/lib/storage';
```

**Async params unwrap + try/catch + console.error/JSON-error response** (lines 36-70 PUT handler):
```typescript
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await storageAdapter.saveImage(id, buffer, {
      mimeType: file.type,
      fileName: file.name,
      size: buffer.length,
    });

    return NextResponse.json({ message: 'Image uploaded successfully' });
  } catch (error) {
    const { id } = await params;
    console.error(`PUT /api/recipes/${id}/image error:`, error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}
```

**Adaptation for multi-file `POST`** (per RESEARCH.md Pattern 2):
- Replace `formData.get('image')` with `formData.getAll('images') as File[]`
- Compute `nextOrder` via `prisma.recipeImage.aggregate({ where: { recipeId: id }, _max: { order: true } })`
- Loop and call `storageAdapter.saveRecipeImage(id, buffer, metadata, nextOrder++)`
- Per-file validation: collect `{ fileName, error }[]`; return `201` with `{ imageIds, failed }` (use `422` only if all files invalid)
- Keep error-logging format identical: `console.error(\`POST /api/recipes/${id}/images error:\`, error)`

**`GET` handler for list** — adapt from lines 4-34:
- Replace `storageAdapter.getImage(id)` with `storageAdapter.listRecipeImages(id)`
- Return `NextResponse.json({ images: [...] })` (metadata only — never the bytes; RESEARCH.md Pitfall 5)

---

### `src/app/api/recipes/[id]/images/[imageId]/route.ts` — binary GET + DELETE

**Analog:** `src/app/api/recipes/[id]/image/route.ts` lines 4-34 (binary GET) and 72-88 (DELETE)

**Binary response pattern** (lines 19-25) — copy verbatim, swap source:
```typescript
return new NextResponse(new Uint8Array(image.data), {
  headers: {
    'Content-Type': image.metadata.mimeType,
    'Content-Length': image.metadata.size.toString(),
    'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
  },
});
```

**Params shape for two-segment dynamic route:**
```typescript
{ params }: { params: Promise<{ id: string; imageId: string }> }
```
Then `const { id, imageId } = await params;`.

**Security guard — cross-recipe protection** (RESEARCH.md Anti-patterns):
- Fetch row via `prisma.recipeImage.findFirst({ where: { id: imageId, recipeId: id } })` before serving bytes
- 404 (not 403) on mismatch, to avoid leaking imageId existence

**DELETE handler pattern** (lines 72-88) — copy structure; pass `(imageId, recipeId)` to `storageAdapter.deleteRecipeImage` so the WHERE includes both.

---

### `src/app/api/recipes/[id]/images/reorder/route.ts` — batch order update

**Analog:** `src/app/api/recipes/[id]/route.ts` lines 94-240 (PUT with zod schema + `prisma.$transaction`)

**Zod schema at top of file** (lines 1-29 of `[id]/route.ts`):
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const UpdateRecipeSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  // ...
});
```
For reorder, use:
```typescript
const ReorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});
```

**`PATCH` handler pattern** — adapt PUT structure (lines 94-240) but simpler:
```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { orderedIds } = ReorderSchema.parse(body);

    await prisma.$transaction(
      orderedIds.map((imageId, index) =>
        prisma.recipeImage.update({
          where: { id: imageId, recipeId: id },  // recipeId guard
          data: { order: index },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    const { id } = await params;
    console.error(`PATCH /api/recipes/${id}/images/reorder error:`, error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to reorder images' },
      { status: 500 }
    );
  }
}
```

**Error-classification idiom** (lines 220-238 of `[id]/route.ts`) — copy: branch on `ZodError` → 400, else → 500.

---

### `src/lib/queries/recipe-image-queries.ts` — TanStack hooks

**Analog:** `src/lib/queries/recipe-queries.ts` lines 76-265

**Query-keys factory pattern** (lines 76-84):
```typescript
export const recipeKeys = {
  all: ['recipes'] as const,
  lists: () => [...recipeKeys.all, 'list'] as const,
  list: (params: RecipeSearchParams) => [...recipeKeys.lists(), params] as const,
  details: () => [...recipeKeys.all, 'detail'] as const,
  detail: (id: string) => [...recipeKeys.details(), id] as const,
  image: (id: string) => [...recipeKeys.all, 'image', id] as const,
};
```
For images: namespace as `recipeImageKeys.all(recipeId)` returning `['recipes', 'images', recipeId] as const` (per RESEARCH.md code-example).

**Fetch-with-FormData pattern** (lines 167-179):
```typescript
async function uploadRecipeImage(id: string, file: File): Promise<void> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch(`${API_BASE}/${id}/image`, {
    method: 'PUT',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload image');
  }
}
```
For multi-file: `for (const file of files) formData.append('images', file);` POST to `/${id}/images`.

**Upload mutation hook** (lines 242-253) — exact copy structure:
```typescript
export function useUploadRecipeImage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) =>
      uploadRecipeImage(id, file),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: recipeKeys.image(id) });
    },
  });
}
```
For `useUploadRecipeImages({ recipeId, files })`, invalidate `recipeImageKeys.all(recipeId)` + `recipeKeys.detail(recipeId)` + `recipeKeys.lists()` (RESEARCH.md code-example).

**Mutation patterns to create (all follow same shape):**
- `useUploadRecipeImages` (POST /images)
- `useDeleteRecipeImage` (DELETE /images/[imageId])
- `useReorderRecipeImages` (PATCH /images/reorder)
- `useRecipeImages(recipeId)` query (GET /images) — analog: `useRecipe(id)` lines 199-205

**Network-error idiom** (lines 109-112, 119, 134, etc.) — copy: `if (!response.ok) throw new Error('Failed to ...')`. No JSON-error-body parsing.

---

### `src/lib/queries/recipe-queries.ts` — modify `Recipe` interface

**Analog:** same file lines 4-36 (existing `Recipe` interface)

Add to `Recipe`:
```typescript
images?: Array<{
  id: string;
  order: number;
  fileName: string;
  mimeType: string;
}>;
primaryImageId?: string;  // server-computed convenience for list view
```

Keep `imageUrl?: string` field present for legacy fallback (do not remove — RESEARCH.md A1 says keep old columns this phase).

---

### `src/components/recipes/image-gallery.tsx` — hero + clickable thumbnails (read-only)

**Analog:** `src/app/recipes/[id]/page.tsx` lines 158-169 (existing hero block) + lines 1-12 (imports)

**`'use client'` + imports pattern** (page.tsx lines 1-12):
```typescript
'use client';

import React from 'react';
import Image from 'next/image';
import { /* lucide icons */ } from 'lucide-react';
```

**Hero image with `fill`** (page.tsx lines 158-169):
```typescript
{recipe.imageUrl && (
  <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden mb-6">
    <Image
      src={`/api/recipes/${recipe.id}/image`}
      alt={recipe.title}
      fill
      className="object-cover"
      priority
    />
  </div>
)}
```

**Adaptation:**
- Replace `recipe.imageUrl &&` with `images.length > 0` gate (UI-SPEC.md Surface 2, Implementation Note 1)
- Add `useState<string>(images[0].id)` for currently-selected image
- `src` becomes `/api/recipes/${recipeId}/images/${selectedId}`
- Below hero, render a `<div className="flex gap-2 overflow-x-auto py-2">` with thumbnails (UI-SPEC.md spacing)
- Thumbnail style: 80×80 `next/image` with explicit `width={80} height={80}` (UI-SPEC.md Implementation Note 2)
- Active thumb: `ring-2 ring-primary ring-offset-2`; inactive: `opacity-80 hover:opacity-100 transition`
- Primary badge overlay on `order=0` thumb (UI-SPEC.md Surface 2)

**Empty state** (UI-SPEC.md Surface 2) — no analog; pattern follows RecipeForm-style centered block:
```typescript
<div className="relative w-full h-64 md:h-96 rounded-lg border-dashed border-2 bg-secondary flex flex-col items-center justify-center text-muted-foreground">
  <ImageOff className="h-12 w-12 mb-3" />
  <h3 className="text-xl font-semibold">No photos yet</h3>
  <p className="text-base max-w-xs text-center mt-2">Add photos to help others follow along with ingredients, process, and the finished dish.</p>
</div>
```

---

### `src/components/recipes/image-upload-zone.tsx` — multi-file drag-drop

**Analog:** `src/components/recipes/recipe-form.tsx` lines 1-17 (imports) + 126-148 (URL-import block with state + Button + lucide) + state-managed-pending pattern at lines 27-29, 78-90

**Imports pattern** (lines 1-17):
```typescript
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Save } from 'lucide-react';
```
For upload zone: swap `Download` for `Upload` + `CheckCircle2` + `AlertCircle` (UI-SPEC.md Surface 1).

**State + async-pending pattern** (lines 26-29):
```typescript
const [importUrl, setImportUrl] = useState('');
const [importResult, setImportResult] = useState<ImportResult | null>(null);
const [isImporting, setIsImporting] = useState(false);

const importMutation = useImportRecipe();
```
For zone: `useState<{ file: File; status: 'pending'|'uploading'|'done'|'error'; error?: string }[]>([])` + `useUploadRecipeImages()` mutation hook.

**Inline submit-handler with try/catch** (lines 78-90):
```typescript
const handleImport = async () => {
  if (!importUrl) return;

  setIsImporting(true);
  try {
    const result = await importMutation.mutateAsync(importUrl);
    setImportResult(result);
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    setIsImporting(false);
  }
};
```
For upload: iterate files, update per-file state, call `await uploadMutation.mutateAsync({ recipeId, files: [file] })`.

**Drop-zone container** (no direct analog — UI-SPEC.md Surface 1 is the contract):
```typescript
<div
  className={`border-dashed border-2 rounded-lg p-6 min-h-[120px] bg-secondary
    ${isDragOver ? 'border-primary bg-primary/10' : 'border-border'}
    ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
  role="button"
  tabIndex={0}
  aria-label="Upload recipe photos"
  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
  onDragLeave={() => setIsDragOver(false)}
  onDrop={handleDrop}
  onClick={() => fileInputRef.current?.click()}
  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
>
  <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={handleFileSelect} />
  {/* idle / drag-over / uploading content per UI-SPEC */}
</div>
```

**Copy strings** — pull verbatim from UI-SPEC.md Copywriting Contract (no improvisation):
- Idle: "Drag photos here, or click to browse"
- Drag-over: "Drop to add photos"
- Progress: "Uploading photo N of M…"
- File-too-large: "Photo must be under 10MB"
- Wrong type: "Only JPEG, PNG, WebP, and GIF are supported"

---

### `src/components/recipes/sortable-thumbnail-strip.tsx` — DnD reorder + delete

**Analog:** RESEARCH.md Pattern 3 (entire @dnd-kit example) + `src/components/recipes/ingredient-list.tsx` (list-of-row-with-controls layout; see Shared Patterns)

**DnD wiring** (verbatim from RESEARCH.md Pattern 3):
```typescript
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
```
Use `horizontalListSortingStrategy` (UI-SPEC.md Surface 3 — horizontal strip).

**`SortableThumbnail` sub-component** (RESEARCH.md Pattern 3, adapted):
- Add `<GripVertical className="h-4 w-4 text-muted-foreground absolute top-1 right-1" />` overlay (UI-SPEC.md Surface 3)
- Add delete button: `<Trash2 className="h-4 w-4" />` inside `<button onClick={() => onDelete(image.id)} aria-label="Remove photo">` — uses `window.confirm("Remove this photo from the recipe?")` (UI-SPEC.md Surface 4)
- Primary badge on `order === 0` (UI-SPEC.md Surface 2)
- Drag states per UI-SPEC.md Surface 3 (90% opacity, `scale-95`, `ring-2 ring-primary` while dragging)

**Reorder mutation glue:**
```typescript
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (over && active.id !== over.id) {
    const oldIndex = images.findIndex(i => i.id === active.id);
    const newIndex = images.findIndex(i => i.id === over.id);
    const newOrder = arrayMove(images, oldIndex, newIndex);
    reorderMutation.mutate({ recipeId, orderedIds: newOrder.map(i => i.id) });
  }
}
```

---

### `src/app/recipes/[id]/page.tsx` — replace image gate

**Analog:** same file lines 158-169 (existing block being replaced)

**Replace:**
```typescript
{recipe.imageUrl && (
  <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden mb-6">
    <Image
      src={`/api/recipes/${recipe.id}/image`}
      alt={recipe.title}
      fill
      className="object-cover"
      priority
    />
  </div>
)}
```

**With:**
```typescript
<ImageGallery recipeId={recipe.id} images={recipe.images ?? []} recipeTitle={recipe.title} />
```

`ImageGallery` handles its own empty state. Remove the `Image` import if unused elsewhere on the page.

---

### `src/app/recipes/[id]/edit/page.tsx` — render upload zone + sortable strip

**Analog:** same file lines 75-89 (existing render block)

Existing layout:
```typescript
<div className="container mx-auto py-6">
  <div className="max-w-4xl mx-auto">
    <div className="mb-6">
      <Button variant="ghost" onClick={handleBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Recipes
      </Button>
    </div>
    <h1 className="text-3xl font-bold mb-6">Edit Recipe</h1>
    <RecipeForm recipe={recipe} onSuccess={handleSuccess} onCancel={handleCancel} />
  </div>
</div>
```

Add **above** `<RecipeForm>`:
```typescript
<section className="mb-8 space-y-4">
  <h2 className="text-xl font-semibold">Photos</h2>
  <ImageUploadZone recipeId={recipe.id} />
  {recipe.images && recipe.images.length > 0 && (
    <SortableThumbnailStrip recipeId={recipe.id} images={recipe.images} />
  )}
</section>
```

---

### `src/app/recipes/page.tsx` — render primary thumbnail in Card

**Analog:** same file lines 151-213 (Card layout)

Existing `CardHeader` start (line 157):
```typescript
<CardHeader className="pb-3">
```

Insert thumbnail block **before** `CardHeader`:
```typescript
{recipe.primaryImageId ? (
  <Image
    src={`/api/recipes/${recipe.id}/images/${recipe.primaryImageId}`}
    alt={recipe.title}
    width={160}
    height={120}
    className="w-full h-30 object-cover rounded-t-lg"
  />
) : (
  <div className="w-full h-30 bg-secondary rounded-t-lg flex items-center justify-center">
    <Utensils className="h-8 w-8 text-muted-foreground" />
  </div>
)}
```
(UI-SPEC.md Surface 5 dimensions and copy.) Add `Utensils` to lucide imports at line 10.

---

### `src/app/api/recipes/route.ts` — include primary image in list

**Analog:** same file lines 82-97 (existing list query)

Existing:
```typescript
prisma.recipe.findMany({
  where,
  include: {
    ingredients: {
      include: {
        ingredient: true,
      },
    },
  },
  orderBy: { createdAt: 'desc' },
  skip,
  take: limit,
}),
```

Modify `include` block (RESEARCH.md Pattern 6):
```typescript
include: {
  ingredients: { include: { ingredient: true } },
  images: {
    where: { order: 0 },
    take: 1,
    select: { id: true },   // never select `data` here — Pitfall 5
  },
},
```

Modify serialization block (lines 100-126) to project `primaryImageId: recipe.images[0]?.id` onto each result and `delete (recipe as any).images` so the bytes never leak.

---

### `src/app/api/recipes/[id]/route.ts` — include full images array in detail

**Analog:** same file lines 31-92 (existing GET handler)

Existing include (lines 39-46):
```typescript
include: {
  ingredients: {
    include: {
      ingredient: true,
    },
  },
},
```

Modify to:
```typescript
include: {
  ingredients: { include: { ingredient: true } },
  images: {
    orderBy: { order: 'asc' },
    select: { id: true, order: true, fileName: true, mimeType: true },  // NEVER data
  },
},
```

Serialization block (lines 69-83) — pass `images` through unchanged (no Date fields to serialize).

---

## Shared Patterns

### Next.js App Router params unwrap
**Source:** `src/app/api/recipes/[id]/image/route.ts` lines 4-9, 36-41, 72-77
**Apply to:** All new API routes
```typescript
export async function HANDLER(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // ...
```

### API error handling
**Source:** `src/app/api/recipes/[id]/image/route.ts` lines 26-33 + `src/app/api/recipes/[id]/route.ts` lines 217-238
**Apply to:** All new API routes
```typescript
} catch (error) {
  const { id } = await params;
  console.error(`METHOD /api/recipes/${id}/path error:`, error);

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: 'Invalid request data', details: error.errors },
      { status: 400 }
    );
  }

  return NextResponse.json(
    { error: 'Failed to ...' },
    { status: 500 }
  );
}
```
Always include the URL path in the `console.error` prefix for log searchability.

### Prisma transaction (interactive callback)
**Source:** `src/app/api/recipes/[id]/route.ts` lines 103-171 (PUT) + lines 151-201 (POST in `route.ts`)
**Apply to:** `deleteRecipeImage` (delete + renormalize), reorder route already uses `$transaction(array)` form
```typescript
const result = await prisma.$transaction(async (tx) => {
  // multi-step writes
  return result;
});
```

### Recipe-key invalidation on image mutation
**Source:** `src/lib/queries/recipe-queries.ts` lines 248-251, 260-263
**Apply to:** All image-mutation hooks in `recipe-image-queries.ts`
```typescript
onSuccess: (_, { id }) => {
  queryClient.invalidateQueries({ queryKey: recipeKeys.detail(id) });
  queryClient.invalidateQueries({ queryKey: recipeImageKeys.all(id) });
  queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });  // for primary-image change
},
```

### List-of-rows with controls (component layout)
**Source:** `src/components/recipes/ingredient-list.tsx` (existing dynamic-list pattern with add/remove rows)
**Apply to:** `SortableThumbnailStrip`, `ImageUploadZone` (per-file status rows)
Pattern: a parent container + `.map(...)` over items rendering individual row components with per-item controls (delete, grip).

### Test mock-and-render scaffold
**Source:** `src/app/recipes/[id]/__tests__/page.test.tsx` lines 1-32 (setup), 191-260 (loading/error tests), 564-695 (interaction tests)
**Apply to:** All new component tests + API route tests (adapt for route-level: mock `@/lib/storage` + `@/lib/prisma`)
```typescript
jest.mock('next/navigation', () => ({ useRouter: jest.fn(), useParams: jest.fn() }));
jest.mock('@/lib/queries/recipe-queries', () => ({ /* hook mocks */ }));
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));
```

### Cross-recipe authorization guard
**Source:** RESEARCH.md Anti-patterns + `src/app/api/recipes/[id]/route.ts` line 250 (recipe-exists check)
**Apply to:** All `images/[imageId]` mutations and `reorder` route
Pattern: always include `recipeId: id` (from URL params) in the Prisma `where` clause, never trust client-provided recipeId.

### Image validation (reused)
**Source:** `src/lib/storage/database-adapter.ts` lines 69-120 (`validateImage` + `hasValidImageHeader`)
**Apply to:** Multi-file upload route — call once per file before `saveRecipeImage`
Existing function already checks size, MIME allowlist, and magic-bytes header. No new validation code.

### Binary response headers
**Source:** `src/app/api/recipes/[id]/image/route.ts` lines 19-25
**Apply to:** `src/app/api/recipes/[id]/images/[imageId]/route.ts` GET (verbatim copy):
```typescript
return new NextResponse(new Uint8Array(image.data), {
  headers: {
    'Content-Type': image.metadata.mimeType,
    'Content-Length': image.metadata.size.toString(),
    'Cache-Control': 'public, max-age=3600',
  },
});
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/components/recipes/sortable-thumbnail-strip.tsx` (DnD library glue) | component | event-driven | No existing drag-and-drop code in the codebase. Library is new; use RESEARCH.md Pattern 3 + `@dnd-kit/sortable` docs as canonical source. Row-layout structure is the only piece with a codebase analog (ingredient-list). |
| `src/components/recipes/image-upload-zone.tsx` (drag-drop file zone with native `dragover`/`drop` handlers) | component | event-driven | The codebase has no drag-drop file UX. URL-import block in `recipe-form.tsx` is the nearest pattern for "input + button + pending state" but not for native browser drag-drop. The drop-zone container itself must be authored from UI-SPEC.md Surface 1 spec. |

API route tests (3 new test files under `src/app/api/recipes/[id]/images/.../__tests__/`) have **no existing API-route test analog** in the codebase — all current tests are for utilities, parsers, or pages. The closest is the page-test mock setup (`page.test.tsx` lines 1-32). Plans should treat the test pattern as RTL-style `jest.mock` of `@/lib/prisma` + `@/lib/storage` followed by direct invocation of the route handlers via a fabricated `NextRequest`.

---

## Metadata

**Analog search scope:**
- `src/app/api/recipes/**` (existing routes for verb/error patterns)
- `src/lib/storage/**` (interface + adapter)
- `src/lib/queries/**` (TanStack hooks)
- `src/components/recipes/**` (component layouts)
- `src/app/recipes/**` (page-level integration)
- `prisma/schema.prisma` (model patterns)
- `prisma/migrations/**` (SQL DDL patterns)

**Files scanned:** 14 source files + 1 schema + 1 migration + 1 test file
**Pattern extraction date:** 2026-05-13
