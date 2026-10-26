'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { addToCard } from '@/lib/actions-a4';

const RUST = '#C8743A';
const MAX_MS = 60000;
const MAX_BYTES = 6 * 1024 * 1024;
const fmt = (ms) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function Bars({ n = 28, w = 4, h = 40, animate = true }) {
  return (
    <span aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 3, height: h, flexGrow: animate ? 0 : 1, overflow: 'hidden' }}>
      {Array.from({ length: n }).map((_, i) => <span key={i} className={animate ? 'a4-w' : ''} style={{ width: w, flexShrink: 0, height: 8 + ((i * 41) % (h - 10)), borderRadius: 2, background: 'var(--inv-bg, #000)', animationDelay: `${-(i * 0.11)}s` }} />)}
    </span>
  );
}

// The organiser or a collaborator adds to the surprise card: a note (with an optional photo), a voice note or a video.
export default function Recorder({ slug, name, initialMode = 'card', me }) {
  const [mode, setMode] = useState(initialMode);
  const [step, setStep] = useState('ask'); // ask | rec | done
  const [err, setErr] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [blobUrl, setBlobUrl] = useState('');
  const [dataUri, setDataUri] = useState('');
  const [state, action, pending] = useActionState(addToCard, null);
  const rec = useRef(null), stream = useRef(null), chunks = useRef([]), timer = useRef(null), live = useRef(null), started = useRef(0);
  const video = mode === 'video';

  const stopAll = () => {
    clearInterval(timer.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  useEffect(() => () => stopAll(), []);
  useEffect(() => { stopAll(); setStep('ask'); setErr(''); setBlobUrl(''); setDataUri(''); }, [mode]);

  async function start() {
    setErr('');
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('unsupported');
      const s = await navigator.mediaDevices.getUserMedia(video ? { audio: true, video: { width: 480, height: 640, facingMode: 'user' } } : { audio: true });
      stream.current = s;
      const opts = {};
      if (video) opts.videoBitsPerSecond = 500000;
      opts.audioBitsPerSecond = 64000;
      const r = new MediaRecorder(s, opts);
      chunks.current = [];
      r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data); };
      r.onstop = () => {
        const blob = new Blob(chunks.current, { type: r.mimeType || (video ? 'video/webm' : 'audio/webm') });
        stopAll();
        if (blob.size > MAX_BYTES) { setErr('That one is over 6MB. Try a shorter one.'); setStep('ask'); return; }
        setBlobUrl(URL.createObjectURL(blob));
        const fr = new FileReader();
        fr.onload = () => setDataUri(String(fr.result));
        fr.readAsDataURL(blob);
        setStep('done');
      };
      rec.current = r;
      r.start(500);
      started.current = Date.now();
      setElapsed(0);
      setStep('rec');
      timer.current = setInterval(() => {
        const ms = Date.now() - started.current;
        setElapsed(ms);
        if (ms >= MAX_MS) stop();
      }, 250);
      setTimeout(() => { if (live.current && video) { live.current.srcObject = s; live.current.play().catch(() => {}); } }, 0);
    } catch (e) {
      setErr(e?.message === 'unsupported' ? 'This browser cannot record here. Try Safari or Chrome on your phone.' : `insidejoke needs your ${video ? 'camera and mic' : 'mic'} for this. Allow it in your browser and try again.`);
      setStep('ask');
    }
  }
  function stop() { if (rec.current && rec.current.state !== 'inactive') rec.current.stop(); clearInterval(timer.current); }

  const steps = mode === 'card' ? ['Write', 'Add a photo', 'Add to card'] : [`Allow ${video ? 'camera' : 'mic'}`, 'Record', 'Add to card'];
  const at = mode === 'card' ? 0 : ['ask', 'rec', 'done'].indexOf(step);
  // r4: Option 10 board offers voice and video; the note tab shows only when asked for (?mode=card).
  const M = initialMode === 'card' ? [['card', 'Note'], ['voice', 'Voice note'], ['video', 'Video']] : [['voice', 'Voice note'], ['video', 'Video']];

  return (
    <>
      <section role="radiogroup" aria-label="Kind of message" style={{ margin: '22px 20px 0', display: 'flex', border: '2px solid var(--edge, #000)', borderRadius: 999, overflow: 'hidden' }}>
        {M.map(([k, l]) => (
          <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => setMode(k)} style={{ flex: '1 1 0', border: 0, background: mode === k ? 'var(--inv-bg, #000)' : 'transparent', color: mode === k ? 'var(--inv-fg, #fff)' : 'var(--ink, #000)', fontFamily: 'inherit', fontWeight: 800, fontSize: 15, padding: '12px 0', cursor: 'pointer' }}>{l}</button>
        ))}
      </section>
      <ol aria-label="Steps" style={{ listStyle: 'none', margin: '18px 20px 0', padding: 0, display: 'flex', gap: 6 }}>
        {steps.map((l, i) => (
          <li key={l} style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: 6 }}><span style={{ height: 4, borderRadius: 999, background: i <= at ? RUST : 'rgba(0,0,0,0.15)' }} /><span style={{ fontSize: 12, fontWeight: 700, color: i <= at ? 'var(--ink, #000)' : '#4A5A7A' }}>{l}</span></li>
        ))}
      </ol>

      {mode === 'card' ? (
        <form action={action} className="a4-up" style={{ margin: '18px 16px 0', background: 'var(--surface, #fff)', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input type="hidden" name="slug" value={slug} /><input type="hidden" name="kind" value="card" />
          <label htmlFor="cardbody" className="wide" style={{ fontSize: 12, letterSpacing: '0.16em', color: RUST }}>Your note · {me}</label>
          <textarea id="cardbody" name="body" rows={4} maxLength={500} placeholder={`Happy birthday, ${name}…`} style={{ border: '2px solid var(--line, #000)', fontFamily: "'EB Garamond', serif", fontSize: 20, lineHeight: 1.3, padding: 12, resize: 'none', borderRadius: 0, color: 'var(--ink, #000)' }} />
          <label className="a3-photo" style={{ border: '2px dashed var(--line, #000)', fontWeight: 800, fontSize: 14, padding: 18, textAlign: 'center', cursor: 'pointer' }}>
            Add a photo (optional)
            <input type="file" name="photo" accept="image/*" aria-label="Add a photo" />
          </label>
          {state?.error ? <div className="err">{state.error}</div> : null}
          <button disabled={pending} style={{ border: 0, background: RUST, color: 'var(--inv-fg, #fff)', fontFamily: 'inherit', fontWeight: 800, fontSize: 16, padding: 15, borderRadius: 999, cursor: 'pointer' }}>{pending ? 'Adding…' : 'Add to the card'}</button>
        </form>
      ) : null}

      {mode !== 'card' && step === 'ask' ? (
        <section className="a4-up" style={{ margin: '18px 16px 0', background: 'var(--surface, #fff)', padding: '22px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ width: 56, height: 56, borderRadius: '50%', background: RUST, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--inv-fg, #fff)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={video ? 'M3 7h12v10H3Z M15 11l6-4v10l-6-4' : 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3Z M5 11a7 7 0 0 0 14 0 M12 18v3'} /></svg></span>
          <p style={{ margin: 0, fontSize: 21, lineHeight: 1.2, letterSpacing: '-0.01em' }}>{video ? 'To record a video, insidejoke needs your camera and mic.' : 'To record a voice note, insidejoke needs your mic.'}</p>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45, color: 'var(--sub, #2A2A2A)' }}>Your browser will ask next. We only use it while you record, and you can redo it as many times as you like.</p>
          {err ? <div className="err">{err}</div> : null}
          <button type="button" onClick={start} style={{ border: 0, background: 'var(--inv-bg, #000)', color: 'var(--inv-fg, #fff)', fontFamily: 'inherit', fontWeight: 800, fontSize: 16, padding: 15, borderRadius: 999, cursor: 'pointer' }}>Continue</button>
        </section>
      ) : null}

      {mode !== 'card' && step === 'rec' ? (
        <section className="a4-up" style={{ margin: '18px 16px 0', background: 'var(--surface, #fff)', padding: '22px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          {video ? (
            <div style={{ position: 'relative', width: '100%', height: 300, background: 'var(--dk, #13286B)', overflow: 'hidden' }}>
              <video ref={live} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
              <span style={{ position: 'absolute', left: 10, top: 10, display: 'flex', alignItems: 'center', gap: 6, background: 'var(--inv-bg, #000)', color: 'var(--inv-fg, #fff)', fontSize: 12, fontWeight: 700, padding: '4px 8px' }}><span className="a4-blink" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--dk, #E2452B)' }} />REC</span>
            </div>
          ) : null}
          <span className="dot" role="timer" style={{ fontSize: 54, color: RUST }}>{fmt(elapsed)}</span>
          <Bars />
          <span style={{ position: 'relative', width: 84, height: 84, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="a4-pulse" aria-hidden="true" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--dk, #E2452B)' }} />
            <button type="button" onClick={stop} aria-label="Stop recording" style={{ position: 'relative', width: 84, height: 84, borderRadius: '50%', border: 0, background: 'var(--dk, #E2452B)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><span style={{ width: 26, height: 26, borderRadius: 4, background: 'var(--surface, #fff)' }} /></button>
          </span>
          <span style={{ fontSize: 13, color: 'var(--muted, #4A4A4A)' }}>Up to 60 seconds</span>
        </section>
      ) : null}

      {mode !== 'card' && step === 'done' ? (
        <form action={action} className="a4-up" style={{ margin: '18px 16px 0', background: 'var(--surface, #fff)', padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input type="hidden" name="slug" value={slug} /><input type="hidden" name="kind" value={mode} /><input type="hidden" name="media" value={dataUri} />
          <span className="wide" style={{ fontSize: 12, letterSpacing: '0.16em', color: RUST }}>{video ? 'Your video' : 'Your voice note'} · {me}</span>
          {video ? <video src={blobUrl} controls playsInline style={{ width: '100%', maxHeight: 320, background: 'var(--dk, #13286B)' }} /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--ground, #ECECEF)', padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Bars w={3} h={28} animate={false} /><span className="dot" style={{ fontSize: 15 }}>{fmt(elapsed)}</span></div>
              <audio src={blobUrl} controls style={{ width: '100%', height: 32 }} />
            </div>
          )}
          {state?.error ? <div className="err">{state.error}</div> : null}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={start} style={{ flex: '1 1 0', border: '2px solid var(--edge, #000)', background: 'transparent', fontFamily: 'inherit', fontWeight: 800, fontSize: 15, padding: '13px 0', borderRadius: 999, cursor: 'pointer', color: 'var(--ink, #000)' }}>Re-record</button>
            <button disabled={pending || !dataUri} style={{ flex: '1 1 0', border: 0, background: RUST, color: 'var(--inv-fg, #fff)', fontFamily: 'inherit', fontWeight: 800, fontSize: 15, padding: '15px 0', borderRadius: 999, cursor: 'pointer' }}>{pending ? 'Adding…' : 'Add to the card'}</button>
          </div>
        </form>
      ) : null}
    </>
  );
}
