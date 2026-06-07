'use client';

import { useState } from 'react';
import TopicInput from '@/components/TopicInput';
import CardCarousel from '@/components/CardCarousel';
import LoadingScreen from '@/components/LoadingScreen';
import CopyReview from '@/components/CopyReview';
import ImageReview from '@/components/ImageReview';
import type {
  AppState,
  Card,
  GenerateRequest,
  ImageGenerationStatus,
  LoadingStatus,
  SlideKitProject,
} from '@/lib/types';

const COPY_LOADING_STEPS: LoadingStatus[] = [
  { step: 'researching', message: '正在研究主题...' },
  { step: 'writing', message: '正在撰写卡片文案...' },
  { step: 'assembling', message: '正在整理卡片结构...' },
];

const IMAGE_LOADING_STEPS: LoadingStatus[] = [
  { step: 'generating_images', message: '正在生成封面配图...' },
  { step: 'generating_images', message: '正在生成内容配图...' },
  { step: 'assembling', message: '正在合并图片...' },
];

export default function Home() {
  const [appState, setAppState] = useState<AppState>('input');
  const [project, setProject] = useState<SlideKitProject | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [imageStatuses, setImageStatuses] = useState<ImageGenerationStatus[]>([]);
  const [refPaths, setRefPaths] = useState<string[]>([]);

  const handleGenerateCopy = async (req: GenerateRequest) => {
    setAppState('loading_copy');
    setError(null);
    setLoadingStep(0);
    setRefPaths(req.reference_image_paths ?? []);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => Math.min(prev + 1, COPY_LOADING_STEPS.length - 1));
    }, 8000);

    try {
      const res = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `请求失败 (${res.status})`);
      }

      const data: SlideKitProject = await res.json();
      setProject(data);
      setAppState('copy_review');
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      setAppState('input');
    } finally {
      clearInterval(stepInterval);
    }
  };

  const handleConfirmCopy = async (editedCards: Card[]) => {
    if (!project) return;

    const updatedProject = { ...project, cards: editedCards };
    setProject(updatedProject);

    const statuses: ImageGenerationStatus[] = editedCards
      .filter((c) => c.needs_image)
      .map((c) => ({ cardId: c.id, status: 'pending' as const }));
    setImageStatuses(statuses);

    setAppState('loading_images');
    setLoadingStep(0);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => Math.min(prev + 1, IMAGE_LOADING_STEPS.length - 1));
    }, 8000);

    try {
      const res = await fetch('/api/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.project_id, cards: editedCards, reference_image_paths: refPaths }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `请求失败 (${res.status})`);
      }

      const data: { cards: Card[] } = await res.json();

      const mergedCards = updatedProject.cards.map((card) => {
        const updated = data.cards.find((c) => c.id === card.id);
        return updated ? { ...card, image_url: updated.image_url } : card;
      });

      setProject({ ...updatedProject, cards: mergedCards });
      setImageStatuses(statuses.map((s) => ({ ...s, status: 'done' as const })));
      setAppState('image_review');
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
      setAppState('copy_review');
    } finally {
      clearInterval(stepInterval);
    }
  };

  const handleRegenerateImage = async (cardId: number, imagePrompt: string, feedback?: string) => {
    if (!project) return;

    setImageStatuses((prev) =>
      prev.map((s) => (s.cardId === cardId ? { ...s, status: 'generating' as const } : s))
    );

    try {
      const res = await fetch('/api/regenerate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.project_id,
          card_id: cardId,
          image_prompt: imagePrompt,
          feedback,
          reference_image_paths: refPaths,
        }),
      });

      if (!res.ok) throw new Error('重新生成失败');

      const data: { card_id: number; image_url: string } = await res.json();

      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cards: prev.cards.map((c) =>
            c.id === data.card_id ? { ...c, image_url: data.image_url } : c
          ),
        };
      });

      setImageStatuses((prev) =>
        prev.map((s) => (s.cardId === cardId ? { ...s, status: 'done' as const } : s))
      );
    } catch (err) {
      setImageStatuses((prev) =>
        prev.map((s) =>
          s.cardId === cardId
            ? { ...s, status: 'error' as const, errorMessage: err instanceof Error ? err.message : '生成失败' }
            : s
        )
      );
    }
  };

  const handleConfirmImages = () => {
    setAppState('editor');
  };

  if (appState === 'loading_copy') {
    return <LoadingScreen steps={COPY_LOADING_STEPS} currentStep={loadingStep} title="正在生成文案" />;
  }

  if (appState === 'copy_review' && project) {
    return (
      <CopyReview
        project={project}
        onConfirm={handleConfirmCopy}
        onBack={() => setAppState('input')}
      />
    );
  }

  if (appState === 'loading_images') {
    return <LoadingScreen steps={IMAGE_LOADING_STEPS} currentStep={loadingStep} title="正在生成配图" />;
  }

  if (appState === 'image_review' && project) {
    return (
      <ImageReview
        project={project}
        imageStatuses={imageStatuses}
        onRegenerateImage={handleRegenerateImage}
        onConfirm={handleConfirmImages}
        onBack={() => setAppState('copy_review')}
      />
    );
  }

  if (appState === 'editor' && project) {
    return (
      <CardCarousel
        project={project}
        onProjectUpdate={setProject}
        onBack={() => setAppState('input')}
        referenceImagePaths={refPaths}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
      <div style={{ width: '100%' }}>
        {error && (
          <div
            style={{
              maxWidth: 560,
              margin: '24px auto 0',
              padding: '12px 16px',
              background: 'rgba(220,60,60,0.1)',
              border: '1px solid rgba(220,60,60,0.3)',
              borderRadius: 6,
              color: '#ff8080',
              fontSize: 14,
            }}
          >
            ⚠ {error}
          </div>
        )}
        <TopicInput onGenerate={handleGenerateCopy} isLoading={false} />
        <footer
          style={{
            marginTop: 48,
            paddingBottom: 24,
            textAlign: 'center',
            fontSize: 13,
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          produced by Claude x David
        </footer>
      </div>
    </div>
  );
}
