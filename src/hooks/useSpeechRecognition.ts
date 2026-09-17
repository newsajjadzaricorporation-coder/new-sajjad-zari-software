import { useState, useEffect, useCallback, useRef } from 'react';

export function useSpeechRecognition(onResult: (transcript: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const onResultRef = useRef(onResult);
  const recognitionRef = useRef<any>(null);

  // Keep latest onResult callback in ref without triggering effects
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      try {
        const instance = new SpeechRecognition();
        instance.continuous = false;
        instance.interimResults = false;
        instance.lang = 'en-US';

        instance.onstart = () => setIsListening(true);
        instance.onend = () => setIsListening(false);
        instance.onerror = (e: any) => {
          console.warn('Speech recognition error:', e);
          setIsListening(false);
        };
        instance.onresult = (e: any) => {
          if (e.results && e.results[0] && e.results[0][0]) {
            const text = e.results[0][0].transcript;
            if (onResultRef.current) {
              onResultRef.current(text);
            }
          }
        };

        recognitionRef.current = instance;
      } catch (err) {
        console.warn('Speech recognition init error:', err);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []); // Run only once on mount

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Speech recognition start failed:', err);
      }
    }
  }, [isListening]);

  return {
    isListening,
    isSupported,
    toggleListening,
  };
}
