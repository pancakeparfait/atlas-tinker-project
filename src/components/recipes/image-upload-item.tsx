'use client'

import React from 'react'
import { Check, X, Loader2 } from 'lucide-react'

interface ImageUploadItemProps {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
  onRetry?: () => void
}

export default function ImageUploadItem({
  file,
  progress,
  status,
  error,
  onRetry,
}: ImageUploadItemProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
      {/* Status Icon */}
      <div className="flex-shrink-0">
        {status === 'uploading' && (
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        )}
        {status === 'success' && <Check className="h-5 w-5 text-green-500" />}
        {status === 'error' && <X className="h-5 w-5 text-red-500" />}
        {status === 'pending' && (
          <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
        )}
      </div>

      {/* File Info */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{file.name}</div>
        <div className="text-xs text-gray-500">{formatSize(file.size)}</div>

        {/* Progress Bar */}
        {status === 'uploading' && (
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Error Message */}
        {status === 'error' && error && (
          <div className="mt-1 text-xs text-red-500">{error}</div>
        )}
      </div>

      {/* Retry Button */}
      {status === 'error' && onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-primary hover:underline"
        >
          Retry
        </button>
      )}
    </div>
  )
}
