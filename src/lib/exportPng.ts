'use client';

export async function exportCardToPng(cardElement: HTMLElement, filename: string): Promise<void> {
  const html2canvas = (await import('html2canvas')).default;
  await document.fonts.ready;

  cardElement.classList.add('export-mode');

  try {
    const canvas = await html2canvas(cardElement, {
      scale: 1,
      width: 1080,
      height: 1440,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#1a1a1a',
      logging: false,
    });

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } finally {
    cardElement.classList.remove('export-mode');
  }
}

export async function exportAllCardsAsZip(
  cardElements: HTMLElement[],
  filenames: string[],
  zipName: string
): Promise<void> {
  const [{ default: html2canvas }, { default: JSZip }] = await Promise.all([
    import('html2canvas'),
    import('jszip'),
  ]);

  await document.fonts.ready;

  const zip = new JSZip();

  for (let i = 0; i < cardElements.length; i++) {
    const el = cardElements[i];
    el.classList.add('export-mode');
    try {
      const canvas = await html2canvas(el, {
        scale: 1,
        width: 1080,
        height: 1440,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#1a1a1a',
        logging: false,
      });

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
      });
      zip.file(filenames[i], blob);
    } finally {
      el.classList.remove('export-mode');
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.download = zipName;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
