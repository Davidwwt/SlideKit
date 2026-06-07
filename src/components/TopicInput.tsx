'use client';

import { useState } from 'react';
import ImageUploader from './ImageUploader';
import type { GenerateRequest } from '@/lib/types';

interface Props {
  onGenerate: (req: GenerateRequest) => void;
  isLoading: boolean;
}

export default function TopicInput({ onGenerate, isLoading }: Props) {
  const [topic, setTopic] = useState('');
  const [angle, setAngle] = useState('');
  const [volNumber, setVolNumber] = useState<number | ''>('');
  const [refPaths, setRefPaths] = useState<string[]>([]);
  const [showAngle, setShowAngle] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    onGenerate({
      topic: topic.trim(),
      angle: angle.trim() || undefined,
      vol_number: volNumber !== '' ? Number(volNumber) : undefined,
      reference_image_paths: refPaths,
    });
  };

  return (
    <div
      style={{
        maxWidth: 560,
        width: '100%',
        margin: '0 auto',
        padding: '48px 24px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <h1
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 28,
            fontWeight: 700,
            color: '#e0e0e0',
            letterSpacing: '-0.02em',
          }}
        >
          SlideKit
        </h1>
        <p style={{ marginTop: 8, color: '#666', fontSize: 14 }}>
          小红书图文卡片生成器 · 中泰观察局
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Topic */}
        <div>
          <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 8 }}>
            主题 *
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="例：Rally — 泰国本土包袋品牌崛起"
            required
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 6,
              color: '#e0e0e0',
              fontSize: 15,
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--card-accent)')}
            onBlur={(e) => (e.target.style.borderColor = '#333')}
          />
        </div>

        {/* Vol number */}
        <div>
          <label style={{ display: 'block', fontSize: 13, color: '#888', marginBottom: 8 }}>
            期数（留空自动递增）
          </label>
          <input
            type="number"
            value={volNumber}
            onChange={(e) => setVolNumber(e.target.value === '' ? '' : Number(e.target.value))}
            placeholder="例：12"
            min={1}
            style={{
              width: 120,
              padding: '12px 16px',
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 6,
              color: '#e0e0e0',
              fontSize: 15,
              outline: 'none',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--card-accent)')}
            onBlur={(e) => (e.target.style.borderColor = '#333')}
          />
        </div>

        {/* Angle toggle */}
        <div>
          <button
            type="button"
            onClick={() => setShowAngle((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--card-accent)',
              fontSize: 13,
              cursor: 'pointer',
              padding: 0,
              textDecoration: 'underline',
            }}
          >
            {showAngle ? '− 隐藏切入角度' : '+ 设置切入角度（可选）'}
          </button>
          {showAngle && (
            <input
              type="text"
              value={angle}
              onChange={(e) => setAngle(e.target.value)}
              placeholder="例：为什么泰国年轻人不再追LV而买Rally"
              style={{
                width: '100%',
                marginTop: 10,
                padding: '12px 16px',
                background: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: 6,
                color: '#e0e0e0',
                fontSize: 14,
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--card-accent)')}
              onBlur={(e) => (e.target.style.borderColor = '#333')}
            />
          )}
        </div>

        {/* Reference images */}
        <ImageUploader onUpload={setRefPaths} />

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading || !topic.trim()}
          style={{
            marginTop: 8,
            padding: '14px 24px',
            background: isLoading || !topic.trim() ? '#333' : 'var(--card-accent)',
            color: isLoading || !topic.trim() ? '#666' : '#1a1a1a',
            border: 'none',
            borderRadius: 6,
            fontSize: 15,
            fontWeight: 600,
            cursor: isLoading || !topic.trim() ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          {isLoading ? '生成中...' : '生成卡片组'}
        </button>
      </form>
    </div>
  );
}
