'use client';

import { useEffect, type ReactNode } from 'react';
import { planBridges, planLayers, type PlanLayerId } from './masterplan';
import holo from './holo.module.css';
import styles from './masterplan.module.css';

export interface PlanUIState {
  layer: PlanLayerId | null;
  bridge: string | null;
  /** Whether the details overlay / sheet is open. */
  open: boolean;
}

export const emptyPlanState: PlanUIState = { layer: null, bridge: null, open: false };

interface Props {
  eyebrow: string;
  title: string;
  intro: string;
  anchorRef: (el: HTMLDivElement | null) => void;
  state: PlanUIState;
  onChange: (next: PlanUIState) => void;
  onClose: () => void;
  actions: ReactNode;
}

/**
 * Chamber 2 interface around the 3D masterplan hologram: a floating title,
 * five layer chips in the bottom card, and details in an overlay (desktop)
 * or the card itself (phone). The model lives in the 3D scene (MasterplanHolo).
 */
export function HoloMasterplan({ eyebrow, title, intro, anchorRef, state, onChange, onClose, actions }: Props) {
  const layer = planLayers.find(l => l.id === state.layer) ?? null;
  const bridge = planBridges.find(b => b.id === state.bridge) ?? null;
  const detail = state.open ? (bridge ? { kind: 'bridge' as const, bridge } : layer ? { kind: 'layer' as const, layer } : null) : null;

  const pickLayer = (id: PlanLayerId) =>
    onChange(state.layer === id && !state.bridge ? emptyPlanState : { layer: id, bridge: null, open: true });
  const closeDetail = () => onChange({ ...state, open: false });

  // Esc closes the details first, before the map's own Esc (reset view).
  useEffect(() => {
    if (!state.open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onChange({ ...state, open: false });
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [state, onChange]);

  const detailBody = detail && (
    detail.kind === 'layer'
      ? {
          eyebrow: detail.layer.tagline,
          title: detail.layer.title,
          text: detail.layer.text,
          color: detail.layer.color,
          list: detail.layer.id === 'bridges' ? planBridges.map(b => `${b.title} — ${b.text}`) : null,
        }
      : {
          eyebrow: 'Inhabitable bridge',
          title: detail.bridge.title,
          text: detail.bridge.text,
          color: 'rgb(242, 212, 78)',
          list: null,
        }
  );

  return (
    <>
      <div ref={anchorRef} className={holo.anchor}>
        <div className={holo.holo}>
          <header className={holo.heading}>
            <p className={holo.eyebrow}>{eyebrow}</p>
            <h2 className={holo.title}>{title}</h2>
            <p className={styles.sub}>The GMC masterplan</p>
          </header>
        </div>
      </div>

      <aside className={holo.card} aria-live="polite">
        <button type="button" className={holo.close} onClick={onClose} aria-label="Close hologram">×</button>
        {detailBody && (
          <div key={detailBody.title} className={`${holo.cardBody} ${holo.phoneOnly}`}>
            <p className={holo.cardEyebrow}>{detailBody.eyebrow}</p>
            <h3>{detailBody.title}</h3>
            <p>{detailBody.text}</p>
          </div>
        )}
        <div className={`${holo.cardBody} ${detailBody ? holo.desktopOnly : ''}`}>
          <p className={holo.cardEyebrow}>{eyebrow} · {title}</p>
          <p>{intro}</p>
        </div>
        <div className={styles.chips} role="group" aria-label="Explore the masterplan">
          {planLayers.map(l => (
            <button
              key={l.id}
              type="button"
              className={`${styles.chip} ${state.layer === l.id ? styles.chipOn : ''}`}
              style={{ ['--chip' as string]: l.color }}
              onClick={() => pickLayer(l.id)}
              aria-pressed={state.layer === l.id}
            >
              <span className={styles.dot} aria-hidden="true" />
              {l.title}
            </button>
          ))}
        </div>
        <p className={styles.note}>Stylised from the published masterplan by BIG with Arup and Cistri.</p>
        <footer className={holo.actions}>{actions}</footer>
      </aside>

      {detailBody && (
        <div className={`${holo.overlay} ${holo.desktopOnly}`} onClick={closeDetail}>
          <section
            key={detailBody.title}
            className={holo.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="plan-title"
            onClick={e => e.stopPropagation()}
          >
            <button type="button" className={holo.modalX} onClick={closeDetail} aria-label="Close">×</button>
            <header className={holo.modalHead}>
              <span className={styles.swatch} style={{ background: detailBody.color }} aria-hidden="true" />
              <div>
                <p className={holo.modalEyebrow}>{detailBody.eyebrow}</p>
                <h3 id="plan-title">{detailBody.title}</h3>
              </div>
            </header>
            <p className={holo.modalText}>{detailBody.text}</p>
            {detailBody.list && <ul className={holo.modalList}>{detailBody.list.map(item => <li key={item}>{item}</li>)}</ul>}
            <footer className={holo.modalFoot}>
              <span className={styles.modalHint}>The highlight stays on the model when you close this.</span>
              <button type="button" className={holo.modalClose} onClick={closeDetail}>Close</button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
