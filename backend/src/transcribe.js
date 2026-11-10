const AUDIO_TYPES = new Map([
  ['audio/webm', 'webm'],
  ['audio/mp4', 'mp4'],
  ['audio/mpeg', 'mp3'],
  ['audio/wav', 'wav'],
  ['audio/ogg', 'ogg']
]);

export function extensionForAudio(contentType = '') {
  const mime = String(contentType).split(';')[0].toLowerCase().trim();
  return AUDIO_TYPES.get(mime) || null;
}

export async function transcribeAudio(data, contentType) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw Object.assign(new Error('Voice transcription requires an OpenAI API key configured in the server .env file.'), { status: 503, code: 'NO_API_KEY' });
  const ext = extensionForAudio(contentType);
  if (!ext) throw Object.assign(new Error('Unsupported audio type. Please use Chrome, Edge or Safari.'), { status: 415, code: 'UNSUPPORTED_AUDIO' });
  if (!data?.length || data.length < 1000) throw Object.assign(new Error('The recording is too short.'), { status: 400, code: 'EMPTY_AUDIO' });
  if (data.length > 8 * 1024 * 1024) throw Object.assign(new Error('Audio is too large. Keep questions under 30 seconds.'), { status: 413, code: 'AUDIO_TOO_LARGE' });

  const form = new FormData();
  form.append('model', process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1');
  form.append('file', new Blob([data], { type: contentType }), `question.${ext}`);
  form.append('language', 'en');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 22000);
  try {
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: controller.signal
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = res.status === 401 ? 'OpenAI rejected the API key. Replace it with a valid key.'
        : res.status === 429 ? 'OpenAI transcription quota or rate limit reached. Check API billing.'
        : res.status === 400 ? 'OpenAI could not transcribe this audio format. Try Chrome.'
        : `Voice transcription service returned HTTP ${res.status}.`;
      console.error('[Mindu transcription]', res.status, result?.error?.message || msg);
      throw Object.assign(new Error(msg), { status: 503, code: `TRANSCRIPTION_${res.status}` });
    }
    const text = result?.text?.trim();
    if (!text) throw Object.assign(new Error('No clear speech was detected. Please try again.'), { status: 422, code: 'NO_SPEECH' });
    return text.slice(0, 400);
  } catch (err) {
    if (err.name === 'AbortError') throw Object.assign(new Error('Transcription timed out. Check internet connectivity.'), { status: 504, code: 'TRANSCRIPTION_TIMEOUT' });
    if (err.code) throw err;
    console.error('[Mindu transcription network]', err.message);
    throw Object.assign(new Error('Could not reach the transcription service. Check the backend connection.'), { status: 503, code: 'TRANSCRIPTION_NETWORK' });
  } finally {
    clearTimeout(timeout);
  }
}
