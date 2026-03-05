import { NextRequest, NextResponse } from 'next/server';
import { storageAdapter } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const image = await storageAdapter.getImage(id);

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
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    const { id } = await params;
    console.error(`GET /api/recipes/${id}/image error:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 500 }
    );
  }
}

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await storageAdapter.deleteImage(id);
    return NextResponse.json({ message: 'Image deleted successfully' });
  } catch (error) {
    const { id } = await params;
    console.error(`DELETE /api/recipes/${id}/image error:`, error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}