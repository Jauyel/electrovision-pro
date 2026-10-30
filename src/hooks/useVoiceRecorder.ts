import { useState, useRef, useEffect, useCallback } from 'react';

// TypeScript declaration for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface UseVoiceRecorderOptions {
  language?: string; // 'en-US' | 'uz-UZ' | 'ru-RU'
  onTranscriptComplete?: (finalTranscript: string) => void;
}

export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}) {
  const { language = 'en-US', onTranscriptComplete } = options;

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [micPermission, setMicPermission] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(16).fill(4));
  const [error, setError] = useState<string | null>(null);

  // References
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptAccumulatedRef = useRef<string>('');

  // Determine speech recognition support
  const isSpeechSupported = typeof window !== 'undefined' && 
    (Boolean(window.SpeechRecognition) || Boolean(window.webkitSpeechRecognition));

  // Audio waveform animation loop
  const startAudioVisualizer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateWaveform = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);

        // Sample 16 discrete bands for the UI equalizer
        const sampled: number[] = [];
        const step = Math.floor(bufferLength / 16) || 1;
        for (let i = 0; i < 16; i++) {
          const val = dataArray[i * step] || 0;
          // Scale to 4 - 36px height
          const height = Math.max(4, Math.round((val / 255) * 36));
          sampled.push(height);
        }
        setAudioLevels(sampled);

        animFrameRef.current = requestAnimationFrame(updateWaveform);
      };

      updateWaveform();
    } catch (e) {
      console.warn('AudioContext visualizer initialization failed:', e);
    }
  };

  const stopAudioVisualizer = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevels(new Array(16).fill(4));
  };

  // Start voice recording session
  const startRecording = useCallback(async () => {
    setError(null);
    setAudioBlobUrl(null);
    setInterimTranscript('');
    audioChunksRef.current = [];

    // Keep existing transcript if appending or reset if empty
    transcriptAccumulatedRef.current = transcript ? transcript + ' ' : '';

    try {
      // 1. Request microphone access for both MediaRecorder and Audio Visualizer
      let stream: MediaStream | null = null;
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioStreamRef.current = stream;
          setMicPermission('granted');
          startAudioVisualizer(stream);

          // Setup MediaRecorder for actual audio clip playback
          if (typeof MediaRecorder !== 'undefined') {
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
              }
            };

            mediaRecorder.onstop = () => {
              if (audioChunksRef.current.length > 0) {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(audioBlob);
                setAudioBlobUrl(url);
              }
            };

            mediaRecorder.start(250); // Slice every 250ms
          }
        } catch (micErr: any) {
          console.warn('Microphone permission denied or device busy:', micErr);
          setMicPermission('denied');
          // Proceed with speech recognition fallback or simulated input
        }
      } else {
        setMicPermission('unsupported');
      }

      // 2. Initialize Web Speech API SpeechRecognition
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (SpeechRecognitionClass) {
        const recognition = new SpeechRecognitionClass();
        recognitionRef.current = recognition;

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US';

        recognition.onstart = () => {
          setIsRecording(true);
        };

        recognition.onresult = (event: any) => {
          let interim = '';
          let finalChunk = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const piece = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalChunk += piece;
            } else {
              interim += piece;
            }
          }

          if (finalChunk) {
            transcriptAccumulatedRef.current += finalChunk + ' ';
            setTranscript(transcriptAccumulatedRef.current.trim());
          }
          setInterimTranscript(interim);
        };

        recognition.onerror = (event: any) => {
          console.warn('SpeechRecognition error:', event.error);
          if (event.error !== 'no-speech') {
            setError(`Speech recognition: ${event.error}`);
          }
        };

        recognition.onend = () => {
          // If still recording flag is true (e.g. mobile browser stopped after pause), restart or finish
          setInterimTranscript('');
        };

        try {
          recognition.start();
        } catch (e) {
          console.warn('Speech recognition start failed:', e);
        }
      } else {
        // Fallback simulated equalizer & manual input mode
        setIsRecording(true);
      }

      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration timer
      if (timerRef.current) clearInterval(timerRef.current);
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

    } catch (err: any) {
      setError(err?.message || 'Failed to start recording');
      setIsRecording(false);
    }
  }, [language, transcript]);

  // Stop recording session
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setInterimTranscript('');

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop Speech Recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore
      }
    }

    // Stop Microphone Stream Tracks
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }

    stopAudioVisualizer();

    const finalResult = (transcriptAccumulatedRef.current || transcript).trim();
    if (finalResult && onTranscriptComplete) {
      onTranscriptComplete(finalResult);
    }
  }, [onTranscriptComplete, transcript]);

  // Reset transcript and audio
  const resetRecording = useCallback(() => {
    stopRecording();
    setTranscript('');
    setInterimTranscript('');
    setRecordingDuration(0);
    setAudioBlobUrl(null);
    transcriptAccumulatedRef.current = '';
  }, [stopRecording]);

  // Read back text aloud using SpeechSynthesis
  const speakTranscript = useCallback((textToSpeak: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel(); // Stop any pending speech
    const utterance = new SpeechSynthesisUtterance(textToSpeak || transcript);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US';
    window.speechSynthesis.speak(utterance);
  }, [language, transcript]);

  // Preset phrase quick inserter
  const insertPreset = useCallback((presetText: string) => {
    setTranscript(prev => {
      const updated = prev ? `${prev}. ${presetText}` : presetText;
      transcriptAccumulatedRef.current = updated;
      return updated;
    });
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  return {
    isRecording,
    transcript,
    interimTranscript,
    recordingDuration,
    audioBlobUrl,
    audioLevels,
    micPermission,
    error,
    isSpeechSupported,
    startRecording,
    stopRecording,
    resetRecording,
    setTranscript,
    speakTranscript,
    insertPreset
  };
}
