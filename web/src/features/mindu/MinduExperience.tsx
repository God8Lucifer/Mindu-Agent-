'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { chambers, isChamberId, type ChamberId } from './knowledge';
import styles from './mindu.module.css';

type Motion = 'idle' | 'greeting' | 'listening' | 'thinking' | 'speaking' | 'celebrating';
type Message = { role: 'visitor' | 'mindu'; text: string; mode?: 'demo' | 'ai' };

interface RecognitionResult { results: ArrayLike<ArrayLike<{ transcript: string }>> }
interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: RecognitionResult) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionWindow = Window & {
  SpeechRecognition?: new () => RecognitionLike;
  webkitSpeechRecognition?: new () => RecognitionLike;
};

const suggestedQuestions = [
  'What is the GMC Experience Centre?',
  'What can I explore in this chamber?',
  'How can I see myself in GMC?',
];

export function MinduExperience() {
  const [chamber, setChamber] = useState<ChamberId>('chamber1');
  const [interests, setInterests] = useState<string[]>([]);
  const [motion, setMotion] = useState<Motion>('greeting');
  const [mouthOpen, setMouthOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'mindu', text: 'Kuzuzangpo! I’m Mindu, your GMC guide. Choose a chamber, then ask me what you would like to explore.' },
  ]);
  const [soundOn, setSoundOn] = useState(true);
  const [notice, setNotice] = useState('');
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const mouthTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const motionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const place = params.get('place');
    if (place && isChamberId(place)) setChamber(place);
    const saved = window.localStorage.getItem('mindu-visitor-interests');
    if (saved) {
      try {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) setInterests(parsed.filter((item): item is string => typeof item === 'string').slice(0, 3));
      } catch { /* ignore malformed local data */ }
    }
    const timer = setTimeout(() => setMotion('idle'), 1700);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [messages]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    if (mouthTimerRef.current) clearInterval(mouthTimerRef.current);
    if (motionTimerRef.current) clearTimeout(motionTimerRef.current);
  }, []);

  const stopVoice = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (mouthTimerRef.current) clearInterval(mouthTimerRef.current);
    mouthTimerRef.current = null;
    setMouthOpen(false);
    setMotion('idle');
  }, []);

  const speak = useCallback((text: string) => {
    if (!soundOn || !('speechSynthesis' in window)) {
      setMotion('idle');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-GB';
    utterance.rate = 0.92;
    utterance.pitch = 1.08;
    utterance.onstart = () => {
      setMotion('speaking');
      mouthTimerRef.current = setInterval(() => setMouthOpen(value => !value), 190);
    };
    utterance.onend = stopVoice;
    utterance.onerror = stopVoice;
    window.speechSynthesis.speak(utterance);
  }, [soundOn, stopVoice]);

  const ask = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    recognitionRef.current?.stop();
    stopVoice();
    setQuestion('');
    setMessages(previous => [...previous, { role: 'visitor', text: trimmed }]);
    setMotion('thinking');
    setPending(true);
    setNotice('');
    try {
      const response = await fetch('/api/mindu/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: trimmed, chamber, interests }),
      });
      const result = await response.json() as { answer?: string; mode?: 'demo' | 'ai'; error?: string };
      if (!response.ok || !result.answer) throw new Error(result.error || 'Mindu could not answer right now.');
      setMessages(previous => [...previous, { role: 'mindu', text: result.answer!, mode: result.mode }]);
      setPending(false);
      speak(result.answer);
    } catch (error) {
      setPending(false);
      setMotion('idle');
      setNotice(error instanceof Error ? error.message : 'Something went wrong.');
    }
  }, [chamber, interests, speak, stopVoice]);

  const startListening = () => {
    if (motion === 'listening') {
      recognitionRef.current?.stop();
      setMotion('idle');
      return;
    }
    const speechWindow = window as RecognitionWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setNotice('Voice input is unavailable in this browser. You can type your question below.');
      return;
    }
    stopVoice();
    const recognition = new Recognition();
    recognition.lang = 'en-GB';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = event => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) void ask(transcript);
    };
    recognition.onerror = () => {
      setMotion('idle');
      setNotice('I could not hear that. Please try again or type your question.');
    };
    recognition.onend = () => setMotion(current => current === 'listening' ? 'idle' : current);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setMotion('listening');
      setNotice('Listening… speak your question.');
    } catch {
      setMotion('idle');
      setNotice('Microphone access could not start. Please type your question.');
    }
  };

  const preview = (next: Motion) => {
    if (motionTimerRef.current) clearTimeout(motionTimerRef.current);
    stopVoice();
    if (next === 'speaking') {
      speak('Kuzuzangpo! I’m Mindu, and I’m happy to guide you through the Experience Centre.');
      return;
    }
    setMotion(next);
    if (next !== 'idle') motionTimerRef.current = setTimeout(() => setMotion('idle'), 2400);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void ask(question);
  };

  const toggleInterest = (interest: string) => {
    setInterests(current => {
      const next = current.includes(interest) ? current.filter(item => item !== interest) : [...current, interest].slice(0, 3);
      window.localStorage.setItem('mindu-visitor-interests', JSON.stringify(next));
      return next;
    });
  };

  return (
    <main className={styles.page}>
      <div className={styles.ambientOne} aria-hidden="true" />
      <div className={styles.ambientTwo} aria-hidden="true" />
      <header className={styles.header}>
        <Link className={styles.brand} href="/map"><span className={styles.brandMark}>✦</span><span>GMC <small>EXPERIENCE CENTRE</small></span></Link>
        <nav aria-label="Mindu navigation"><Link href="/map">Explore the map</Link><span className={styles.navCurrent}>Meet Mindu</span></nav>
      </header>

      <div className={styles.layout}>
        <section className={styles.characterSide} aria-label="Mindu mascot">
          <div className={styles.overline}><span className={styles.overlineDot} /> YOUR COMPANION THROUGH GMC</div>
          <h1>Meet <em>Mindu.</em></h1>
          <p className={styles.subtitle}>A little curiosity goes a long way. Ask a question and explore the Experience Centre together.</p>

          <div className={`${styles.stage} ${styles[`state_${motion}`]}`}>
            <div className={styles.stageGlow} aria-hidden="true" />
            <span className={`${styles.orbit} ${styles.orbitA}`} aria-hidden="true">✦</span>
            <span className={`${styles.orbit} ${styles.orbitB}`} aria-hidden="true">✧</span>
            <span className={styles.thought} aria-hidden="true">···</span>
            <div className={styles.character} role="img" aria-label={`Mindu is ${motion === 'idle' ? 'waiting' : motion}`}>
              <Image src="/mindu/mindu-idle.png" alt="" width={1199} height={1312} priority className={`${styles.pose} ${styles.idlePose} ${motion === 'thinking' || (motion === 'speaking' && mouthOpen) ? styles.poseHidden : ''}`} />
              <Image src="/mindu/mindu-talking.png" alt="" width={1199} height={1312} className={`${styles.pose} ${styles.talkPose} ${motion === 'speaking' && mouthOpen ? styles.poseShown : ''}`} />
              <Image src="/mindu/mindu-thinking.png" alt="" width={1199} height={1312} className={`${styles.pose} ${styles.thinkPose} ${motion === 'thinking' ? styles.poseShown : ''}`} />
            </div>
            <div className={styles.groundShadow} aria-hidden="true" />
          </div>

          <div className={styles.motionBar}>
            <span className={styles.motionLabel}>SEE MINDU MOVE</span>
            <button type="button" onClick={() => preview('greeting')}>Wave</button>
            <button type="button" onClick={() => preview('thinking')}>Think</button>
            <button type="button" onClick={() => preview('speaking')}>Talk</button>
            <button type="button" onClick={() => preview('celebrating')}>Celebrate</button>
          </div>
        </section>

        <section className={styles.guideSide} aria-label="Talk with Mindu">
          <div className={styles.guideHeader}>
            <div><span className={styles.liveDot} /><span className={styles.guideEyebrow}>YOUR INTERACTIVE GUIDE</span><h2>Ask Mindu anything.</h2></div>
            <button className={styles.soundButton} type="button" onClick={() => { if (soundOn) stopVoice(); setSoundOn(!soundOn); }} aria-pressed={soundOn}>{soundOn ? '♪ Sound on' : '♪ Sound off'}</button>
          </div>
          <p className={styles.guideIntro}>Questions about the vision, the chambers, or where you might fit in? Start here.</p>

          <div className={styles.contextSection}>
            <span className={styles.fieldLabel}>I’M EXPLORING</span>
            <div className={styles.chamberList} role="group" aria-label="Choose a chamber">
              {chambers.map(item => <button key={item.id} type="button" className={`${styles.chamber} ${chamber === item.id ? styles.chamberActive : ''}`} onClick={() => setChamber(item.id)} aria-pressed={chamber === item.id}><small>{item.short}</small>{item.title}</button>)}
            </div>
          </div>

          <div className={styles.contextSection}>
            <span className={styles.fieldLabel}>WHAT INTERESTS YOU? <span>OPTIONAL</span></span>
            <div className={styles.interestList} role="group" aria-label="Your interests">
              {['Nature', 'Culture', 'City design', 'Technology', 'Opportunities'].map(item => <button key={item} type="button" className={interests.includes(item) ? styles.interestActive : ''} aria-pressed={interests.includes(item)} onClick={() => toggleInterest(item)}>{item}</button>)}
            </div>
          </div>

          <div className={styles.chatPanel}>
            <div className={styles.chatHeading}><span>MINDU & YOU</span><span className={styles.status}>{pending ? 'Thinking…' : motion === 'listening' ? 'Listening…' : motion === 'speaking' ? 'Speaking…' : 'Ready to help'}</span></div>
            <div className={styles.messages} ref={messagesRef} role="log" aria-label="Conversation" aria-live="polite">
              {messages.map((message, index) => <div key={index} className={`${styles.message} ${message.role === 'mindu' ? styles.messageMindu : styles.messageVisitor}`}><span className={styles.messageWho}>{message.role === 'mindu' ? 'MINDU' : 'YOU'}{message.mode === 'demo' ? ' · DEMO ANSWER' : ''}</span><p>{message.text}</p>{message.role === 'mindu' && index > 0 && <button className={styles.replay} type="button" onClick={() => speak(message.text)}>▶ Hear this</button>}</div>)}
              {pending && <div className={`${styles.message} ${styles.messageMindu}`}><span className={styles.messageWho}>MINDU</span><p>Let me think about that<span className={styles.typingDots}>…</span></p></div>}
            </div>
            <div className={styles.suggestions}>{suggestedQuestions.map(item => <button key={item} type="button" onClick={() => void ask(item)} disabled={pending}>{item}</button>)}</div>
            <form className={styles.composer} onSubmit={submit}><button className={`${styles.micButton} ${motion === 'listening' ? styles.micActive : ''}`} type="button" onClick={startListening} disabled={pending} aria-label={motion === 'listening' ? 'Stop listening' : 'Ask by voice'} title="Ask by voice"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4m-4 0h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></button><input value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask me a question…" aria-label="Ask Mindu a question" maxLength={500} /><button className={styles.sendButton} type="submit" disabled={!question.trim() || pending} aria-label="Send question">↗</button></form>
            {notice && <p className={styles.notice} role="status">{notice}</p>}
          </div>
          <p className={styles.disclaimer}>Mindu uses the GMC challenge brief for this prototype. Detailed plans and opportunities should be confirmed with a human guide.</p>
        </section>
      </div>
    </main>
  );
}
