'use client';
// Photos here are local blob: URLs, which next/image can't optimise.
/* eslint-disable @next/next/no-img-element */

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SHOTS_PER_CHAMBER, chambers, isChamber, type Chamber } from './chambers';
import { buildCollection } from './compose';
import { PHOTO_H, PHOTO_W, canvasToBlob, loadImage } from './frame';
import { frameById, frames, prepareFrames, renderFramed, type Assets, type FrameDef, type FrameInfo } from './frames';
import { clearAll, loadAll, saveChamber } from './store';
import styles from './photo.module.css';

type View = { kind: 'hub' } | { kind: 'shoot'; chamber: Chamber } | { kind: 'result' };

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

  const finishChamber = async (chamber: Chamber, photos: Blob[]) => {
    setShots(prev => ({ ...prev, [chamber.id]: photos }));
    setView({ kind: 'hub' });
    await saveChamber(chamber.id, photos);
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
        <Shoot chamber={view.chamber} onDone={p => finishChamber(view.chamber, p)} onCancel={() => setView({ kind: 'hub' })} />
      )}
      {view.kind === 'hub' && (
        <Hub
          shots={shots}
          loaded={loaded}
          focus={startPlace}
          backToMindu={backToMindu}
          onShoot={chamber => setView({ kind: 'shoot', chamber })}
          onBuild={() => setView({ kind: 'result' })}
          onStartOver={startOver}
        />
      )}
      {view.kind === 'result' && <Result shots={shots} onBack={() => setView({ kind: 'hub' })} />}
    </div>
  );
}

/* ---------------------------------------------------------------- hub */

function Hub({ shots, loaded, focus, backToMindu, onShoot, onBuild, onStartOver }: {
  shots: Record<string, Blob[]>;
  loaded: boolean;
  focus?: string;
  backToMindu: string | null;
  onShoot: (c: Chamber) => void;
  onBuild: () => void;
  onStartOver: () => void;
}) {
  const urls = useObjectUrls(shots);
  const doneCount = chambers.filter(c => shots[c.id]?.length).length;

  return (
    <div className={styles.hub}>
      <header className={styles.hubHead}>
        <a href={backToMindu ?? '/map'} className={styles.back}>{backToMindu ? '← Mindu' : '← Map'}</a>
        <span className={styles.logoTile}>
          <Image src="/gmc-logo-light.svg" alt="" width={30} height={30} unoptimized />
        </span>
      </header>

      <div className={styles.intro}>
        <span className={styles.eyebrow}>Photo collection</span>
        <h1>Capture your journey</h1>
        <p>Take {SHOTS_PER_CHAMBER} photos in each chamber. At the end, we put them together into one collection with a cover, ready to share.</p>
      </div>

      <ol className={styles.chamberList}>
        {chambers.map(c => {
          const photos = urls[c.id] ?? [];
          const done = photos.length > 0;
          return (
            <li key={c.id} className={`${styles.chamberCard} ${focus === c.id ? styles.focus : ''}`}>
              <div className={styles.chamberHead}>
                <span className={styles.chamberNum}>{c.number}</span>
                <div>
                  <span className={styles.eyebrow}>Chamber {c.number}</span>
                  <strong>{c.name}</strong>
                </div>
                <button type="button" className={done ? styles.ghostBtn : styles.primaryBtn} onClick={() => onShoot(c)} disabled={!loaded}>
                  {done ? 'Retake' : '◉ Shoot'}
                </button>
              </div>
              <div className={styles.slots}>
                {Array.from({ length: SHOTS_PER_CHAMBER }, (_, i) => (
                  <span key={i} className={styles.slot}>
                    {photos[i]
                      ? <img src={photos[i]} alt={`Chamber ${c.number}, photo ${i + 1}`} />
                      : <span className={styles.slotEmpty}>{i + 1}</span>}
                  </span>
                ))}
              </div>
            </li>
          );
        })}
      </ol>

      <div className={styles.hubFoot}>
        <p>{doneCount} of {chambers.length} chambers captured</p>
        <button type="button" className={styles.bigBtn} onClick={onBuild} disabled={!doneCount}>
          {doneCount === chambers.length ? '✦ Create my collection' : doneCount ? '✦ Create collection now' : 'Shoot a chamber to begin'}
        </button>
        {doneCount > 0 && <button type="button" className={styles.linkBtn} onClick={onStartOver}>Start over</button>}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- shoot */

function Shoot({ chamber, onDone, onCancel }: { chamber: Chamber; onDone: (photos: Blob[]) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [frameId, setFrameId] = useState(loadFramePref);
  const [assets, setAssets] = useState<Assets | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [camState, setCamState] = useState<'starting' | 'on' | 'error'>('starting');
  const [kept, setKept] = useState<Blob[]>([]);
  const [pending, setPending] = useState<{ blob: Blob; url: string } | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const shotNo = Math.min(kept.length + 1, SHOTS_PER_CHAMBER);

  // Camera stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('No camera API');
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1920 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        const v = videoRef.current;
        if (v) { v.srcObject = stream; await v.play().catch(() => {}); }
        setCamState('on');
      } catch {
        if (!cancelled) setCamState('error');
      }
    })();
    return () => { cancelled = true; stream?.getTracks().forEach(t => t.stop()); };
  }, [facing]);

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
      if (live) raf = requestAnimationFrame(tick);
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
    if (!v || !v.videoWidth) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 250);
    await render(v, v.videoWidth, v.videoHeight, facing === 'user');
  }, [facing, render]);

  // 3-2-1 countdown, then take the photo
  useEffect(() => {
    if (count === null) return;
    const t = setTimeout(() => {
      if (count <= 1) { setCount(null); snap(); } else setCount(count - 1);
    }, 800);
    return () => clearTimeout(t);
  }, [count, snap]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      await render(img, img.naturalWidth, img.naturalHeight, false);
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const keep = () => {
    if (!pending) return;
    const next = [...kept, pending.blob];
    setPending(null);
    if (next.length >= SHOTS_PER_CHAMBER) onDone(next);
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
          onClick={() => { setCamState('starting'); setFacing(f => (f === 'user' ? 'environment' : 'user')); }}
          disabled={camState !== 'on' || !!pending}
          aria-label="Switch camera"
        >⟲ Flip</button>
      </div>

      <div className={styles.viewfinder}>
        {/* The video plays underneath; the canvas above shows it inside the frame. */}
        <video ref={videoRef} playsInline muted className={styles.video} />
        <canvas ref={previewRef} width={PHOTO_W / 2} height={PHOTO_H / 2} className={styles.overlay} />
        {pending && <img src={pending.url} alt="Your photo" className={styles.review} />}
        {count !== null && count > 0 && <span key={count} className={styles.count}>{count}</span>}
        {flash && <span className={styles.flash} />}
        {camState === 'starting' && !pending && <p className={styles.camMsg}>Starting camera…</p>}
        {camState === 'error' && !pending && (
          <div className={styles.camMsg}>
            <p>We couldn’t open the camera. Allow camera access in your browser, or pick a photo instead.</p>
            <button type="button" className={styles.primaryBtn} onClick={() => fileRef.current?.click()}>Choose a photo</button>
          </div>
        )}
      </div>

      <FramePicker
        assets={assets}
        info={info}
        value={frame.id}
        onChange={pickFrame}
        hidden={!!pending || count !== null}
      />

      <div className={styles.progressDots} aria-hidden>
        {Array.from({ length: SHOTS_PER_CHAMBER }, (_, i) => (
          <span key={i} className={i < kept.length ? styles.dotDone : i === kept.length ? styles.dotNow : ''} />
        ))}
      </div>

      <div className={styles.controls}>
        {pending ? (
          <>
            <button type="button" className={styles.ghostBtnDark} onClick={() => setPending(null)}>↺ Retake</button>
            <button type="button" className={styles.primaryBtn} onClick={keep}>
              {kept.length + 1 >= SHOTS_PER_CHAMBER ? '✓ Keep & finish' : '✓ Keep, next photo'}
            </button>
          </>
        ) : (
          <>
            <button type="button" className={styles.ghostBtnDark} onClick={() => fileRef.current?.click()}>Upload</button>
            <button
              type="button"
              className={styles.shutter}
              onClick={() => setCount(3)}
              disabled={camState !== 'on' || count !== null}
              aria-label="Take photo"
            />
            <span className={styles.ctrlSpacer} />
          </>
        )}
      </div>

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
        <button type="button" className={styles.barBtn} onClick={onBack}>← Back</button>
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
