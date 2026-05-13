/**
 * PATCH /api/recipes/[id]/images/reorder
 *
 * Body: { orderedIds: string[] }
 * 200 -> { ok: true }
 * 400 -> { error: 'Invalid request data', details: ZodIssue[] }
 * 500 -> { error: 'Failed to reorder images' }
 *
 * The atomic transaction lives in storageAdapter.reorderRecipeImages
 * (plan 02-01). Cross-recipe imageIds cause the adapter transaction to
 * roll back; the handler surfaces that as a 500 (route-level zod handles
 * shape validation only).
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { storageAdapter } from '@/lib/storage';

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

    return NextResponse.json(
      { error: 'Failed to reorder images' },
      { status: 500 }
    );
  }
}
