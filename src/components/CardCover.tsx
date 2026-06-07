'use client';

import '@/styles/card.css';
import type { Card, ProjectMeta } from '@/lib/types';

interface Props {
  card: Card;
  meta: ProjectMeta;
  isEditing: boolean;
  onTextChange?: (field: keyof Card, value: string) => void;
}

export default function CardCover({ card, meta, isEditing, onTextChange }: Props) {
  const editProps = (field: keyof Card) =>
    isEditing
      ? {
          contentEditable: true as const,
          suppressContentEditableWarning: true,
          onBlur: (e: React.FocusEvent<HTMLElement>) =>
            onTextChange?.(field, e.currentTarget.innerText),
          style: { cursor: 'text' } as React.CSSProperties,
        }
      : {};

  const textShadow = '0 2px 14px rgba(0,0,0,0.85), 0 1px 3px rgba(0,0,0,0.9)';

  return (
    <div className="card-container" style={{ position: 'relative' }}>
      {/* Background image */}
      {card.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.image_url} alt="" className="img-background" />
      )}

      {/* Top subtle darken for tag readability */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom, rgba(26,26,26,0.55) 0%, rgba(26,26,26,0.1) 22%, rgba(26,26,26,0) 45%, rgba(26,26,26,0.55) 70%, rgba(26,26,26,0.92) 100%)',
          zIndex: 1,
        }}
      />

      {/* Content */}
      <div
        className="card-padding"
        style={{ position: 'relative', zIndex: 2, justifyContent: 'space-between' }}
      >
        {/* Series tag */}
        <div className="series-tag" style={{ textShadow }}>
          {meta.series_tag}
        </div>

        {/* Headline block — anchored toward lower-middle */}
        <div style={{ marginTop: 'auto', marginBottom: 40 }}>
          <div className="card-headline" style={{ textShadow }} {...editProps('headline')}>
            {card.headline}
          </div>

          {card.subheadline && (
            <div
              className="card-subheadline"
              style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}
              {...editProps('subheadline')}
            >
              {card.subheadline}
            </div>
          )}

          <div className="card-divider" style={{ marginTop: 24, boxShadow: '0 0 8px rgba(0,0,0,0.6)' }} />
        </div>

        {/* Footer */}
        <div className="card-footer" style={{ marginTop: 0, paddingTop: 0 }}>
          <span className="cover-read-time" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
            {meta.read_time}
          </span>
          <span className="cover-account-name" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
            中泰观察局
          </span>
        </div>
      </div>
    </div>
  );
}
