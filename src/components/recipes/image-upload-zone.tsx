'use client';

import React, { useRef, useState } from 'react';
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUploadRecipeImages } from '@/lib/queries/recipe-image-queries';
import { IMAGE_CONFIG } from '@/lib/storage/storage-adapter';

export interface ImageUploadZoneProps {
  recipeId: string;
  disabled?: boolean;
}

type FileRowStatus = 'pending' | 'uploading' | 'done' | 'error';

interface FileRow {
  id: string;
  fileName: string;
  status: FileRowStatus;
  error?: string;
}

function validateClientSide(file: File): { ok: true } | { ok: false; error: string } {
  if (file.size > IMAGE_CONFIG.maxSizeBytes) {
    return { ok: false, error: 'Photo must be under 10MB' };
  }
  if (
    !IMAGE_CONFIG.allowedMimeTypes.includes(
      file.type as (typeof IMAGE_CONFIG.allowedMimeTypes)[number]
    )
  ) {
    return { ok: false, error: 'Only JPEG, PNG, WebP, and GIF are supported' };
  }
  return { ok: true };
}

export function ImageUploadZone({ recipeId, disabled }: ImageUploadZoneProps): React.JSX.Element {
  const [isDragOver, setIsDragOver] = useState(false);
  const [rows, setRows] = useState<FileRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadRecipeImages();

  async function handleFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    const valid: File[] = [];
    const newRows: FileRow[] = [];
    for (const f of incoming) {
      const v = validateClientSide(f);
      const id = `${f.name}-${Date.now()}-${Math.random()}`;
      if (v.ok) {
        valid.push(f);
        newRows.push({ id, fileName: f.name, status: 'uploading' });
      } else {
        newRows.push({ id, fileName: f.name, status: 'error', error: v.error });
      }
    }
    setRows((prev) => [...prev, ...newRows]);
    if (valid.length === 0) return;
    try {
      await uploadMutation.mutateAsync({ recipeId, files: valid });
      setRows((prev) =>
        prev.map((row) =>
          valid.some((f) => f.name === row.fileName) && row.status === 'uploading'
            ? { ...row, status: 'done' }
            : row
        )
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Upload failed. Check your connection and try again.';
      setRows((prev) =>
        prev.map((row) =>
          row.status === 'uploading' ? { ...row, status: 'error', error: message } : row
        )
      );
    }
  }

  const validRowsInFlight = rows.filter(
    (r) => r.status === 'uploading' || r.status === 'done'
  ).length;
  const doneCount = rows.filter((r) => r.status === 'done').length;

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload recipe photos"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        className={cn(
          'border-dashed border-2 rounded-lg p-6 min-h-[120px] bg-secondary flex flex-col items-center justify-center text-muted-foreground',
          isDragOver ? 'border-primary bg-primary/10' : 'border-border',
          disabled && 'opacity-50 pointer-events-none'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          hidden
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <Upload className="h-6 w-6 mb-2" />
        <p className="text-sm font-medium">
          {isDragOver
            ? 'Drop to add photos'
            : uploadMutation.isPending
              ? `Uploading photo ${doneCount + 1} of ${validRowsInFlight}…`
              : 'Drag photos here, or click to browse'}
        </p>
      </div>

      {rows.length > 0 && (
        <ul className="space-y-2" aria-live="polite">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-2 text-sm">
              {row.status === 'done' && (
                <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden />
              )}
              {row.status === 'error' && (
                <AlertCircle className="h-4 w-4 text-destructive" aria-hidden />
              )}
              <span className="truncate flex-1">{row.fileName}</span>
              {row.status === 'error' && row.error && (
                <span className="text-destructive">{row.error}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
