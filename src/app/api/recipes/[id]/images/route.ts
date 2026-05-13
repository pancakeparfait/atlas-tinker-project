/**
 * Multi-image upload + list route.
 *
 * Concurrency note (T-02-12): nextOrder is read once per request via
 * prisma.recipeImage.aggregate. Concurrent uploads to the same recipe can
 * therefore produce duplicate order values. Per Phase 2 RESEARCH (single-user
 * app) this is an accepted risk — duplicates are repaired on the next delete
 * or reorder operation. Test G in __tests__/route.test.ts formalizes the
 * accepted behavior.
 */
import { NextRequest, NextResponse } from 'next/server';
import { storageAdapter } from '@/lib/storage';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const images = await storageAdapter.listRecipeImages(id);
    return NextResponse.json({ images });
  } catch (error) {
    const { id } = await params;
    console.error(`GET /api/recipes/${id}/images error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    // prettier-ignore
    const files = formData.getAll('images').filter((f): f is File => f instanceof File);

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No image files provided' },
        { status: 400 }
      );
    }

    // WR-08: confirm the parent recipe exists before writing into
    // recipe_images. Without this, a bogus recipe id surfaces as a generic
    // 500 (from the P2003 foreign-key violation in saveRecipeImage). 404 is
    // the correct surface here and matches the DELETE handler.
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    const agg = await prisma.recipeImage.aggregate({
      where: { recipeId: id },
      _max: { order: true },
    });
    let nextOrder = (agg._max.order ?? -1) + 1;

    const imageIds: string[] = [];
    const failed: Array<{ fileName: string; error: string }> = [];

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const metadata = {
        mimeType: file.type,
        fileName: file.name,
        size: buffer.length,
      };

      const validation = await storageAdapter.validateImage(buffer, metadata);
      if (!validation.isValid) {
        failed.push({
          fileName: file.name,
          error: validation.errors.join(', '),
        });
        continue;
      }

      const newId = await storageAdapter.saveRecipeImage(
        id,
        buffer,
        metadata,
        nextOrder++
      );
      imageIds.push(newId);
    }

    return NextResponse.json({ imageIds, failed }, { status: 201 });
  } catch (error) {
    const { id } = await params;
    console.error(`POST /api/recipes/${id}/images error:`, error);

    // WR-08: defense-in-depth — if the recipe is deleted between our
    // existence check and the insert, Prisma raises P2003 (foreign-key
    // violation). Surface that as 404 rather than a generic 500.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to upload images' },
      { status: 500 }
    );
  }
}
