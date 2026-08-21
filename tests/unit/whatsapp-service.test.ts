import { describe, it, expect } from "vitest";
import { formatPhoneNumber, isWithinBusinessHours } from "../../src/services/whatsapp";

describe("WhatsApp Service - Formatação e Governança", () => {
  it("deve formatar números de telefone brasileiros com DDI 55", () => {
    // 11 dígitos (Celular SP)
    expect(formatPhoneNumber("(16) 99104-9631")).toBe("5516991049631");
    expect(formatPhoneNumber("16991049631")).toBe("5516991049631");

    // 10 dígitos (Fixo)
    expect(formatPhoneNumber("(16) 3636-1234")).toBe("551636361234");
    expect(formatPhoneNumber("1636361234")).toBe("551636361234");

    // Já com DDI 55
    expect(formatPhoneNumber("5516991049631")).toBe("5516991049631");

    // Vazio / Nulo
    expect(formatPhoneNumber("")).toBe("");
  });

  it("deve validar se a verificação de horário comercial retorna boolean", () => {
    const within = isWithinBusinessHours();
    expect(typeof within).toBe("boolean");
  });
});
