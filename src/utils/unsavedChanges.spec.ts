import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  markUnsavedChanges,
  hasUnsavedChanges,
  installUnsavedChangesGuard,
} from "./unsavedChanges";

describe("guarda de alterações não salvas (unsavedChanges)", () => {
  beforeEach(() => {
    // Zera o contador global entre os testes
    while (hasUnsavedChanges()) {
      markUnsavedChanges(false);
    }
  });

  it("começa sem alterações não salvas", () => {
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("marca e desmarca alterações não salvas", () => {
    markUnsavedChanges(true);
    expect(hasUnsavedChanges()).toBe(true);

    markUnsavedChanges(false);
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("suporta múltiplos formulários sujos simultaneamente (contador)", () => {
    markUnsavedChanges(true); // formulário A
    markUnsavedChanges(true); // formulário B
    expect(hasUnsavedChanges()).toBe(true);

    markUnsavedChanges(false); // formulário A limpo
    expect(hasUnsavedChanges()).toBe(true); // B ainda sujo

    markUnsavedChanges(false); // formulário B limpo
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("não deixa o contador ficar negativo", () => {
    markUnsavedChanges(false);
    markUnsavedChanges(false);
    expect(hasUnsavedChanges()).toBe(false);
  });

  it("instala o listener beforeunload e bloqueia o reload apenas quando há trabalho não salvo", () => {
    const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
    const fakeWindow = {
      addEventListener: vi.fn((type: string, fn: (...args: unknown[]) => void) => {
        (listeners[type] ||= []).push(fn);
      }),
      removeEventListener: vi.fn((type: string, fn: (...args: unknown[]) => void) => {
        listeners[type] = (listeners[type] || []).filter((f) => f !== fn);
      }),
    };
    (globalThis as unknown as { window: unknown }).window = fakeWindow;

    const cleanup = installUnsavedChangesGuard();
    expect(fakeWindow.addEventListener).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    expect(listeners["beforeunload"]).toHaveLength(1);

    // Sem alterações não salvas: o handler não bloqueia
    const cleanEvent = { preventDefault: vi.fn() };
    listeners["beforeunload"][0](cleanEvent);
    expect(cleanEvent.preventDefault).not.toHaveBeenCalled();

    // Com alterações não salvas: bloqueia e define returnValue (padrão dos navegadores)
    markUnsavedChanges(true);
    const dirtyEvent = { preventDefault: vi.fn(), returnValue: "" };
    listeners["beforeunload"][0](dirtyEvent);
    expect(dirtyEvent.preventDefault).toHaveBeenCalled();
    expect(dirtyEvent.returnValue).toBe("");
    markUnsavedChanges(false);

    cleanup();
    expect(fakeWindow.removeEventListener).toHaveBeenCalledWith("beforeunload", expect.any(Function));
    expect(listeners["beforeunload"]).toHaveLength(0);
  });
});
