import React, { useState, useRef, useEffect } from "react";

interface WhatsAppAudioPlayerProps {
  src: string;
  isMine?: boolean;
}

export default function WhatsAppAudioPlayer({ src, isMine = false }: WhatsAppAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [hasError, setHasError] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Formata segundos em mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const togglePlay = () => {
    if (!audioRef.current || hasError) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => {
        console.warn("Erro ao reproduzir áudio:", err);
        setHasError(true);
      });
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
      setHasError(false);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const cycleSpeed = () => {
    const rates = [1, 1.5, 2];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIndex];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (hasError) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs">
        <span className="material-symbols-outlined text-amber-400 text-base">warning</span>
        <span className="truncate">Áudio indisponível</span>
        <a
          href={src}
          download="audio.ogg"
          className="ml-auto text-secondary-container hover:underline text-[10px] font-bold"
        >
          Baixar
        </a>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1.5 p-2.5 rounded-xl ${isMine ? "bg-emerald-950/40 border border-emerald-800/40" : "bg-slate-950/60 border border-slate-800"} w-full max-w-[320px]`}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={() => setHasError(true)}
      />

      <div className="flex items-center gap-3">
        {/* Botão Play / Pause */}
        <button
          type="button"
          onClick={togglePlay}
          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 shadow-md ${
            isMine
              ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
              : "bg-secondary-container text-primary-container hover:bg-secondary-container-hover"
          }`}
          title={isPlaying ? "Pausar" : "Reproduzir"}
        >
          <span className="material-symbols-outlined text-xl">
            {isPlaying ? "pause" : "play_arrow"}
          </span>
        </button>

        {/* Barra de Progresso e Formato de Onda Simulado */}
        <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
          <div className="relative w-full flex items-center">
            {/* Input range customizado e estilizado */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-700/60 accent-secondary-container focus:outline-none"
              style={{
                background: `linear-gradient(to right, ${isMine ? "#10b981" : "#38bdf8"} ${progressPercent}%, rgba(51, 65, 85, 0.6) ${progressPercent}%)`
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] opacity-75 font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{duration ? formatTime(duration) : "--:--"}</span>
          </div>
        </div>

        {/* Botão de Velocidade (1x / 1.5x / 2x) */}
        <button
          type="button"
          onClick={cycleSpeed}
          className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-[10px] font-bold tracking-wider transition-all border border-slate-700 flex-shrink-0"
          title="Alterar velocidade de reprodução"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
}
