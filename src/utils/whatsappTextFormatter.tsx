import React from "react";

/**
 * Utilitário para formatar e renderizar textos do WhatsApp em componentes React.
 * Transforma:
 * - *negrito* em <strong>
 * - _itálico_ em <em>
 * - ~tachado~ em <del>
 * - ```código``` em <code>
 * - Links https://... em <a> clicáveis
 * - Quebras de linha em <br /> ou parágrafos preservados
 */
export function formatWhatsAppMessageReact(rawText: string): React.ReactNode {
  if (!rawText) return null;

  // Divide por linhas para preservar quebras estruturadas
  const lines = rawText.split("\n");

  return lines.map((line, lineIdx) => {
    return (
      <React.Fragment key={`line-${lineIdx}`}>
        {lineIdx > 0 && <br />}
        {renderFormattedLine(line)}
      </React.Fragment>
    );
  });
}

function renderFormattedLine(line: string): React.ReactNode {
  if (!line) return null;

  // Regex para capturar links, blocos de código ```...```, negrito *...*, itálico _..._, tachado ~...~
  // Padrão estruturado de substituição de tokens
  const tokenRegex = /(https?:\/\/[^\s]+|```[\s\S]*?```|\*[^*\n\r]+\*|_[^_\n\r]+_|~[^~\n\r]+~)/g;

  const parts = line.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Link URL
    if (/^https?:\/\//i.test(part)) {
      return (
        <a
          key={`link-${index}`}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-400 hover:text-sky-300 underline break-all font-medium transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }

    // Código em bloco / inline ```...```
    if (part.startsWith("```") && part.endsWith("```") && part.length >= 6) {
      const codeContent = part.slice(3, -3);
      return (
        <code
          key={`code-${index}`}
          className="bg-black/40 text-emerald-300 font-mono text-[11px] px-1.5 py-0.5 rounded border border-slate-700/50"
        >
          {codeContent}
        </code>
      );
    }

    // Negrito *...*
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      const boldContent = part.slice(1, -1);
      return (
        <strong key={`bold-${index}`} className="font-bold text-white tracking-wide">
          {boldContent}
        </strong>
      );
    }

    // Itálico _..._
    if (part.startsWith("_") && part.endsWith("_") && part.length >= 2) {
      const italicContent = part.slice(1, -1);
      return (
        <em key={`italic-${index}`} className="italic opacity-90">
          {italicContent}
        </em>
      );
    }

    // Tachado ~...~
    if (part.startsWith("~") && part.endsWith("~") && part.length >= 2) {
      const strikeContent = part.slice(1, -1);
      return (
        <del key={`strike-${index}`} className="line-through opacity-70">
          {strikeContent}
        </del>
      );
    }

    return <span key={`text-${index}`}>{part}</span>;
  });
}
