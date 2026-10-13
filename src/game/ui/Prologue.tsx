import { useEffect, useRef, useState } from 'react';

import { PROLOGUE } from '@/content/story';

import { ASSET_URLS } from '../assets';
import './Prologue.css';

export function Prologue({ onDone }: { onDone: () => void }) {
  const [panel, setPanel] = useState(0);
  const next = useRef<HTMLButtonElement>(null);
  const finished = useRef(false);
  const done = () => {
    if (finished.current) return;
    finished.current = true;
    onDone();
  };
  useEffect(() => { next.current?.focus({ preventScroll: true }); }, []);
  const page = PROLOGUE[panel];
  return (
    <section className="gu-story" data-testid="prologue" role="dialog" aria-modal="true" aria-label="Kannan’s story"
      onKeyDown={e => {
        if (e.key === 'Escape') done();
        if (e.key === 'Tab') {
          e.preventDefault();
          const skip = e.currentTarget.querySelector<HTMLButtonElement>('[data-testid="story-skip"]');
          (document.activeElement === next.current ? skip : next.current)?.focus();
        }
      }}>
      <button ref={next} type="button" className="gu-story-panel" data-testid="story-next"
        aria-label={panel === PROLOGUE.length - 1 ? 'Finish story' : 'Next panel'}
        onClick={() => panel === PROLOGUE.length - 1 ? done() : setPanel(panel + 1)}>
        <img key={panel} className="gu-story-art" src={ASSET_URLS[page.sprite]} alt="" draggable={false} />
        <span className="gu-story-caption gu-chip" data-testid="story-caption" aria-live="polite">{page.caption}</span>
        <span className="gu-story-hint gu-chip">{panel + 1} / {PROLOGUE.length} · Tap to {panel === PROLOGUE.length - 1 ? 'finish' : 'continue'}</span>
      </button>
      <button type="button" className="gu-btn gu-story-skip" data-testid="story-skip" onClick={done}>Skip</button>
    </section>
  );
}
