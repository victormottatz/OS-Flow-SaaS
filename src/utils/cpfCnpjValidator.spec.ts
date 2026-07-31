import { describe, test, expect } from "vitest";
import { isValidCPF, isValidCNPJ, isValidCpfOrCnpj } from "./cpfCnpjValidator";

describe("cpfCnpjValidator", () => {
  describe("isValidCPF", () => {
    test("deve validar CPFs válidos com e sem pontuação", () => {
      expect(isValidCPF("529.982.247-25")).toBe(true);
      expect(isValidCPF("52998224725")).toBe(true);
      expect(isValidCPF("111.444.777-35")).toBe(true);
    });

    test("deve rejeitar CPF fictício sem DV correto (ex: 12345678910)", () => {
      expect(isValidCPF("12345678910")).toBe(false);
      expect(isValidCPF("123.456.789-10")).toBe(false);
    });

    test("deve rejeitar CPFs com dígitos repetidos", () => {
      expect(isValidCPF("111.111.111-11")).toBe(false);
      expect(isValidCPF("00000000000")).toBe(false);
      expect(isValidCPF("999.999.999-99")).toBe(false);
    });

    test("deve rejeitar CPFs com tamanho incorreto", () => {
      expect(isValidCPF("123456789")).toBe(false);
      expect(isValidCPF("123456789012")).toBe(false);
      expect(isValidCPF("")).toBe(false);
    });
  });

  describe("isValidCNPJ", () => {
    test("deve validar CNPJ válido com e sem pontuação", () => {
      expect(isValidCNPJ("11.222.333/0001-81")).toBe(true);
      expect(isValidCNPJ("11222333000181")).toBe(true);
    });

    test("deve rejeitar CNPJ com dígito verificador incorreto", () => {
      expect(isValidCNPJ("11.222.333/0001-82")).toBe(false);
    });

    test("deve rejeitar CNPJs com dígitos repetidos", () => {
      expect(isValidCNPJ("00.000.000/0000-00")).toBe(false);
      expect(isValidCNPJ("11111111111111")).toBe(false);
    });
  });

  describe("isValidCpfOrCnpj", () => {
    test("deve identificar e validar CPF válido", () => {
      const res = isValidCpfOrCnpj("529.982.247-25");
      expect(res.valid).toBe(true);
      expect(res.type).toBe("CPF");
      expect(res.message).toBeUndefined();
    });

    test("deve identificar e rejeitar CPF inválido com mensagem clara", () => {
      const res = isValidCpfOrCnpj("123.456.789-10");
      expect(res.valid).toBe(false);
      expect(res.type).toBe("CPF");
      expect(res.message).toContain("CPF inválido");
    });

    test("deve rejeitar documentos de tamanho arbitrário", () => {
      const res = isValidCpfOrCnpj("12345");
      expect(res.valid).toBe(false);
      expect(res.type).toBe("INVALID");
      expect(res.message).toContain("tamanho inválido");
    });
  });
});
