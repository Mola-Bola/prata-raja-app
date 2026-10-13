import { useCallback, useEffect, useRef, useState } from 'react';
import { uuid } from '@/data/bytes';
import type { DeviceState } from '../deviceState';
import { BODY_MAX, FAIL_TEXT, listNotes, noteStatus, pairOwner, replyToNote, type DevicePair, type SavedNote, type SendResult } from '../feedback';

export function FeedbackNotes({ identity, secretSaved, onBusy }: { identity: DeviceState | null; secretSaved: boolean; onBusy: (busy: boolean) => void }) {
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [owner, setOwner] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const pair = identity?.secret && secretSaved ? { device_id: identity.id, device_secret: identity.secret } : null;
  const pairId = pair?.device_id;
  const pairSecret = pair?.device_secret;

  const refresh = useCallback(async () => {
    if (!pairId || !pairSecret) {
      setError('Private notes need a saved device key. Allow browser storage and reopen the game to try again.');
      return;
    }
    const result = await listNotes({ device_id: pairId, device_secret: pairSecret });
    if (!alive.current) return;
    if (result.ok) { setNotes(result.notes); setOwner(result.owner); setLoaded(true); setError(''); }
    else setError(FAIL_TEXT[result.reason]);
  }, [pairId, pairSecret]);

  const run = useCallback(async (action: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true; setBusy(true); onBusy(true);
    try { await action(); }
    finally { locked.current = false; if (alive.current) { setBusy(false); onBusy(false); } }
  }, [onBusy]);

  useEffect(() => { void run(refresh); }, [refresh, run]);

  const confirmOwner = () => run(async () => {
    if (!pair || !code.trim()) return;
    const result = await pairOwner(pair, code);
    if (!alive.current) return;
    if (result.ok) { setOwner(true); setCode(''); setError(''); await refresh(); }
    else setError(result.reason === 'rejected' ? 'That owner code wasn’t accepted. Check it and try again.' : FAIL_TEXT[result.reason]);
  });

  return <div className="fb-notes" data-testid="feedback-notes">
    <div className="fb-notes-head">
      <p className="fb-context">Notes sent from this device.</p>
      <button type="button" className="fb-chip" data-testid="feedback-refresh" disabled={busy || !pair} onClick={() => void run(refresh)}>Refresh</button>
    </div>
    {busy && <p role="status" className="fb-context">Connecting…</p>}
    {error && <p role="alert" className="fb-status fb-status--bad" data-testid="feedback-notes-error">{error}</p>}
    {owner ? <p className="fb-status fb-status--ok" data-testid="feedback-owner-confirmed">Owner confirmed. Your notes are directions for the fleet.</p> : <details className="fb-pair">
      <summary>Pair this owner device</summary>
      <p className="fb-context">Enter the private owner code to confirm this device with the server.</p>
      <label className="fb-from"><span>Owner code</span><input type="password" className="fb-input ph-no-capture" data-testid="feedback-owner-code" value={code} maxLength={256} autoComplete="off" spellCheck={false} readOnly={busy} onChange={e => setCode(e.target.value)} /></label>
      <button type="button" className="gu-btn gu-btn--wide" data-testid="feedback-owner-pair" disabled={busy || !pair || !code.trim()} onClick={() => void confirmOwner()}>Confirm owner</button>
    </details>}
    {loaded && !notes.length && <p className="fb-context">No notes yet. Write one to start a thread.</p>}
    {notes.map(note => <details className="fb-note" key={note.id} data-testid={`feedback-note-${note.id}`}>
      <summary><span className="fb-note-body">{note.body}</span><span className="fb-note-status">{noteStatus(note)}</span><span className="fb-note-reference">Note {note.id.slice(-8)}</span></summary>
      {note.plan && <p className="fb-note-body"><b>The plan: </b>{note.plan}</p>}
      <div className="fb-messages" aria-label="Note thread">
        {note.messages.map(message => <p className="fb-note-body" key={message.id}><b>{message.author_label}: </b>{message.body}</p>)}
      </div>
      {pair && <Reply key={note.id} note={note} pair={pair} disabled={busy} run={run} refresh={refresh} />}
    </details>)}
  </div>;
}

function Reply({ note, pair, disabled, run, refresh }: { note: SavedNote; pair: DevicePair; disabled: boolean; run: (action: () => Promise<void>) => Promise<void>; refresh: () => Promise<void> }) {
  const [body, setBody] = useState('');
  const [result, setResult] = useState<SendResult | null>(null);
  const id = useRef<string | null>(null);
  const send = () => run(async () => {
    if (!body.trim()) return;
    id.current ??= uuid();
    const answer = await replyToNote(pair, note.id, id.current, body);
    setResult(answer);
    if (answer.ok) { setBody(''); id.current = null; await refresh(); }
  });
  return <div className="fb-reply">
    <label className="fb-from"><span>Your reply</span><textarea className="fb-text" aria-label="Your reply" data-testid={`feedback-reply-${note.id}`} rows={3} maxLength={BODY_MAX} value={body} readOnly={disabled} onChange={e => { setBody(e.target.value); id.current = null; setResult(null); }} /></label>
    {result && <p role={result.ok ? 'status' : 'alert'} className="fb-context">{result.ok ? 'Reply sent.' : FAIL_TEXT[result.reason]}</p>}
    <button type="button" className="gu-btn gu-btn--primary gu-btn--wide" data-testid={`feedback-reply-send-${note.id}`} disabled={disabled || !body.trim()} onClick={() => void send()}>{result && !result.ok ? 'Retry reply' : 'Send reply'}</button>
  </div>;
}
