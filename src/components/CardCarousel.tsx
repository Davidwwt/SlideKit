'use client';

import { useState, useCallback, useRef } from 'react';
import type { Card, SlideKitProject } from '@/lib/types';
import CardRenderer from './CardRenderer';

interface Props {
  project: SlideKitProject;
  onProjectUpdate: (updated: SlideKitProject) => void;
  onBack: () => void;
  referenceImagePaths?: string[];
}

const PREVIEW_SCALE = 0.38;
const CARD_W = 1080;
const CARD_H = 1440;

export default function CardCarousel({ project, onProjectUpdate, onBack, referenceImagePaths = [] }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const exportRefs = useRef<(HTMLDivElement | null)[]>([]);

  const cards = project.cards;
  const total = cards.length;

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      await new Promise<void>((r) => setTimeout(r, 300));

      const elements = exportRefs.current.filter((el): el is HTMLDivElement => el !== null);
      if (elements.length === 0) return;

      const seriesSlug = project.meta.series_tag.replace(/\s+/g, '_');
      const filenames = elements.map(
        (_, i) => `${seriesSlug}_${String(i + 1).padStart(2, '0')}.png`
      );
      const { exportAllCardsAsZip } = await import('@/lib/exportPng');
      await exportAllCardsAsZip(elements, filenames, `${seriesSlug}.zip`);
    } catch (err) {
      console.error('Export failed', err);
      alert('导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCardUpdate = useCallback(
    (index: number, updatedCard: Card) => {
      const newCards = [...cards];
      newCards[index] = updatedCard;
      onProjectUpdate({ ...project, cards: newCards });
    },
    [cards, project, onProjectUpdate]
  );

  const handleRegenerate = async (index: number) => {
    const card = cards[index];
    setRegeneratingId(card.id);

    try {
      const summary = cards
        .map((c, i) => `Card ${i + 1} (${c.type}): ${c.headline}`)
        .join('\n');

      const res = await fetch('/api/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.project_id,
          card_id: card.id,
          context: {
            topic: project.meta.topic,
            all_cards_summary: summary,
            reference_image_paths: referenceImagePaths,
          },
        }),
      });

      if (!res.ok) throw new Error('Regeneration failed');
      const data = await res.json();
      handleCardUpdate(index, data.card);
    } catch (err) {
      console.error(err);
      alert('重新生成失败，请重试');
    } finally {
      setRegeneratingId(null);
    }
  };

  const previewW = Math.round(CARD_W * PREVIEW_SCALE);
  const previewH = Math.round(CARD_H * PREVIEW_SCALE);

  return (
    <div style={{ minHeight: '100vh', padding: '24px', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 32,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: '1px solid #333',
            color: '#888',
            padding: '8px 16px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          ← 返回
        </button>

        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#e0e0e0', fontSize: 15, fontWeight: 600 }}>
            {project.meta.series_tag}
          </div>
          <div style={{ color: '#666', fontSize: 13, marginTop: 2 }}>
            {project.meta.topic}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ color: '#888', fontSize: 14 }}>
            {activeIndex + 1} / {total}
          </div>
          <button
            onClick={handleExportAll}
            disabled={isExporting}
            style={{
              background: isExporting ? '#333' : 'var(--card-accent)',
              color: isExporting ? '#666' : '#111',
              border: 'none',
              padding: '8px 18px',
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 700,
              cursor: isExporting ? 'default' : 'pointer',
              letterSpacing: '0.02em',
            }}
          >
            {isExporting ? '打包中...' : '⬇ 下载全部卡片'}
          </button>
        </div>
      </div>

      {/* Main card display */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* Prev arrow */}
          <button
            onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
            disabled={activeIndex === 0}
            style={{
              background: 'none',
              border: 'none',
              color: activeIndex === 0 ? '#333' : '#888',
              fontSize: 24,
              cursor: activeIndex === 0 ? 'default' : 'pointer',
              padding: '8px 12px',
            }}
          >
            ‹
          </button>

          {/* Card */}
          <div style={{ position: 'relative' }}>
            {regeneratingId === cards[activeIndex]?.id && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.7)',
                  zIndex: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--card-accent)',
                  fontSize: 14,
                  borderRadius: 4,
                }}
              >
                重新生成中...
              </div>
            )}

            <div
              style={{
                width: previewW,
                height: previewH,
                overflow: 'hidden',
                borderRadius: 4,
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
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
                  key={cards[activeIndex]?.id}
                  card={cards[activeIndex]}
                  meta={project.meta}
                  cardIndex={activeIndex + 1}
                  totalCards={total}
                  onCardUpdate={(updated) => handleCardUpdate(activeIndex, updated)}
                  onRegenerate={() => handleRegenerate(activeIndex)}
                />
              </div>
            </div>
          </div>

          {/* Next arrow */}
          <button
            onClick={() => setActiveIndex((i) => Math.min(total - 1, i + 1))}
            disabled={activeIndex === total - 1}
            style={{
              background: 'none',
              border: 'none',
              color: activeIndex === total - 1 ? '#333' : '#888',
              fontSize: 24,
              cursor: activeIndex === total - 1 ? 'default' : 'pointer',
              padding: '8px 12px',
            }}
          >
            ›
          </button>
        </div>
      </div>

      {/* Thumbnail strip */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'center',
          marginTop: 24,
          overflowX: 'auto',
          padding: '8px 0',
        }}
      >
        {cards.map((card, i) => {
          const thumbScale = 0.1;
          const thumbW = Math.round(CARD_W * thumbScale);
          const thumbH = Math.round(CARD_H * thumbScale);
          return (
            <button
              key={card.id}
              onClick={() => setActiveIndex(i)}
              style={{
                border: `2px solid ${i === activeIndex ? 'var(--card-accent)' : '#333'}`,
                borderRadius: 3,
                overflow: 'hidden',
                cursor: 'pointer',
                padding: 0,
                background: '#1a1a1a',
                width: thumbW,
                height: thumbH,
                flexShrink: 0,
                transition: 'border-color 0.15s',
              }}
            >
              <div
                style={{
                  width: CARD_W,
                  height: CARD_H,
                  transform: `scale(${thumbScale})`,
                  transformOrigin: 'top left',
                  background: 'linear-gradient(160deg, #1a1a1a 0%, #2d2520 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{ color: 'var(--card-accent)', fontSize: 120, fontFamily: 'Georgia, serif' }}
                >
                  {i + 1}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Off-screen export container — renders all cards at full size when exporting */}
      {isExporting && (
        <div
          style={{
            position: 'fixed',
            left: -99999,
            top: 0,
            width: CARD_W,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          {cards.map((card, i) => (
            <div
              key={`export-${card.id}`}
              ref={(el) => {
                exportRefs.current[i] = el;
              }}
              style={{ width: CARD_W, height: CARD_H, position: 'relative' }}
            >
              <CardRenderer
                card={card}
                meta={project.meta}
                cardIndex={i + 1}
                totalCards={total}
                showActions={false}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
