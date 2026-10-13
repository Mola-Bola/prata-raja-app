// Only the renderer's game frame is captured: form fields and account UI stay out of feedback.
type Capture = (done: (image: HTMLImageElement | null) => void) => void;
let provider: Capture | null = null;

export function installCapture(next: Capture): () => void {
  provider = next;
  return () => { if (provider === next) provider = null; };
}

export function captureGame(): Promise<string | null> {
  const capture = provider;
  if (!capture) return Promise.resolve(null);
  return new Promise(resolve => {
    let finished = false;
    const finish = (value: string | null) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), 1200);
    try {
      capture(image => {
        if (finished) return;
        try {
          if (!image || !image.width || !image.height) return finish(null);
          const scale = Math.min(1, 480 / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) return finish(null);
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          const jpeg = canvas.toDataURL('image/jpeg', 0.65);
          finish(jpeg.startsWith('data:image/jpeg;base64,') && jpeg.length <= 180_000 ? jpeg : null);
        } catch { finish(null); }
      });
    } catch { finish(null); }
  });
}
