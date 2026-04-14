'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ImageUploadItem from './image-upload-item'

interface UploadingFile {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'success' | 'error'
  error?: string
}

interface ImageUploadProps {
  recipeId: string
  onUploadComplete?: () => void
}

export default function ImageUpload({
  recipeId,
  onUploadComplete,
}: ImageUploadProps) {
  const [files, setFiles] = useState<UploadingFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(
    async (uploadingFile: UploadingFile) => {
      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        const formData = new FormData()
        formData.append('image', uploadingFile.file)

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100)
            setFiles((prev) =>
              prev.map((f) =>
                f.id === uploadingFile.id ? { ...f, progress: percent } : f
              )
            )
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === uploadingFile.id ? { ...f, status: 'success' } : f
              )
            )
            resolve()
          } else {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === uploadingFile.id
                  ? { ...f, status: 'error', error: 'Upload failed' }
                  : f
              )
            )
            reject(new Error('Upload failed'))
          }
        }

        xhr.onerror = () => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadingFile.id
                ? { ...f, status: 'error', error: 'Network error' }
                : f
            )
          )
          reject(new Error('Network error'))
        }

        xhr.open('POST', `/api/recipes/${recipeId}/images`)
        xhr.send(formData)
      })
    },
    [recipeId]
  )

  const handleFiles = useCallback(
    (newFiles: FileList | null) => {
      if (!newFiles) return

      const uploadingFiles: UploadingFile[] = Array.from(newFiles).map(
        (file) => ({
          id: crypto.randomUUID(),
          file,
          progress: 0,
          status: 'uploading' as const,
        })
      )

      setFiles((prev) => [...prev, ...uploadingFiles])

      // Upload each file
      uploadingFiles.forEach((uploadingFile) => {
        uploadFile(uploadingFile)
          .catch(() => {
            // Error handled in uploadFile
          })
          .finally(() => {
            onUploadComplete?.()
          })
      })
    },
    [uploadFile, onUploadComplete]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleRetry = (fileId: string) => {
    const file = files.find((f) => f.id === fileId)
    if (file) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: 'uploading', progress: 0, error: undefined }
            : f
        )
      )
      uploadFile({ ...file, status: 'uploading', progress: 0 }).catch(() => {})
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors
          ${isDragOver ? 'border-primary bg-primary/5' : 'border-gray-300 bg-gray-50'}
          cursor-pointer hover:border-primary/50`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Upload className="mx-auto mb-2 h-8 w-8 text-gray-400" />
        <p className="text-sm text-gray-600">
          Drop images here or click to browse
        </p>
        <p className="mt-1 text-xs text-gray-400">
          JPEG, PNG, WebP, GIF • Max 10MB
        </p>
      </div>

      {/* Upload List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <ImageUploadItem
              key={file.id}
              file={file.file}
              progress={file.progress}
              status={file.status}
              error={file.error}
              onRetry={() => handleRetry(file.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
