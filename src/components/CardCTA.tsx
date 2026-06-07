'use client';

import '@/styles/card.css';
import type { Card, ProjectMeta } from '@/lib/types';

interface Props {
  card: Card;
  meta: ProjectMeta;
  isEditing: boolean;
  onTextChange?: (field: keyof Card, value: string) => void;
}

export default function CardCTA({ card, meta, isEditing, onTextChange }: Props) {
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

  return (
    <div className="card-container">
      <div
        className="card-padding"
        style={{ justifyContent: 'center', alignItems: 'center', gap: 0 }}
      >
        {/* Top decorative line */}
        <div
          style={{
            width: 56,
            height: 3,
            background: 'var(--card-accent)',
            marginBottom: 32,
          }}
        />

        {/* Main headline */}
        <div className="cta-main" {...editProps('headline')}>
          {card.headline}
        </div>

        <div style={{ height: 20 }} />

        {/* Subheadline - follow prompt */}
        {card.subheadline && (
          <div className="cta-follow" {...editProps('subheadline')}>
            {card.subheadline}
          </div>
        )}

        {/* Body */}
        {card.body && (
          <div
            className="cta-follow"
            style={{ fontSize: 22, marginTop: 12, color: 'var(--card-cream)', opacity: 0.85 }}
            {...editProps('body')}
          >
            {card.body}
          </div>
        )}

        <div className="card-divider-full" style={{ margin: '28px 0' }} />

        {/* Next topic teaser */}
        {card.data_callout && (
          <div className="cta-teaser" {...editProps('data_callout')}>
            {card.data_callout}
          </div>
        )}

        <div style={{ height: 20 }} />

        {/* Series tag */}
        <div className="series-tag" style={{ textAlign: 'center' }}>
          {meta.series_tag}
        </div>

        {/* Bottom decorative */}
        <div
          style={{
            width: 56,
            height: 3,
            background: 'var(--card-accent)',
            marginTop: 20,
          }}
        />
      </div>
    </div>
  );
}
