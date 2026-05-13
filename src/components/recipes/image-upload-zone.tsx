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

// WR-04: deterministic, per-batch unique id generator. crypto.randomUUID is
// available in modern browsers and node; the counter fallback keeps tests and
// older environments working without injecting Math.random entropy.
let rowIdCounter = 0;
function nextRowId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  rowIdCounter += 1;
  return `row-${Date.now()}-${rowIdCounter}`;
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
  // WR-01 / WR-02: per-batch tracking. We record the row ids that belong to
  // each in-flight batch so success/error transitions only touch that batch's
  // rows. Without this, batches A and B both touching the same `uploading`
  // state would clobber each other on completion.
  const [activeBatchIds, setActiveBatchIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadRecipeImages();

  async function handleFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList);
    const valid: { file: File; rowId: string }[] = [];
    const newRows: FileRow[] = [];
    for (const f of incoming) {
      const v = validateClientSide(f);
      const id = nextRowId();
      if (v.ok) {
        valid.push({ file: f, rowId: id });
        newRows.push({ id, fileName: f.name, status: 'uploading' });
      } else {
        newRows.push({ id, fileName: f.name, status: 'error', error: v.error });
      }
    }
    setRows((prev) => [...prev, ...newRows]);
    if (valid.length === 0) return;

    // WR-01 / WR-02: scope state transitions to THIS batch's rows.
    const batchRowIds = new Set(valid.map((v) => v.rowId));
    // Map fileName -> rowId for THIS batch so CR-03 can resolve server-side
    // failures back to the originating row even when the user uploads the
    // same filename across separate batches.
    const batchFileToRow = new Map<string, string>();
    for (const v of valid) {
      // Last writer wins for duplicate names within a single batch; this is
      // acceptable because the server keys partial failures off file name.
      batchFileToRow.set(v.file.name, v.rowId);
    }
    setActiveBatchIds((prev) => {
      const next = new Set(prev);
      for (const id of batchRowIds) next.add(id);
      return next;
    });

    try {
      // CR-03: honor the server's `failed` array. Files the server rejected
      // (oversize, bad MIME, corrupt header) must be flipped to 'error' even
      // though the overall POST returned 201.
      const result = await uploadMutation.mutateAsync({
        recipeId,
        files: valid.map((v) => v.file),
      });
      const failedByRow = new Map<string, string>();
      for (const f of result.failed ?? []) {
        const rowId = batchFileToRow.get(f.fileName);
        if (rowId) failedByRow.set(rowId, f.error);
      }
      setRows((prev) =>
        prev.map((row) => {
          if (!batchRowIds.has(row.id)) return row;
          if (row.status !== 'uploading') return row;
          if (failedByRow.has(row.id)) {
            return {
              ...row,
              status: 'error',
              error: failedByRow.get(row.id) ?? 'Upload rejected',
            };
          }
          return { ...row, status: 'done' };
        })
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Upload failed. Check your connection and try again.';
      // WR-02: only flip THIS batch's rows to error. A concurrent batch's
      // rows that are also in 'uploading' state are left alone.
      setRows((prev) =>
        prev.map((row) =>
          batchRowIds.has(row.id) && row.status === 'uploading'
            ? { ...row, status: 'error', error: message }
            : row
        )
      );
    } finally {
      setActiveBatchIds((prev) => {
        const next = new Set(prev);
        for (const id of batchRowIds) next.delete(id);
        return next;
      });
    }
  }

  // WR-01: progress copy reads from the active batches, not the cumulative
  // rows array. Otherwise prior batches' `done` rows keep inflating the
  // denominator across sessions.
  const inFlightRows = rows.filter((r) => activeBatchIds.has(r.id));
  const validRowsInFlight = inFlightRows.length;
  const doneCount = inFlightRows.filter((r) => r.status === 'done').length;

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
