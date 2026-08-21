import React, { useState, useEffect } from "react";

interface WhatsAppMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "IMAGE" | "DOCUMENT" | "VIDEO";
  src: string;
  fileName?: string;
  title?: string;
}

export default function WhatsAppMediaModal({
  isOpen,
  onClose,
  type,
  src,
  fileName = "arquivo",
  title
}: WhatsAppMediaModalProps) {
  const [zoom, setZoom] = useState(1);

  // Reseta zoom ao abrir
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
    }
  }, [isOpen, src]);

  // Fecha no ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fadein">
      {/* Container Principal */}
      <div className="relative w-full max-w-5xl h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Barra Superior de Controles */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-secondary-container">
              <span className="material-symbols-outlined text-lg">
                {type === "IMAGE" ? "image" : type === "VIDEO" ? "movie" : "picture_as_pdf"}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-white truncate max-w-md">{title || fileName}</h3>
              <p className="text-[10px] text-slate-400">Pré-visualização de Mídia WhatsApp</p>
            </div>
          </div>

          {/* Ações de Topo */}
          <div className="flex items-center gap-2">
            {type === "IMAGE" && (
              <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700 mr-2">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                  title="Diminuir Zoom"
                >
                  <span className="material-symbols-outlined text-base">zoom_out</span>
                </button>
                <span className="px-2 text-[10px] font-mono text-slate-300">{Math.round(zoom * 100)}%</span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                  title="Aumentar Zoom"
                >
                  <span className="material-symbols-outlined text-base">zoom_in</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all text-[10px] font-bold"
                  title="Resetar Zoom"
                >
                  1:1
                </button>
              </div>
            )}

            {/* Botão Baixar */}
            <a
              href={src}
              download={fileName}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary-container text-primary-container hover:bg-secondary-container-hover text-xs font-bold transition-all shadow-md"
              title="Baixar arquivo original"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span>Baixar</span>
            </a>

            {/* Botão Abrir em Nova Aba (para PDFs) */}
            {type === "DOCUMENT" && (
              <a
                href={src}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all border border-slate-700"
                title="Abrir em nova aba"
              >
                <span className="material-symbols-outlined text-base">open_in_new</span>
              </a>
            )}

            {/* Botão Fechar */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-red-500/20 hover:text-red-400 transition-all border border-slate-700 ml-1"
              title="Fechar (ESC)"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>

        {/* Área de Visualização */}
        <div className="flex-1 overflow-auto bg-slate-950 flex items-center justify-center p-4">
          {type === "IMAGE" && (
            <div className="max-w-full max-h-full flex items-center justify-center overflow-auto">
              <img
                src={src}
                alt={fileName}
                className="max-h-[70vh] object-contain rounded-lg transition-transform duration-150 shadow-xl"
                style={{ transform: `scale(${zoom})` }}
              />
            </div>
          )}

          {type === "VIDEO" && (
            <video
              src={src}
              controls
              autoPlay
              className="max-h-[70vh] max-w-full rounded-xl shadow-2xl"
            />
          )}

          {type === "DOCUMENT" && (
            <iframe
              src={`${src}#toolbar=1`}
              title={fileName}
              className="w-full h-full rounded-xl border border-slate-800 bg-slate-900"
            />
          )}
        </div>
      </div>
    </div>
  );
}
