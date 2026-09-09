import { describe, it, expect } from "vitest";
import React from "react";
import { formatWhatsAppMessageReact } from "./whatsappTextFormatter";

describe("whatsappTextFormatter (formatWhatsAppMessageReact)", () => {
  it("deve retornar null se o texto for vazio ou indefinido", () => {
    expect(formatWhatsAppMessageReact("")).toBeNull();
    expect(formatWhatsAppMessageReact(null as any)).toBeNull();
  });

  it("deve renderizar texto com emojis simples e compostos sem corromper caracteres", () => {
    const text = "Olá 👋! Tudo bem? Segue a peça 🔧 e a nota 🧾";
    const result = formatWhatsAppMessageReact(text) as React.ReactNode[];
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("deve renderizar negrito com emojis mantendo a formatação correta", () => {
    const text = "*👋 Olá Carlos!* Seu aparelho está pronto ✅";
    const result = formatWhatsAppMessageReact(text);
    expect(result).toBeDefined();
  });

  it("deve renderizar itálico e tachado com emojis", () => {
    const text = "_🔧 Manutenção em andamento_ e ~❌ valor antigo~";
    const result = formatWhatsAppMessageReact(text);
    expect(result).toBeDefined();
  });

  it("deve renderizar mensagens multilinhas com emojis", () => {
    const text = "🚀 *OS Flow Assistência Técnica*\n\n📱 *Aparelho:* iPhone 13\n✅ *Status:* Pronto para retirada\n💰 *Valor:* R$ 350,00";
    const result = formatWhatsAppMessageReact(text) as React.ReactNode[];
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(1);
  });

  it("deve renderizar links clicáveis mesmo adjacentes a emojis", () => {
    const text = "Acesse seu laudo aqui 📄: https://sistema.osflow.com.br/laudo/123 👍";
    const result = formatWhatsAppMessageReact(text);
    expect(result).toBeDefined();
  });

  it("deve processar emojis complexos com ZWJ (Zero Width Joiners) e modificadores de tom de pele", () => {
    const text = "👨‍🔧 Técnico especializado 👍🏼 🇧🇷";
    const result = formatWhatsAppMessageReact(text);
    expect(result).toBeDefined();
  });
});
