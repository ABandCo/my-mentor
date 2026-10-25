// Voice: hold-to-talk input (the phone's own speech recogniser, on-device when the phone supports it) and spoken
// replies (the phone's text-to-speech). No audio is recorded or stored by this app; only the recognised text is used.
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import * as Speech from 'expo-speech';
import { useCallback, useRef, useState } from 'react';

import type { Language } from './store';

export const recogLang = (l: Language) => (l === 'hi' ? 'hi-IN' : 'en-IN'); // Hinglish is spoken, so the Indian-English recogniser handles it best

export function useVoiceInput(language: Language, onFinal?: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  const finalRef = useRef('');
  const retried = useRef(false);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useSpeechRecognitionEvent('result', (e) => {
    const t = e.results?.[0]?.transcript ?? '';
    setText(t);
    if (e.isFinal) finalRef.current = t;
  });
  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    const f = finalRef.current.trim() || '';
    finalRef.current = '';
    if (f) onFinalRef.current?.(f);
  });
  useSpeechRecognitionEvent('error', (e) => {
    setListening(false);
    if ((e.error === 'language-not-supported' || e.error === 'service-not-allowed') && !retried.current) {
      retried.current = true;
      try {
        ExpoSpeechRecognitionModule.start({ lang: recogLang(language), interimResults: true, requiresOnDeviceRecognition: false });
        setListening(true);
        return;
      } catch {
        /* fall through */
      }
    }
    if (e.error === 'no-speech' || e.error === 'aborted') return;
    setError(e.error === 'not-allowed' ? 'Microphone permission is off. Allow it in Android settings to talk to Krishna.' : 'Voice did not work this time. You can type instead.');
  });

  const start = useCallback(async () => {
    setError(undefined);
    setText('');
    finalRef.current = '';
    retried.current = false;
    try {
      const p = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!p.granted) {
        setError('Microphone permission is off. Allow it in Android settings to talk to Krishna.');
        return;
      }
      ExpoSpeechRecognitionModule.start({ lang: recogLang(language), interimResults: true, requiresOnDeviceRecognition: ExpoSpeechRecognitionModule.supportsOnDeviceRecognition() });
      setListening(true);
    } catch {
      setError('Voice is not available on this device. You can type instead.');
    }
  }, [language]);

  const stop = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      setListening(false);
    }
  }, []);

  return { listening, text, error, start, stop };
}

/** Plain text for the speech engine: no emoji or markdown symbols. */
export const speakable = (t: string) =>
  t
    .replace(/[*_`#>]/g, '')
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 900);

export function speak(text: string, language: Language) {
  const t = speakable(text);
  if (!t) return;
  try {
    Speech.stop();
    Speech.speak(t, { language: language === 'hi' ? 'hi-IN' : 'en-IN', rate: 0.98 });
  } catch {
    /* speech is optional */
  }
}
export const stopSpeaking = () => {
  try {
    Speech.stop();
  } catch {
    /* ignore */
  }
};
