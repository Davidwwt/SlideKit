'use client';

import { useState } from 'react';
import type { Card, SlideKitProject } from '@/lib/types';

interface Props {
  project: SlideKitProject;
  onConfirm: (editedCards: Card[]) => void;
  onBack: () => void;
}

const CARD_TYPE_LABELS: Record<Card['type'], string> = {
  cover: '封面',
  intro: '引言',
  analysis: '分析',
  trend: '趋势',
  summary: '总结',
  cta: '行动召唤',
};

export default function CopyReview({ project, onConfirm, onBack }: Props) {
  const [cards, setCards] = useState<Card[]>(project.cards);
  const [expandedPrompts, setExpandedPrompts] = useState<Set<number>>(new Set());

  const updateCard = (cardId: number, field: keyof Card, value: string) => {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, [field]: value } : c))
    );
  };

  const updateBullet = (cardId: number, index: number, value: string) => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        const bullets = [...(c.bullet_points ?? [])];
        bullets[index] = value;
        return { ...c, bullet_points: bullets };
      })
    );
  };

  const addBullet = (cardId: number) => {
    setCards((prev) =>
      prev.map((c) =>
        c.id === cardId ? { ...c, bullet_points: [...(c.bullet_points ?? []), ''] } : c
      )
    );
  };

  const removeBullet = (cardId: number, index: number) => {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c;
        const bullets = [...(c.bullet_points ?? [])];
        bullets.splice(index, 1);
        return { ...c, bullet_points: bullets };
      })
    );
  };

  const togglePrompt = (cardId: number) => {
    setExpandedPrompts((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

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
            ← 返回
          </button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--card-cream)' }}>
              确认文案
            </div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
              {project.meta.series_tag} · {cards.length} 张卡片
            </div>
          </div>
        </div>
        <button
          onClick={() => onConfirm(cards)}
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
          确认文案，生成配图 →
        </button>
      </div>

      {/* Card list */}
      <div
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '24px 24px 80px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {cards.map((card, index) => (
          <div
            key={card.id}
            style={{
              background: 'var(--card-bg-dark)',
              border: '1px solid #2a2a2a',
              borderRadius: 8,
              padding: 24,
            }}
          >
            {/* Card header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 20,
              }}
            >
              <span style={{ fontSize: 13, color: '#555' }}>卡片 {index + 1}</span>
              <span
                style={{
                  fontSize: 12,
                  color: 'var(--card-muted)',
                  background: '#1e1e1e',
                  padding: '2px 8px',
                  borderRadius: 3,
                }}
              >
                {CARD_TYPE_LABELS[card.type]}
              </span>
              {card.needs_image ? (
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--card-accent)',
                    background: 'rgba(200,149,108,0.12)',
                    border: '1px solid rgba(200,149,108,0.3)',
                    padding: '2px 8px',
                    borderRadius: 3,
                  }}
                >
                  需要配图
                </span>
              ) : (
                <span
                  style={{
                    fontSize: 11,
                    color: '#555',
                    background: '#1a1a1a',
                    padding: '2px 8px',
                    borderRadius: 3,
                  }}
                >
                  无需配图
                </span>
              )}
            </div>

            {/* Headline */}
            <Field label="标题">
              <textarea
                value={card.headline}
                onChange={(e) => updateCard(card.id, 'headline', e.target.value)}
                rows={2}
                style={textareaStyle}
              />
            </Field>

            {/* Subheadline */}
            {card.subheadline !== null && (
              <Field label="副标题">
                <textarea
                  value={card.subheadline ?? ''}
                  onChange={(e) => updateCard(card.id, 'subheadline', e.target.value)}
                  rows={2}
                  style={textareaStyle}
                />
              </Field>
            )}

            {/* Body */}
            {card.body !== null && (
              <Field label="正文">
                <textarea
                  value={card.body ?? ''}
                  onChange={(e) => updateCard(card.id, 'body', e.target.value)}
                  rows={4}
                  style={textareaStyle}
                />
              </Field>
            )}

            {/* Bullet points */}
            {card.bullet_points !== null && (
              <Field label="要点列表">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(card.bullet_points ?? []).map((bullet, bi) => (
                    <div key={bi} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--card-accent)', paddingTop: 8, fontSize: 12 }}>
                        ·
                      </span>
                      <textarea
                        value={bullet}
                        onChange={(e) => updateBullet(card.id, bi, e.target.value)}
                        rows={1}
                        style={{ ...textareaStyle, flex: 1 }}
                      />
                      <button
                        onClick={() => removeBullet(card.id, bi)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#555',
                          cursor: 'pointer',
                          fontSize: 16,
                          paddingTop: 6,
                          lineHeight: 1,
                        }}
                        title="删除"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addBullet(card.id)}
                    style={{
                      background: 'none',
                      border: '1px dashed #333',
                      color: '#555',
                      padding: '4px 10px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 12,
                      alignSelf: 'flex-start',
                      marginTop: 4,
                    }}
                  >
                    + 添加要点
                  </button>
                </div>
              </Field>
            )}

            {/* Data callout */}
            {card.data_callout !== null && (
              <Field label="数据亮点">
                <textarea
                  value={card.data_callout ?? ''}
                  onChange={(e) => updateCard(card.id, 'data_callout', e.target.value)}
                  rows={2}
                  style={textareaStyle}
                />
              </Field>
            )}

            {/* Footer note */}
            {card.footer_note !== null && (
              <Field label="页脚注释">
                <textarea
                  value={card.footer_note ?? ''}
                  onChange={(e) => updateCard(card.id, 'footer_note', e.target.value)}
                  rows={1}
                  style={textareaStyle}
                />
              </Field>
            )}

            {/* Image prompt (collapsible) */}
            {card.needs_image && card.image_prompt !== null && (
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={() => togglePrompt(card.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#555',
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ color: expandedPrompts.has(card.id) ? 'var(--card-accent)' : '#555' }}>
                    {expandedPrompts.has(card.id) ? '▾' : '▸'}
                  </span>
                  编辑图片提示词
                </button>
                {expandedPrompts.has(card.id) && (
                  <div style={{ marginTop: 8 }}>
                    <textarea
                      value={card.image_prompt ?? ''}
                      onChange={(e) => updateCard(card.id, 'image_prompt', e.target.value)}
                      rows={3}
                      style={{ ...textareaStyle, fontSize: 12, color: 'var(--card-muted)' }}
                      placeholder="图片生成提示词..."
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
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
          onClick={() => onConfirm(cards)}
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
          确认文案，生成配图 →
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 11,
          color: '#555',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

const textareaStyle: React.CSSProperties = {
  width: '100%',
  background: '#0e0e0e',
  border: '1px solid #2a2a2a',
  borderRadius: 4,
  color: 'var(--card-cream)',
  fontFamily: '"Noto Sans SC", sans-serif',
  fontSize: 14,
  lineHeight: 1.6,
  padding: '8px 12px',
  resize: 'vertical',
  outline: 'none',
  boxSizing: 'border-box',
};
