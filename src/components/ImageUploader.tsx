'use client';

import { useCallback, useRef, useState } from 'react';

interface Props {
  onUpload: (paths: string[]) => void;
}

// Downscale large images client-side to avoid upload failures on mobile networks.
// Reference images only need enough detail for Gemini to match product appearance,
// so 1280px long-edge JPEG quality 0.82 is plenty (~200-400 KB per image).
async function compressImage(file: File, maxEdge = 1280, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/')) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const { width, height } = bitmap;
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality)
  );
  if (!blob) return file;

  // Only use the compressed version if it's actually smaller
  if (blob.size >= file.size) return file;

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
}

export default function ImageUploader({ onUpload }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const allowed = files
        .filter((f) => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type))
        .slice(0, 5);

      if (allowed.length === 0) {
        setError('仅支持 JPG / PNG / WEBP 格式');
        return;
      }

      setUploading(true);
      setError(null);

      try {
        const compressed = await Promise.all(allowed.map((f) => compressImage(f)));

        const form = new FormData();
        compressed.forEach((f) => form.append('images', f));

        const res = await fetch('/api/upload-ref', { method: 'POST', body: form });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `上传失败 (${res.status})`);
        }

        const data = await res.json();

        if (Array.isArray(data.paths) && data.paths.length > 0) {
          onUpload(data.paths);
          setPreviews(allowed.map((f) => URL.createObjectURL(f)));
        } else {
          setError('没有文件被接受（请检查文件类型和大小）');
        }
      } catch (err) {
        console.error('Upload failed', err);
        setError(err instanceof Error ? err.message : '上传失败');
      } finally {
        setUploading(false);
      }
    },
    [onUpload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        ['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
      );
      uploadFiles(files);
    },
    [uploadFiles]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      uploadFiles(Array.from(e.target.files));
    }
  };

  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 8 }}>
        参考图片（可选，最多 5 张）
      </label>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragging ? 'var(--card-accent)' : '#333'}`,
          borderRadius: 8,
          padding: '24px 16px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'border-color 0.2s',
          background: isDragging ? 'rgba(200,149,108,0.05)' : 'transparent',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />
        <div style={{ color: '#666', fontSize: 13, pointerEvents: 'none' }}>
          {uploading ? '上传中...' : '拖拽图片到此处，或点击选择'}
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#ff8080' }}>
          ⚠ {error}
        </div>
      )}

      {/* Preview thumbnails */}
      {previews.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          {previews.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt={`ref ${i + 1}`}
              style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 4, border: '1px solid #333' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
