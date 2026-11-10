'use client';

import { FormEvent, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import MinduAvatar, { type AvatarState } from './MinduAvatar';
import type { MinduReply, Mood } from './replies';
import styles from './mindu.module.css';

type Message = { id: number; role: 'user' | 'mindu'; text: string; mood?: Mood };
type Preview = { state: AvatarState; talking: boolean };

const GREETING: MinduReply = {
  mood: 'hi',
  text: 'Kuzuzangpo la! I’m Mindu, your guide to Gelephu Mindfulness City. Type a question and I’ll answer out loud.',
};
const SUGGESTIONS = ['What is GMC?', 'Tell me about the economy', 'How is the city planned?', 'Who are you?'];
const SLEEP_AFTER_MS = 30_000;

/** Every animation, for the demo strip under the mascot. */
const PREVIEWS: { label: string; preview: Preview }[] = [
  { label: 'Idle', preview: { state: 'idle', talking: false } },
  { label: 'Hi', preview: { state: 'hi', talking: false } },
  { label: 'Listening', preview: { state: 'listening', talking: false } },
  { label: 'Thinking', preview: { state: 'thinking', talking: false } },
  { label: 'Talking', preview: { state: 'idle', talking: true } },
  { label: 'Teaching', preview: { state: 'teaching', talking: true } },
  { label: 'Wow', preview: { state: 'wow', talking: false } },
  { label: 'Sleepy', preview: { state: 'sleepy', talking: false } },
];

const STATUS: Record<AvatarState, string> = {
  idle: 'Ready to help',
  hi: 'Saying hello!',
  listening: 'Listening…',
  thinking: 'Thinking…',
  teaching: 'Explaining…',
  wow: 'Excited!',
  sleepy: 'Napping… type to wake me',
};

/** Prefer a friendly English voice; falls back to the browser default. */
function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const english = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
  const preferred = ['Google UK English Female', 'Microsoft Aria', 'Microsoft Jenny', 'Samantha', 'Google US English'];
  for (const name of preferred) {
    const v = english.find(v => v.name.includes(name));
    if (v) return v;
  }
  return english[0] ?? voices[0];
}

export default function MinduChat() {
  const [messages, setMessages] = useState<Message[]>([{ id: 0, role: 'mindu', ...GREETING }]);
  const [reaction, setReaction] = useState<Mood | null>('hi'); // greets on arrival
  const [speaking, setSpeaking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const [sleepy, setSleepy] = useState(false);
  const [activity, setActivity] = useState(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [muted, setMuted] = useState(false);
  const [input, setInput] = useState('');
  const nextId = useRef(1);
  const listRef = useRef<HTMLDivElement>(null);

  // Browser support never changes, so there is nothing to subscribe to.
  const canSpeak = useSyncExternalStore(
    () => () => {},
    () => 'speechSynthesis' in window,
    () => true,
  );

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    // Chrome loads voices asynchronously; touching the list starts the load.
    window.speechSynthesis.getVoices();
    return () => window.speechSynthesis.cancel();
  }, []);

  // The arrival wave lasts a few seconds.
  useEffect(() => {
    const t = setTimeout(() => setReaction(r => (r === 'hi' ? null : r)), 3200);
    return () => clearTimeout(t);
  }, []);

  // Doze off after a quiet spell; any activity wakes Mindu up.
  useEffect(() => {
    if (busy || speaking) return;
    const t = setTimeout(() => setSleepy(true), SLEEP_AFTER_MS);
    return () => clearTimeout(t);
  }, [activity, busy, speaking]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  const wake = useCallback(() => {
    setSleepy(false);
    setActivity(a => a + 1);
  }, []);

  const speak = useCallback((reply: MinduReply) => {
    wake();
    setReaction(reply.mood);
    if (!canSpeak || muted) {
      // No audio: hold the reaction briefly so it is still visible.
      setTimeout(() => setReaction(null), 2800);
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(reply.text);
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.rate = 1.02;
    u.pitch = 1.35; // a little higher for a cheerful character voice
    u.onend = u.onerror = () => { setSpeaking(false); setReaction(null); wake(); };
    // Set speaking right away: some browsers fire onstart late or not at all.
    setSpeaking(true);
    synth.speak(u);
  }, [canSpeak, muted, wake]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    window.speechSynthesis?.cancel();
    setPreview(null);
    setInput('');
    setMessages(m => [...m, { id: nextId.current++, role: 'user', text: q }]);
    setBusy(true);
    setSpeaking(false);
    setReaction(null);
    wake();
    try {
      const res = await fetch('/api/mindu/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      const reply: MinduReply = res.ok ? data : { mood: 'idle', text: data.error ?? 'Something went wrong.' };
      setMessages(m => [...m, { id: nextId.current++, role: 'mindu', ...reply }]);
      speak(reply);
    } catch {
      const reply: MinduReply = { mood: 'idle', text: 'Hmm, I couldn’t reach my notes. Please try again.' };
      setMessages(m => [...m, { id: nextId.current++, role: 'mindu', ...reply }]);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ask(input);
  }

  function toggleMute() {
    if (!muted) { window.speechSynthesis?.cancel(); setSpeaking(false); }
    setMuted(m => !m);
  }

  // What Mindu is doing right now, in priority order.
  const live: AvatarState = busy ? 'thinking'
    : reaction ? reaction
    : speaking ? 'idle'
    : focused ? 'listening'
    : sleepy ? 'sleepy'
    : 'idle';
  const avatarState = preview?.state ?? live;
  const talking = preview ? preview.talking : speaking;
  const status = preview ? `Preview: ${PREVIEWS.find(p => p.preview === preview)?.label}`
    : talking ? 'Speaking…' : STATUS[avatarState];

  return (
    <main className={styles.page}>
      <section className={styles.stage} aria-label="Mindu">
        <div className={styles.halo} aria-hidden />
        <div className={styles.mascot}>
          <MinduAvatar state={avatarState} talking={talking} />
        </div>
        <div className={styles.nameplate}>
          <strong>Mindu</strong>
          <span className={styles.status}>
            <span className={`${styles.dot} ${talking ? styles.dotLive : ''}`} />
            {status}
          </span>
        </div>
        <div className={styles.previews} role="group" aria-label="Preview Mindu’s animations">
          {PREVIEWS.map(p => (
            <button
              key={p.label}
              type="button"
              aria-pressed={preview === p.preview}
              onClick={() => { window.speechSynthesis?.cancel(); setSpeaking(false); setPreview(cur => (cur === p.preview ? null : p.preview)); }}
            >
              {p.label}
            </button>
          ))}
          {preview && <button type="button" className={styles.live} onClick={() => setPreview(null)}>● Live</button>}
        </div>
      </section>

      <section className={styles.chat}>
        <header className={styles.chatHead}>
          <div>
            <h1>Ask Mindu</h1>
            <p>Your AI companion to Gelephu Mindfulness City</p>
          </div>
          {canSpeak && (
            <button type="button" className={styles.iconBtn} onClick={toggleMute} aria-pressed={muted}>
              {muted ? '🔇 Voice off' : '🔊 Voice on'}
            </button>
          )}
        </header>

        <div className={styles.messages} ref={listRef} aria-live="polite">
          {messages.map(m => (
            <div key={m.id} className={`${styles.msg} ${m.role === 'user' ? styles.user : styles.mindu}`}>
              <p>{m.text}</p>
              {m.role === 'mindu' && canSpeak && (
                <button type="button" className={styles.replay} onClick={() => { setPreview(null); speak({ text: m.text, mood: m.mood ?? 'idle' }); }}>
                  ▶ Listen
                </button>
              )}
            </div>
          ))}
          {busy && <div className={`${styles.msg} ${styles.mindu} ${styles.typing}`}><span /><span /><span /></div>}
        </div>

        <div className={styles.suggestions}>
          {SUGGESTIONS.map(s => (
            <button key={s} type="button" onClick={() => ask(s)} disabled={busy}>{s}</button>
          ))}
        </div>

        <form className={styles.form} onSubmit={onSubmit}>
          <input
            value={input}
            onChange={e => { setInput(e.target.value); wake(); }}
            onFocus={() => { setFocused(true); setPreview(null); wake(); }}
            onBlur={() => setFocused(false)}
            placeholder="Type your question…"
            aria-label="Your question for Mindu"
            maxLength={500}
          />
          <button type="submit" disabled={busy || !input.trim()}>Send</button>
        </form>
        {!canSpeak && <p className={styles.note}>Your browser can’t speak aloud, so Mindu will reply in text.</p>}
      </section>
    </main>
  );
}
