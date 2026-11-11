'use client';
// Photos here are local blob: URLs, which next/image can't optimise.
/* eslint-disable @next/next/no-img-element */

import { PageNav } from '@/components/PageNav';
import { GmcLogo } from '@/components/GmcLogo';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SHOTS_PER_CHAMBER, chambers, isChamber, type Chamber } from './chambers';
import { buildCollection } from './compose';
import { PHOTO_H, PHOTO_W, canvasToBlob, loadImage } from './frame';
import { frameById, frames, prepareFrames, renderFramed, type Assets, type FrameDef, type FrameInfo } from './frames';
import { clearAll, loadAll, saveChamber } from './store';
import { buildChamberCard } from './strip';
import styles from './photo.module.css';

/** `single`: retake just that photo (0-based) instead of the whole chamber. */
type View = { kind: 'hub' } | { kind: 'shoot'; chamber: Chamber; single?: number } | { kind: 'result' };

const BACK_KEY = 'mindu-photo-back-url';

function loadBackToMindu(): string | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('back');
    if (fromUrl && /^https?:\/\//.test(fromUrl)) sessionStorage.setItem(BACK_KEY, fromUrl);
    return sessionStorage.getItem(BACK_KEY);
  } catch {
    return null;
  }
}

export function PhotoBooth() {
  const [shots, setShots] = useState<Record<string, Blob[]>>({});
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<View>({ kind: 'hub' });
  const [startPlace, setStartPlace] = useState<string | undefined>();
  // The chamber tab the visitor chose; kept while they shoot or view the collection.
  const [picked, setPicked] = useState<string | null>(null);
  // Opened from the Mindu kiosk guide (?back=<url>): the header link returns there.
  const [backToMindu, setBackToMindu] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    // ?place=chamberN comes from the map's camera button.
    const startPlace = new URLSearchParams(window.location.search).get('place') ?? undefined;
    const back = loadBackToMindu();
    loadAll().then(all => {
      if (!alive) return;
      setBackToMindu(back);
      setShots(all);
      setLoaded(true);
      setStartPlace(startPlace);
      // Coming from a chamber's camera button: go straight to the camera
      // unless that chamber already has its photos.
      if (isChamber(startPlace) && !(all[startPlace]?.length)) {
        setView({ kind: 'shoot', chamber: chambers.find(c => c.id === startPlace)! });
      }
    });
    return () => { alive = false; };
  }, []);

  const finishChamber = async (chamber: Chamber, photos: Blob[], single?: number) => {
    let next = photos;
    if (single !== undefined) {
      next = [...(shots[chamber.id] ?? [])];
      next[single] = photos[0];
    }
    setShots(prev => ({ ...prev, [chamber.id]: next }));
    setView({ kind: 'hub' });
    await saveChamber(chamber.id, next);
  };

  const startOver = async () => {
    if (!window.confirm('Delete all your photos and start a new collection?')) return;
    await clearAll();
    setShots({});
    setView({ kind: 'hub' });
  };

  return (
    <div className={styles.page}>
      {view.kind === 'shoot' && (
        <Shoot
          chamber={view.chamber}
          single={view.single}
          onDone={p => finishChamber(view.chamber, p, view.single)}
          onCancel={() => setView({ kind: 'hub' })}
        />
      )}
      {view.kind === 'hub' && <PageNav back={backToMindu} />}
      {view.kind === 'hub' && (
        <Hub
          shots={shots}
          loaded={loaded}
          focus={startPlace}
          picked={picked}
          onPick={setPicked}
          onShoot={(chamber, single) => { setPicked(chamber.id); setView({ kind: 'shoot', chamber, single }); }}
          onBuild={() => setView({ kind: 'result' })}
          onStartOver={startOver}
        />
      )}
      {view.kind === 'result' && <Result shots={shots} onBack={() => setView({ kind: 'hub' })} />}
    </div>
  );
}

/* ---------------------------------------------------------------- hub */

const pad2 = (n: string) => n.padStart(2, '0');

/**
 * Compact layout: chamber tabs, one chamber card at a time (tap a slot to shoot),
 * and a bar under it with progress, Start over and Make collection.
 */
function Hub({ shots, loaded, focus, picked, onPick, onShoot, onBuild, onStartOver }: {
  shots: Record<string, Blob[]>;
  loaded: boolean;
  focus?: string;
  picked: string | null;
  onPick: (id: string) => void;
  onShoot: (c: Chamber, single?: number) => void;
  onBuild: () => void;
  onStartOver: () => void;
}) {
  const urls = useObjectUrls(shots);
  const doneCount = chambers.filter(c => shots[c.id]?.length).length;
  const photoCount = chambers.reduce((n, c) => n + (shots[c.id]?.length ?? 0), 0);
  const total = chambers.length * SHOTS_PER_CHAMBER;

  // Open on the chamber the visitor came from, else the first one still to shoot.
  const activeId = picked
    ?? (isChamber(focus) ? focus : undefined)
    ?? chambers.find(c => !shots[c.id]?.length)?.id
    ?? chambers[0].id;
  const active = chambers.find(c => c.id === activeId) ?? chambers[0];
  const photos = urls[active.id] ?? [];

  const [saving, setSaving] = useState(false);
  const saveChamberCard = async () => {
    const blobs = shots[active.id];
    if (!blobs?.length) return;
    setSaving(true);
    try {
      const card = await buildChamberCard(active, blobs);
      const url = URL.createObjectURL(card);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gmc-chamber-${active.number}-${active.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.jpg`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.hub}>
      <header className={styles.hubHead}>
        <GmcLogo />
      </header>

      <div className={styles.intro}>
        <div className={styles.introTop}>
          <span className={styles.eyebrow}>Photo collection</span>
          <span className={styles.counter}>{photoCount}/{total} photos</span>
        </div>
        <h1>Capture your journey</h1>
        <p>Take {SHOTS_PER_CHAMBER} photos in each chamber. We put them together into one collection, ready to share.</p>
      </div>

      <div className={styles.tabs} role="tablist" aria-label="Chambers">
        {chambers.map(c => {
          const done = (shots[c.id]?.length ?? 0) >= SHOTS_PER_CHAMBER;
          const on = c.id === active.id;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={on}
              className={`${styles.tab} ${on ? styles.tabOn : ''}`}
              onClick={() => onPick(c.id)}
            >
              <span className={`${styles.tabNum} ${done ? styles.tabDone : ''}`}>{done ? '✓' : c.number}</span>
              <span className={styles.tabText}>{c.name}</span>
            </button>
          );
        })}
      </div>

      <section className={styles.chamberCard} role="tabpanel" aria-label={active.name}>
        <div className={styles.chamberHead}>
          <div>
            <span className={styles.chamberEyebrow}>Chamber {pad2(active.number)}</span>
            <strong>{active.name}</strong>
          </div>
          <span className={styles.counter}>{photos.length}/{SHOTS_PER_CHAMBER}</span>
        </div>

        <div className={styles.slots}>
          {Array.from({ length: SHOTS_PER_CHAMBER }, (_, i) => (
            photos[i] ? (
              <button
                key={i}
                type="button"
                className={styles.slot}
                onClick={() => onShoot(active, i)}
                disabled={!loaded}
                aria-label={`Retake photo ${i + 1}`}
                title="Retake this photo"
              >
                <img src={photos[i]} alt="" />
                <span className={styles.slotRetake} aria-hidden>↻</span>
              </button>
            ) : (
              <button key={i} type="button" className={`${styles.slot} ${styles.slotEmpty}`} onClick={() => onShoot(active)} disabled={!loaded}>
                <svg viewBox="0 0 24 24" aria-hidden><path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3v10.5H4z" /><circle cx="12" cy="13.5" r="3.4" /></svg>
                <span>Photo {i + 1}</span>
                <small>Tap to shoot</small>
              </button>
            )
          ))}
        </div>

        {photos.length > 0 && (
          <div className={styles.cardActions}>
            <button type="button" className={styles.ghostBtn} onClick={saveChamberCard} disabled={saving}>
              {saving ? 'Saving…' : '⤓ Save chamber'}
            </button>
            <button type="button" className={styles.ghostBtn} onClick={() => onShoot(active)} disabled={!loaded}>↻ Retake all</button>
          </div>
        )}
      <div className={styles.bottomBar}>
        <div className={styles.bottomInner}>
          <div className={styles.bottomInfo}>
            <div>
              <strong>Collection progress</strong>
              <small>{doneCount} of {chambers.length} chambers complete</small>
            </div>
          </div>
          {photoCount > 0 && <button type="button" className={styles.linkBtn} onClick={onStartOver}>Start over</button>}
          <div className={styles.collectionProgress} role="progressbar" aria-label="Photo collection progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={photoCount}>
            <span style={{ width: `${photoCount / total * 100}%` }} />
          </div>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={onBuild}
            disabled={!doneCount}
            title={doneCount ? 'Build and save your collection' : 'Shoot a chamber first'}
          >{doneCount ? 'Make my collection' : 'Complete a chamber to make your collection'}</button>
        </div>
      </div>
      </section>
    </div>
  );
}

/* --------------------------------------------------------------- shoot */

function Shoot({ chamber, single, onDone, onCancel }: { chamber: Chamber; single?: number; onDone: (photos: Blob[]) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraFileRef = useRef<HTMLInputElement>(null);
  const [frameId, setFrameId] = useState(loadFramePref);
  const [assets, setAssets] = useState<Assets | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [camState, setCamState] = useState<'starting' | 'on' | 'error'>('starting');
  const [kept, setKept] = useState<Blob[]>([]);
  const [pending, setPending] = useState<{ blob: Blob; url: string } | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [flash, setFlash] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [captureError, setCaptureError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  // Retaking one photo keeps its number (and frame text) from the original set.
  const shotNo = single !== undefined ? single + 1 : Math.min(kept.length + 1, SHOTS_PER_CHAMBER);
  const needed = single !== undefined ? 1 : SHOTS_PER_CHAMBER;

  // Camera stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      try {
        if (!window.isSecureContext) throw new Error('For a live preview, open this site over HTTPS. You can still take a photo using your phone camera below.');
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Live camera preview is unavailable in this browser. Take a photo or choose one below.');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1920 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        const v = videoRef.current;
        if (!v) return;
        v.srcObject = stream;
        await v.play();
        if (cancelled) return;
        setCamState('on');
      } catch (error) {
        stream?.getTracks().forEach(t => t.stop());
        if (!cancelled) {
          setCamState('error');
          setCameraError(error instanceof Error && error.name === 'NotAllowedError'
            ? 'Camera access was denied. Allow it in your browser and retry, or take a photo below.'
            : error instanceof Error && error.name === 'NotReadableError'
              ? 'Your camera is busy. Close other camera apps and retry, or choose a photo below.'
              : error instanceof Error ? error.message : 'We couldn’t open the camera. Take a photo or choose one below.');
        }
      }
    })();
    return () => { cancelled = true; stream?.getTracks().forEach(t => t.stop()); };
  }, [facing, cameraAttempt]);

  useEffect(() => { prepareFrames().then(setAssets); }, []);

  const frame = frameById(frameId);
  const info = useMemo(() => ({ chamber, shot: shotNo, total: SHOTS_PER_CHAMBER }), [chamber, shotNo]);

  const pickFrame = (id: string) => {
    setFrameId(id);
    try { localStorage.setItem(FRAME_KEY, id); } catch { /* ignore */ }
  };

  // Live preview: the chosen frame with the camera feed inside it, redrawn every
  // video frame. It is the same drawing code as the saved photo, at half size.
  useEffect(() => {
    const c = previewRef.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx || !assets) return;
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      const live = camState === 'on' && v && v.videoWidth;
      renderFramed(ctx, c.width, c.height, frame, info, assets,
        live ? { src: v, w: v.videoWidth, h: v.videoHeight, mirror: facing === 'user' } : null);
      if (camState === 'on') raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [assets, frame, info, camState, facing]);

  useEffect(() => () => { if (pending) URL.revokeObjectURL(pending.url); }, [pending]);

  const render = useCallback(async (src: CanvasImageSource, w: number, h: number, mirror: boolean) => {
    const canvas = document.createElement('canvas');
    canvas.width = PHOTO_W;
    canvas.height = PHOTO_H;
    const ctx = canvas.getContext('2d')!;
    renderFramed(ctx, PHOTO_W, PHOTO_H, frame, info, await prepareFrames(), { src, w, h, mirror });
    const blob = await canvasToBlob(canvas);
    setPending({ blob, url: URL.createObjectURL(blob) });
  }, [frame, info]);

  const snap = useCallback(async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) { setCaptureError('The camera is not ready yet. Please try again.'); return; }
    setCaptureError('');
    setProcessing(true);
    setFlash(true);
    setTimeout(() => setFlash(false), 250);
    try { await render(v, v.videoWidth, v.videoHeight, facing === 'user'); }
    catch { setCaptureError('We couldn’t prepare this photo. Please try again.'); }
    finally { setProcessing(false); }
  }, [facing, render]);

  // 3-2-1 countdown, then take the photo
  useEffect(() => {
    if (count === null) return;
    const t = setTimeout(() => {
      if (count <= 1) { setCount(null); snap(); } else setCount(count - 1);
    }, 1000);
    return () => clearTimeout(t);
  }, [count, snap]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setCaptureError('');
    setProcessing(true);
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      await render(img, img.naturalWidth, img.naturalHeight, false);
    } catch {
      setCaptureError('This image could not be opened. Try a JPEG or PNG photo.');
    } finally {
      URL.revokeObjectURL(url);
      setProcessing(false);
    }
  };

  const keep = () => {
    if (!pending) return;
    const next = [...kept, pending.blob];
    setPending(null);
    if (next.length >= needed) onDone(next);
    else setKept(next);
  };

  return (
    <div className={styles.shoot}>
      <div className={styles.shootBar}>
        <button type="button" className={styles.barBtn} onClick={onCancel}>✕ Close</button>
        <span className={styles.shootTitle}>Chamber {chamber.number} · Photo {shotNo} of {SHOTS_PER_CHAMBER}</span>
        <button
          type="button"
          className={styles.barBtn}
          onClick={() => setTimerEnabled(enabled => !enabled)}
          disabled={camState !== 'on' || !!pending || count !== null || processing}
          aria-label="3-second photo timer"
          aria-pressed={timerEnabled}
          title="Timer for the live camera"
        >Timer {timerEnabled ? '3s' : 'off'}</button>
      </div>

      <div className={styles.viewfinder}>
        {/* The video plays underneath; the canvas above shows it inside the frame. */}
        <video ref={videoRef} playsInline muted className={styles.video} />
        <canvas ref={previewRef} width={PHOTO_W / 2} height={PHOTO_H / 2} className={styles.overlay} />
        {pending && <img src={pending.url} alt="Your photo" className={styles.review} />}
        {count !== null && count > 0 && <span key={count} className={styles.count}>{count}</span>}
        {flash && <span className={styles.flash} />}
        {camState === 'starting' && !pending && (
          <div className={styles.camMsg}>
            <p>Waiting for camera access. Allow the camera in your browser, or take a photo below.</p>
            <button type="button" className={styles.primaryBtn} onClick={() => cameraFileRef.current?.click()}>Take a photo</button>
            <button type="button" className={styles.primaryBtn} onClick={() => fileRef.current?.click()}>Choose a photo</button>
          </div>
        )}
        {camState === 'error' && !pending && (
          <div className={styles.camMsg}>
            <p>{cameraError}</p>
            <button type="button" className={styles.primaryBtn} onClick={() => cameraFileRef.current?.click()}>Take a photo</button>
            <button type="button" className={styles.primaryBtn} onClick={() => fileRef.current?.click()}>Choose a photo</button>
            <button type="button" className={styles.ghostBtnDark} onClick={() => { setCamState('starting'); setCameraAttempt(n => n + 1); }}>Retry live camera</button>
          </div>
        )}
      </div>

      {captureError && <p className={styles.note} role="alert">{captureError}</p>}
      {processing && <p className={styles.note} role="status">Preparing photo…</p>}

      <FramePicker
        assets={assets}
        info={info}
        value={frame.id}
        onChange={pickFrame}
        hidden={!!pending || count !== null}
      />

      <div className={styles.progressDots} aria-hidden>
        {Array.from({ length: SHOTS_PER_CHAMBER }, (_, i) => (
          <span key={i} className={single !== undefined ? (i === single ? styles.dotNow : styles.dotDone) : i < kept.length ? styles.dotDone : i === kept.length ? styles.dotNow : ''} />
        ))}
      </div>

      <div className={styles.controls}>
        {pending ? (
          <>
            <button type="button" className={styles.ghostBtnDark} onClick={() => setPending(null)}>↺ Retake</button>
            <button type="button" className={styles.primaryBtn} onClick={keep}>
              {kept.length + 1 >= needed ? '✓ Keep & finish' : '✓ Keep, next photo'}
            </button>
          </>
        ) : (
          <>
            <button type="button" className={styles.ghostBtnDark} onClick={() => fileRef.current?.click()}>Upload</button>
            <button
              type="button"
              className={styles.shutter}
              onClick={() => {
                if (camState !== 'on') cameraFileRef.current?.click();
                else if (timerEnabled) setCount(3);
                else void snap();
              }}
              disabled={camState === 'starting' || count !== null || processing}
              aria-label="Take photo"
            />
            <button
              type="button"
              className={styles.switchCamera}
              onClick={() => { setCamState('starting'); setFacing(f => (f === 'user' ? 'environment' : 'user')); }}
              disabled={camState !== 'on' || count !== null || processing}
              aria-label="Switch camera"
              title="Switch camera"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h3l2-3h6l2 3h3v13H4z" />
                <path d="M8 12a4 4 0 0 1 7-1l1 1m0-3v3h-3M16 16a4 4 0 0 1-7 1l-1-1m0 3v-3h3" />
              </svg>
            </button>
          </>
        )}
      </div>

      <input
        ref={cameraFileRef}
        type="file"
        accept="image/*"
        capture={facing}
        aria-label="Take a photo with your device camera"
        hidden
        onChange={e => { onFile(e.target.files?.[0]); e.target.value = ''; }}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={e => { onFile(e.target.files?.[0]); e.target.value = ''; }}
      />
    </div>
  );
}

const FRAME_KEY = 'mindu-photo-frame';

function loadFramePref() {
  try { return localStorage.getItem(FRAME_KEY) ?? frames[0].id; } catch { return frames[0].id; }
}

/** A row of frame thumbnails; the choice carries over to later photos and chambers. */
function FramePicker({ assets, info, value, onChange, hidden }: {
  assets: Assets | null;
  info: FrameInfo;
  value: string;
  onChange: (id: string) => void;
  hidden: boolean;
}) {
  return (
    <div className={`${styles.picker} ${hidden ? styles.pickerHidden : ''}`} role="radiogroup" aria-label="Photo frame">
      {frames.map(f => (
        <button
          key={f.id}
          type="button"
          role="radio"
          aria-checked={f.id === value}
          aria-label={f.name}
          className={`${styles.pick} ${f.id === value ? styles.pickOn : ''}`}
          onClick={() => onChange(f.id)}
          tabIndex={hidden ? -1 : 0}
        >
          <FrameThumb frame={f} assets={assets} info={info} />
          <span>{f.name}</span>
        </button>
      ))}
    </div>
  );
}

function FrameThumb({ frame, assets, info }: { frame: FrameDef; assets: Assets | null; info: FrameInfo }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (c && ctx && assets) renderFramed(ctx, c.width, c.height, frame, info, assets, null);
  }, [frame, assets, info]);
  return <canvas ref={ref} width={144} height={180} className={styles.pickThumb} aria-hidden />;
}

/* -------------------------------------------------------------- result */

function Result({ shots, onBack }: { shots: Record<string, Blob[]>; onBack: () => void }) {
  const [state, setState] = useState<{ status: 'building' } | { status: 'ready'; blob: Blob; url: string; ai: boolean } | { status: 'error'; message: string }>({ status: 'building' });
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let url: string | null = null;
    buildCollection(shots)
      .then(({ blob, usedAiCover }) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setState({ status: 'ready', blob, url, ai: usedAiCover });
      })
      .catch(e => alive && setState({ status: 'error', message: e instanceof Error ? e.message : 'Something went wrong' }));
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [shots]);

  const fileName = 'my-gmc-story.jpg';

  const save = () => {
    if (state.status !== 'ready') return;
    const a = document.createElement('a');
    a.href = state.url;
    a.download = fileName;
    a.click();
  };

  const share = async () => {
    if (state.status !== 'ready') return;
    const file = new File([state.blob], fileName, { type: 'image/jpeg' });
    const data = { files: [file], title: 'My GMC Story', text: 'My visit to the Gelephu Mindfulness City Experience Centre' };
    if (navigator.canShare?.(data)) {
      try { await navigator.share(data); } catch { /* user closed the share sheet */ }
    } else {
      save();
      setNote('Sharing isn’t available in this browser, so we saved the image instead.');
    }
  };

  return (
    <div className={styles.result}>
      <div className={styles.shootBar}>
        <button type="button" className={styles.barBtn} onClick={onBack}>Back</button>
        <span className={styles.shootTitle}>Your collection</span>
        <span className={styles.ctrlSpacer} />
      </div>

      <div className={styles.resultStage}>
        {state.status === 'building' && (
          <div className={styles.building}>
            <span className={styles.spinner} />
            <p>Building your collection…</p>
          </div>
        )}
        {state.status === 'error' && <p className={styles.camMsg}>{state.message}</p>}
        {state.status === 'ready' && <img src={state.url} alt="Your GMC photo collection" className={styles.resultImg} />}
      </div>

      {state.status === 'ready' && (
        <div className={styles.controls}>
          <button type="button" className={styles.ghostBtnDark} onClick={save}>↓ Save</button>
          <button type="button" className={styles.primaryBtn} onClick={share}>↗ Share</button>
        </div>
      )}
      {note && <p className={styles.note}>{note}</p>}
    </div>
  );
}

/* ------------------------------------------------------------- helpers */

/**
 * One object URL per photo blob, created once and reused. There are at most
 * a dozen photos, so these are simply kept for the life of the page.
 */
const blobUrls = new WeakMap<Blob, string>();
function urlFor(b: Blob) {
  let u = blobUrls.get(b);
  if (!u) { u = URL.createObjectURL(b); blobUrls.set(b, u); }
  return u;
}

function useObjectUrls(shots: Record<string, Blob[]>) {
  return useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const [id, blobs] of Object.entries(shots)) out[id] = blobs.map(urlFor);
    return out;
  }, [shots]);
}
