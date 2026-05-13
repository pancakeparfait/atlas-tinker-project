/**
 * PATCH /api/recipes/[id]/images/reorder
 *
 * Body: { orderedIds: string[] }
 * 200 -> { ok: true }
 * 400 -> { error: 'Invalid request data', details: ZodIssue[] }
 * 400 -> { error: "orderedIds must be exactly the recipe's image set" }
 * 404 -> { error: 'Image not found' }   (P2025 from adapter; cross-recipe / stale id)
 * 500 -> { error: 'Failed to reorder images' }
 *
 * The atomic transaction lives in storageAdapter.reorderRecipeImages
 * (plan 02-01). CR-04: this handler now verifies that orderedIds is
 * exactly the set of imageIds attached to the recipe before calling the
 * adapter. Cross-recipe or stale ids surface as 404 (mirroring the
 * DELETE handler) rather than the previous generic 500, and subset/
 * superset payloads are rejected as 400 before they can leave duplicate
 * order values in the table.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { storageAdapter } from '@/lib/storage';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

const ReorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { orderedIds } = ReorderSchema.parse(body);

    // CR-04: verify orderedIds is exactly the recipe's current image set.
    // A subset/superset would either leave omitted images with stale order
    // values (duplicates after the partial update) or attempt to update an
    // image the recipe doesn't own (rolled back by the adapter's composite
    // where clause, but surfaced as a generic 500). Catch both here.
    const existing = await prisma.recipeImage.findMany({
      where: { recipeId: id },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((r) => r.id));
    const incomingIds = new Set(orderedIds);
    const sameSize = orderedIds.length === existing.length;
    const noDuplicates = incomingIds.size === orderedIds.length;
    const allIncomingExist = orderedIds.every((x) => existingIds.has(x));
    const allExistingIncoming = existing.every((r) => incomingIds.has(r.id));
    if (!sameSize || !noDuplicates || !allIncomingExist || !allExistingIncoming) {
      return NextResponse.json(
        { error: "orderedIds must be exactly the recipe's image set" },
        { status: 400 }
      );
    }

    await storageAdapter.reorderRecipeImages(id, orderedIds);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const { id } = await params;
    console.error(
      `PATCH /api/recipes/${id}/images/reorder error:`,
      error
    );

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    // CR-04: map Prisma P2025 ("Record to update not found") to 404. This
    // can fire if an image is deleted between our existence check and the
    // adapter transaction. Mirror the DELETE handler's surface.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to reorder images' },
      { status: 500 }
    );
  }
}
