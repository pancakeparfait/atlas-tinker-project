'use client';

import React from 'react';
import Image from 'next/image';
import { GripVertical, Trash2 } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import {
  useDeleteRecipeImage,
  useReorderRecipeImages,
  type RecipeImageMetadata,
} from '@/lib/queries/recipe-image-queries';

export interface SortableThumbnailStripProps {
  recipeId: string;
  images: Array<{ id: string; order: number; fileName: string; mimeType: string }>;
}

interface SortableThumbnailProps {
  image: RecipeImageMetadata;
  recipeId: string;
  onDelete: (imageId: string) => void;
}

function SortableThumbnail({ image, recipeId, onDelete }: SortableThumbnailProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const isPrimary = image.order === 0;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative flex-shrink-0 rounded-sm overflow-hidden',
        isDragging && 'opacity-90 scale-95 ring-2 ring-primary'
      )}
    >
      <button
        type="button"
        aria-label="Drag to reorder photos"
        className="absolute top-1 right-1 z-10 text-muted-foreground bg-white/80 rounded p-1 cursor-grab"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Remove photo"
        className="absolute top-1 left-1 z-10 bg-white/80 rounded-full p-2 hover:bg-white"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(image.id);
        }}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </button>
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
    </div>
  );
}

export function SortableThumbnailStrip({
  recipeId,
  images,
}: SortableThumbnailStripProps): React.JSX.Element {
  const sorted = [...images].sort((a, b) => a.order - b.order);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const deleteMutation = useDeleteRecipeImage();
  const reorderMutation = useReorderRecipeImages();

  function handleDelete(imageId: string) {
    if (window.confirm('Remove this photo from the recipe?')) {
      deleteMutation.mutate({ recipeId, imageId });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sorted.findIndex((i) => i.id === active.id);
    const newIndex = sorted.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(sorted, oldIndex, newIndex);
    reorderMutation.mutate({ recipeId, orderedIds: reordered.map((i) => i.id) });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={sorted.map((i) => i.id)}
        strategy={horizontalListSortingStrategy}
      >
        <div className="flex gap-2 overflow-x-auto py-2">
          {sorted.map((image) => (
            <SortableThumbnail
              key={image.id}
              image={image}
              recipeId={recipeId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
