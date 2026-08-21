import React, { useState, useRef, useEffect } from "react";

interface WhatsAppAudioRecorderProps {
  onSendAudio: (audioBase64: string) => Promise<void>;
  onCancel: () => void;
}

export default function WhatsAppAudioRecorder({ onSendAudio, onCancel }: WhatsAppAudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopRecordingCleanup();
    };
  }, []);

  const startRecording = async () => {
    setErrorMessage(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Gravação de áudio não suportada neste navegador.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      let options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        options = { mimeType: "audio/webm;codecs=opus" };
      } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        options = { mimeType: "audio/ogg;codecs=opus" };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        setIsRecording(true);
        setRecordingSeconds(0);
        timerIntervalRef.current = setInterval(() => {
          setRecordingSeconds(prev => prev + 1);
        }, 1000);
      };

      mediaRecorder.start(100);
    } catch (err: any) {
      console.error("Erro ao acessar microfone:", err);
      setErrorMessage(err.message || "Permissão de microfone negada.");
    }
  };

  const stopRecordingCleanup = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  const handleCancel = () => {
    stopRecordingCleanup();
    onCancel();
  };

  const handleSend = async () => {
    if (!mediaRecorderRef.current || isProcessing) return;
    setIsProcessing(true);

    const recorder = mediaRecorderRef.current;
    
    recorder.onstop = async () => {
      try {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/ogg"
        });

        // Converte Blob para Base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = reader.result as string;
          try {
            await onSendAudio(base64Data);
            onCancel(); // Fecha a barra de gravação após o envio
          } catch (sendErr: any) {
            setErrorMessage("Erro ao enviar gravação de áudio.");
            setIsProcessing(false);
          }
        };
      } catch (err: any) {
        setErrorMessage("Falha ao processar arquivo de áudio.");
        setIsProcessing(false);
      }
    };

    recorder.stop();
    recorder.stream.getTracks().forEach(t => t.stop());
  };

  const formatSeconds = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (errorMessage) {
    return (
      <div className="flex items-center justify-between w-full p-2 bg-red-950/40 border border-red-900/60 rounded-2xl text-xs text-red-300">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>
          <span>{errorMessage}</span>
        </div>
        <button
          type="button"
          onClick={handleCancel}
          className="px-3 py-1 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-xl font-bold text-[11px]"
        >
          Fechar
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-2 shadow-inner animate-fadein">
      {/* Indicador de Gravação e Timer */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 absolute" />
        </div>
        <span className="text-xs font-mono font-bold text-white tracking-widest">
          {formatSeconds(recordingSeconds)}
        </span>
        <span className="text-[11px] text-slate-400 font-medium">Gravando mensagem de voz...</span>
      </div>

      {/* Ações de Cancelar e Enviar */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={isProcessing}
          className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
          title="Descartar gravação"
        >
          <span className="material-symbols-outlined text-xl">delete</span>
        </button>

        <button
          type="button"
          onClick={handleSend}
          disabled={isProcessing}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
          title="Enviar áudio"
        >
          {isProcessing ? (
            <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
          ) : (
            <>
              <span className="material-symbols-outlined text-base">send</span>
              <span>Enviar Áudio</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
