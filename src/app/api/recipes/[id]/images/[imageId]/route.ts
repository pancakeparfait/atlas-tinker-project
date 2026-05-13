/**
 * Binary GET + DELETE for a single recipe image.
 *
 * Security (T-02-08): GET uses a composite-where findFirst on `{ id, recipeId }`
 * before serving bytes. Cross-recipe imageId yields a 404, not 403, so the
 * route does not leak the existence of imageIds owned by other recipes.
 *
 * Security (T-02-09): DELETE relies on storageAdapter.deleteRecipeImage which
 * enforces the same composite where; cross-recipe deletes surface as Prisma
 * P2025 and are mapped to 404 here.
 */
import { NextRequest, NextResponse } from 'next/server';
import { storageAdapter } from '@/lib/storage';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const { id, imageId } = await params;

    // Ownership guard BEFORE pulling bytes (T-02-08).
    const ownership = await prisma.recipeImage.findFirst({
      where: { id: imageId, recipeId: id },
      select: { id: true },
    });
    if (!ownership) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    const image = await storageAdapter.getRecipeImage(imageId);
    if (!image) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    return new NextResponse(new Uint8Array(image.data), {
      headers: {
        'Content-Type': image.metadata.mimeType,
        'Content-Length': image.metadata.size.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    const { id, imageId } = await params;
    console.error(
      `GET /api/recipes/${id}/images/${imageId} error:`,
      error
    );
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    const { id, imageId } = await params;
    await storageAdapter.deleteRecipeImage(imageId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const { id, imageId } = await params;
    console.error(
      `DELETE /api/recipes/${id}/images/${imageId} error:`,
      error
    );

    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code?: string }).code === 'P2025'
    ) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}
