import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseSpeechRecognitionOptions {
  lang?: 'en-US' | 'ur-PK';
  continuous?: boolean;
  interimResults?: boolean;
}

export function useSpeechRecognition(
  onResult: (transcript: string, isFinal: boolean) => void,
  options?: UseSpeechRecognitionOptions
) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [lastError, setLastError] = useState<string | null>(null);
  const onResultRef = useRef(onResult);
  const recognitionRef = useRef<any>(null);

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
        instance.continuous = options?.continuous ?? false;
        instance.interimResults = options?.interimResults ?? true;
        instance.lang = options?.lang || 'en-US';

        instance.onstart = () => {
          setIsListening(true);
          setLastError(null);
        };
        instance.onend = () => {
          setIsListening(false);
        };
        instance.onerror = (e: any) => {
          console.warn('Speech recognition error event:', e?.error || e);
          setIsListening(false);
          if (e?.error === 'not-allowed') {
            setLastError('Microphone permission was denied. Please allow microphone access in your browser.');
          } else if (e?.error === 'no-speech') {
            setLastError('No speech detected. Please speak clearly into the microphone.');
          } else {
            setLastError(`Voice input error: ${e?.error || 'recognition failed'}`);
          }
        };
        instance.onresult = (e: any) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = e.resultIndex; i < e.results.length; i++) {
            const transcript = e.results[i][0].transcript;
            if (e.results[i].isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }

          if (interimTranscript) {
            setInterimText(interimTranscript);
            if (onResultRef.current) {
              onResultRef.current(interimTranscript, false);
            }
          }

          if (finalTranscript) {
            setInterimText('');
            if (onResultRef.current) {
              onResultRef.current(finalTranscript, true);
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
  }, [options?.lang, options?.continuous, options?.interimResults]);

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
        setLastError(null);
        setInterimText('');
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Speech recognition start failed:', err);
      }
    }
  }, [isListening]);

  return {
    isListening,
    isSupported,
    interimText,
    lastError,
    toggleListening,
  };
}

