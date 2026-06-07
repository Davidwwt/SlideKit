'use client';

import { useState } from 'react';
import CardRenderer from './CardRenderer';
import type { SlideKitProject, ImageGenerationStatus } from '@/lib/types';

interface Props {
  project: SlideKitProject;
  imageStatuses: ImageGenerationStatus[];
  onRegenerateImage: (cardId: number, imagePrompt: string, feedback?: string) => void;
  onConfirm: () => void;
  onBack: () => void;
}

const PREVIEW_SCALE = 0.38;
const CARD_W = 1080;
const CARD_H = 1440;
const previewW = Math.round(CARD_W * PREVIEW_SCALE);
const previewH = Math.round(CARD_H * PREVIEW_SCALE);

export default function ImageReview({
  project,
  imageStatuses,
  onRegenerateImage,
  onConfirm,
  onBack,
}: Props) {
  const [feedbacks, setFeedbacks] = useState<Record<number, string>>({});
  const { cards, meta } = project;
  const imageCards = cards.filter((c) => c.needs_image);
  const noImageCards = cards.filter((c) => !c.needs_image);

  const getStatus = (cardId: number): ImageGenerationStatus | undefined =>
    imageStatuses.find((s) => s.cardId === cardId);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#111',
        color: 'var(--card-cream)',
        fontFamily: '"Noto Sans SC", sans-serif',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: '#111',
          borderBottom: '1px solid #222',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: '1px solid #333',
              color: '#888',
              padding: '6px 14px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            ← 返回文案
          </button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--card-cream)' }}>
              确认配图
            </div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
              {imageCards.length} 张卡片需要配图
            </div>
          </div>
        </div>
        <button
          onClick={onConfirm}
          style={{
            background: 'var(--card-accent)',
            border: 'none',
            color: '#111',
            padding: '10px 20px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.03em',
          }}
        >
          确认配图，进入编辑 →
        </button>
      </div>

      {/* Image cards grid */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 100px' }}>
        {imageCards.length > 0 && (
          <>
            <div
              style={{
                fontSize: 12,
                color: '#555',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 24,
              }}
            >
              需要配图的卡片
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 32,
              }}
            >
              {imageCards.map((card, index) => {
                const status = getStatus(card.id);
                const cardIndex = cards.findIndex((c) => c.id === card.id);
                return (
                  <div
                    key={card.id}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
                  >
                    {/* Card label */}
                    <div style={{ fontSize: 13, color: '#666' }}>
                      卡片 {cardIndex + 1} · {card.headline.slice(0, 20)}
                      {card.headline.length > 20 ? '...' : ''}
                    </div>

                    {/* Card preview */}
                    <div
                      style={{
                        position: 'relative',
                        width: previewW,
                        height: previewH,
                        overflow: 'hidden',
                        borderRadius: 4,
                        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                      }}
                    >
                      <div
                        style={{
                          width: CARD_W,
                          height: CARD_H,
                          transform: `scale(${PREVIEW_SCALE})`,
                          transformOrigin: 'top left',
                        }}
                      >
                        <CardRenderer
                          card={card}
                          meta={meta}
                          cardIndex={cardIndex + 1}
                          totalCards={cards.length}
                          showActions={false}
                        />
                      </div>

                      {/* Generating overlay */}
                      {status?.status === 'generating' && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(17,17,17,0.7)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12,
                          }}
                        >
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              border: '2px solid #333',
                              borderTop: '2px solid var(--card-accent)',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite',
                            }}
                          />
                          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                          <span style={{ fontSize: 12, color: 'var(--card-accent)' }}>生成中...</span>
                        </div>
                      )}
                    </div>

                    {/* Status + feedback + regen button */}
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        gap: 8,
                        width: '100%',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <StatusBadge status={status} />
                      </div>
                      <textarea
                        value={feedbacks[card.id] ?? ''}
                        onChange={(e) =>
                          setFeedbacks((prev) => ({ ...prev, [card.id]: e.target.value }))
                        }
                        placeholder="（可选）修改意见：例如 更亮一些 / 去掉人物 / 改为俯视角..."
                        rows={2}
                        disabled={status?.status === 'generating'}
                        style={{
                          width: '100%',
                          background: '#0e0e0e',
                          border: '1px solid #2a2a2a',
                          borderRadius: 4,
                          color: 'var(--card-cream)',
                          fontFamily: '"Noto Sans SC", sans-serif',
                          fontSize: 12,
                          lineHeight: 1.5,
                          padding: '8px 10px',
                          resize: 'vertical',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      <button
                        onClick={() =>
                          onRegenerateImage(
                            card.id,
                            card.image_prompt!,
                            feedbacks[card.id]?.trim() || undefined
                          )
                        }
                        disabled={status?.status === 'generating'}
                        style={{
                          background: 'none',
                          border: '1px solid #333',
                          color: status?.status === 'generating' ? '#444' : '#888',
                          padding: '8px 14px',
                          borderRadius: 4,
                          cursor: status?.status === 'generating' ? 'default' : 'pointer',
                          fontSize: 12,
                          width: '100%',
                        }}
                      >
                        {status?.status === 'generating' ? '生成中...' : '重新生成配图'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* No-image cards reference list */}
        {noImageCards.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <div
              style={{
                fontSize: 12,
                color: '#555',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 16,
              }}
            >
              纯文字卡片（无需配图）
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {noImageCards.map((card) => {
                const cardIndex = cards.findIndex((c) => c.id === card.id);
                return (
                  <div
                    key={card.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 16px',
                      background: '#1a1a1a',
                      borderRadius: 4,
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: '#444', minWidth: 24 }}>{cardIndex + 1}</span>
                    <span style={{ color: 'var(--card-muted)' }}>{card.headline}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom confirm bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(17,17,17,0.95)',
          borderTop: '1px solid #222',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <button
          onClick={onConfirm}
          style={{
            background: 'var(--card-accent)',
            border: 'none',
            color: '#111',
            padding: '12px 36px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '0.03em',
          }}
        >
          确认配图，进入编辑 →
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ImageGenerationStatus | undefined }) {
  if (!status || status.status === 'pending') {
    return <span style={{ fontSize: 11, color: '#444' }}>等待中</span>;
  }
  if (status.status === 'generating') {
    return <span style={{ fontSize: 11, color: 'var(--card-accent)' }}>生成中...</span>;
  }
  if (status.status === 'done') {
    return <span style={{ fontSize: 11, color: '#6a9a6a' }}>✓ 已生成</span>;
  }
  return (
    <span style={{ fontSize: 11, color: '#c05050' }}>
      ✗ {status.errorMessage ?? '生成失败'}
    </span>
  );
}
