'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ImageGalleryProps {
  recipeId: string;
  recipeTitle: string;
  images: Array<{ id: string; order: number; fileName: string; mimeType: string }>;
}

export function ImageGallery({ recipeId, recipeTitle, images }: ImageGalleryProps) {
  // Defensive copy + sort. The API already returns ascending-by-order, but we
  // never rely on caller invariants for visual correctness. recipeTitle is
  // accepted by the contract for future hero-overlay use; not visually rendered
  // (alt text uses numbered scheme per UI-SPEC Accessibility Notes).
  void recipeTitle;
  const sorted = [...images].sort((a, b) => a.order - b.order);

  // We MUST call useState unconditionally (Rules of Hooks). Initialize with the
  // first image id when present; the empty-state branch ignores selectedId.
  const [selectedId, setSelectedId] = useState<string>(sorted[0]?.id ?? '');

  // WR-06: explicitly resync selectedId when the images prop changes (e.g. a
  // sibling SortableThumbnailStrip deletes the active image). Without this,
  // the Math.max(0, findIndex) fallback below silently snaps to the first
  // image — sensible behavior, but invisible from state and brittle to
  // future conditional refactors. The effect is a no-op while selectedId is
  // still valid, so re-renders from unrelated parent state don't churn it.
  useEffect(() => {
    if (sorted.length === 0) {
      if (selectedId !== '') setSelectedId('');
      return;
    }
    if (!sorted.some((i) => i.id === selectedId)) {
      setSelectedId(sorted[0].id);
    }
  }, [sorted, selectedId]);

  if (sorted.length === 0) {
    return (
      <div className="relative w-full h-64 md:h-96 rounded-lg border-dashed border-2 bg-secondary flex flex-col items-center justify-center text-muted-foreground mb-6">
        <ImageOff className="h-12 w-12 mb-3" />
        <h3 className="text-xl font-semibold">No photos yet</h3>
        <p className="text-base max-w-xs text-center mt-2">
          Add photos to help others follow along with ingredients, process, and the finished dish.
        </p>
      </div>
    );
  }

  // If the previously-selected id is no longer in the array (defensive), fall
  // back to the first image. selectedIndex is the 0-based index used in alt.
  const selectedIndex = Math.max(
    0,
    sorted.findIndex((i) => i.id === selectedId)
  );
  const activeId = sorted[selectedIndex].id;

  return (
    <div className="mb-6">
      <div className="relative w-full h-64 md:h-96 rounded-lg overflow-hidden mb-4">
        <Image
          src={`/api/recipes/${recipeId}/images/${activeId}`}
          alt={`Recipe photo ${selectedIndex + 1} of ${sorted.length}`}
          fill
          className="object-cover"
          priority
        />
      </div>

      <div className="flex gap-2 overflow-x-auto py-2">
        {sorted.map((image, index) => {
          const isActive = image.id === activeId;
          const isPrimary = image.order === 0;
          return (
            <button
              key={image.id}
              type="button"
              aria-label={`Show photo ${index + 1} of ${sorted.length}`}
              onClick={() => setSelectedId(image.id)}
              className={cn(
                'relative flex-shrink-0 rounded-sm overflow-hidden transition',
                isActive
                  ? 'ring-2 ring-primary ring-offset-2 opacity-100'
                  : 'opacity-80 hover:opacity-100'
              )}
            >
              <Image
                src={`/api/recipes/${recipeId}/images/${image.id}`}
                alt=""
                width={80}
                height={80}
                className="object-cover"
              />
              {isPrimary && (
                <span
                  className="absolute bottom-0 left-0 bg-primary text-primary-foreground text-xs font-semibold px-1 py-0.5 rounded-sm"
                  aria-label="Primary photo"
                >
                  Primary
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
