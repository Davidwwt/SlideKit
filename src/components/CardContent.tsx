'use client';

import '@/styles/card.css';
import type { Card, ProjectMeta } from '@/lib/types';

interface Props {
  card: Card;
  meta: ProjectMeta;
  cardIndex: number;
  totalCards: number;
  isEditing: boolean;
  onTextChange?: (field: keyof Card, value: string) => void;
  onBulletChange?: (index: number, value: string) => void;
}

export default function CardContent({
  card,
  meta,
  cardIndex,
  totalCards,
  isEditing,
  onTextChange,
  onBulletChange,
}: Props) {
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

  const hasTopImage = card.image_url && card.image_placement === 'top_half';
  const hasSideImage = card.image_url && card.image_placement === 'side';

  return (
    <div className="card-container">
      <div className="card-padding">
        {/* Headline */}
        <div className="card-headline-sm" {...editProps('headline')}>
          {card.headline}
        </div>

        <div className="card-divider" />

        {/* Top half image */}
        {hasTopImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.image_url!} alt="" className="img-top-half" />
        )}

        {/* Main content area — fills remaining space, centered vertically */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 18,
            overflow: 'hidden',
          }}
        >
          {hasSideImage ? (
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={card.image_url!} alt="" className="img-side" />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {card.body && (
                  <p className="card-body" {...editProps('body')}>
                    {card.body}
                  </p>
                )}
              </div>
            </div>
          ) : (
            card.body && (
              <p className="card-body" {...editProps('body')}>
                {card.body}
              </p>
            )
          )}

          {/* Data callout */}
          {card.data_callout && (
            <div className="data-callout" style={{ margin: 0 }} {...editProps('data_callout')}>
              {card.data_callout}
            </div>
          )}

          {/* Bullet points */}
          {card.bullet_points && card.bullet_points.length > 0 && (
            <ul className="bullet-list" style={{ margin: 0 }}>
              {card.bullet_points.map((pt, i) => (
                <li
                  key={i}
                  contentEditable={isEditing ? true : undefined}
                  suppressContentEditableWarning
                  onBlur={
                    isEditing
                      ? (e) => onBulletChange?.(i, e.currentTarget.innerText)
                      : undefined
                  }
                  style={isEditing ? { cursor: 'text' } : undefined}
                >
                  {pt}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="card-footer">
          <span className="card-footer-note" {...editProps('footer_note')}>
            {card.footer_note || ''}
          </span>
          <span className="card-page-number">
            {cardIndex} / {totalCards}
          </span>
        </div>
      </div>
    </div>
  );
}
