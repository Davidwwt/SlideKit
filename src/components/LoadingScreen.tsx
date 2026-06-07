'use client';

import type { LoadingStatus } from '@/lib/types';

interface Props {
  steps: LoadingStatus[];
  currentStep: number;
  title?: string;
}

export default function LoadingScreen({ steps, currentStep, title }: Props) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          border: '3px solid #333',
          borderTop: '3px solid var(--card-accent)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {title && (
        <div style={{ fontSize: 16, color: '#888', letterSpacing: '0.05em' }}>{title}</div>
      )}

      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {steps.map((step, i) => (
          <div
            key={`${step.step}-${i}`}
            style={{
              fontSize: 14,
              color:
                i < currentStep ? '#555' : i === currentStep ? 'var(--card-accent)' : '#333',
              transition: 'color 0.3s',
            }}
          >
            {i < currentStep ? '✓ ' : i === currentStep ? '→ ' : '  '}
            {step.message}
          </div>
        ))}
      </div>
    </div>
  );
}
