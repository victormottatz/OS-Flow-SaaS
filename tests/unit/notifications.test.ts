import { describe, it, expect, beforeEach, vi } from "vitest";
import { addNotification } from "../../src/hooks/useNotifications";

describe("Notifications System & Sanitization", () => {
  beforeEach(() => {
    // Mock do localStorage para ambiente Node/Vitest
    const storage: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => storage[key] || null,
      setItem: (key: string, value: string) => { storage[key] = value; },
      removeItem: (key: string) => { delete storage[key]; },
      clear: () => { for (const k in storage) delete storage[k]; }
    });

    vi.stubGlobal("window", {
      dispatchEvent: vi.fn()
    });
  });

  it("deve adicionar uma notificação com campos padrão e ação", () => {
    addNotification(
      "🚀 MGV ONE HUB Atualizado (v4.14.0)",
      "Novidades do sistema",
      "info",
      undefined,
      "open_update_popup"
    );

    const saved = JSON.parse(localStorage.getItem("mgv_notifications") || "[]");
    expect(saved).toHaveLength(1);
    expect(saved[0].title).toBe("🚀 MGV ONE HUB Atualizado (v4.14.0)");
    expect(saved[0].action).toBe("open_update_popup");
    expect(saved[0].read).toBe(false);
    expect(saved[0].createdAt).toBeDefined();
  });

  it("deve lidar defensivamente com localStorage pré-existente corrompido", () => {
    // Simula dado inválido/corrompido no storage
    localStorage.setItem("mgv_notifications", "null");

    expect(() => {
      addNotification("Nova Notificação", "Mensagem de teste");
    }).not.toThrow();

    const saved = JSON.parse(localStorage.getItem("mgv_notifications") || "[]");
    expect(saved).toHaveLength(1);
    expect(saved[0].title).toBe("Nova Notificação");
  });
});
