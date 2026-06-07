'use client';

import { useRef, useState } from 'react';
import type { Card, ProjectMeta } from '@/lib/types';
import CardCover from './CardCover';
import CardContent from './CardContent';
import CardCTA from './CardCTA';

interface Props {
  card: Card;
  meta: ProjectMeta;
  cardIndex: number;
  totalCards: number;
  onCardUpdate?: (updatedCard: Card) => void;
  onRegenerate?: () => void;
  showActions?: boolean;
}

export default function CardRenderer({
  card,
  meta,
  cardIndex,
  totalCards,
  onCardUpdate,
  onRegenerate,
  showActions = true,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTextChange = (field: keyof Card, value: string) => {
    onCardUpdate?.({ ...card, [field]: value });
  };

  const handleBulletChange = (index: number, value: string) => {
    const newBullets = [...(card.bullet_points || [])];
    newBullets[index] = value;
    onCardUpdate?.({ ...card, bullet_points: newBullets });
  };

  const handleExport = async () => {
    if (!cardRef.current) return;
    const { exportCardToPng } = await import('@/lib/exportPng');
    const seriesSlug = meta.series_tag.replace(/\s+/g, '_');
    await exportCardToPng(cardRef.current, `${seriesSlug}_${cardIndex}.png`);
  };

  const cardProps = {
    card,
    meta,
    isEditing,
    onTextChange: handleTextChange,
    onBulletChange: handleBulletChange,
  };

  return (
    <div
      className="card-preview-wrapper relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Action bar */}
      {showActions && (isHovered || isEditing) && (
        <div
          className="card-actions"
          style={{
            position: 'absolute',
            top: -44,
            left: 0,
            right: 0,
            display: 'flex',
            gap: 8,
            zIndex: 10,
          }}
        >
          <button
            onClick={() => setIsEditing((v) => !v)}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              background: isEditing ? 'var(--card-accent)' : 'rgba(200,149,108,0.15)',
              color: isEditing ? '#1a1a1a' : 'var(--card-accent)',
              border: '1px solid var(--card-accent)',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            {isEditing ? '完成编辑' : '编辑'}
          </button>
          <button
            onClick={onRegenerate}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              background: 'rgba(255,255,255,0.05)',
              color: '#ccc',
              border: '1px solid #444',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            重新生成
          </button>
          <button
            onClick={handleExport}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              background: 'rgba(255,255,255,0.05)',
              color: '#ccc',
              border: '1px solid #444',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            导出 PNG
          </button>
        </div>
      )}

      {/* Card */}
      <div ref={cardRef}>
        {card.type === 'cover' ? (
          <CardCover {...cardProps} />
        ) : card.type === 'cta' ? (
          <CardCTA {...cardProps} />
        ) : (
          <CardContent {...cardProps} cardIndex={cardIndex} totalCards={totalCards} />
        )}
      </div>
    </div>
  );
}
