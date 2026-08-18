import { useEffect, useRef, useState } from 'react';

// The Web Speech API isn't part of TypeScript's standard DOM lib, so the shapes used
// here are declared locally rather than reaching for `any` — just the subset of the
// spec this hook actually touches (continuous dictation with interim results).
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/**
 * Wraps the browser's native speech-to-text (Web Speech API) for voice input in the
 * chat composer. `onTranscript` is called with the full accumulated transcript so far
 * every time it changes (including live interim results while still speaking) — the
 * caller just sets it directly as the input value rather than appending.
 */
export function useSpeechToText(onTranscript: (text: string) => void) {
  const Ctor = getSpeechRecognitionConstructor();
  const isSupported = !!Ctor;
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isListening, setIsListening] = useState(false);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  function start() {
    if (!Ctor || recognitionRef.current) return;
    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';
    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalTranscript += `${result[0].transcript} `;
        else interim += result[0].transcript;
      }
      onTranscriptRef.current((finalTranscript + interim).trim());
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  function stop() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
    },
    []
  );

  return { isSupported, isListening, start, stop };
}
