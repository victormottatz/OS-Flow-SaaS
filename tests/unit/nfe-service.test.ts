import { describe, it, expect } from "vitest";
import { validateFiscalData } from "../../src/services/nfeService";

describe("NfeService - Fiscal Validation Rules", () => {
  const mockClientValido = {
    name: "Clínica Estética Bella",
    cpfCnpj: "045.890.391-41",
    address: "Rua das Flores, 123",
    city: "Ribeirão Preto",
    state: "SP",
    zipCode: "14021-620",
    stateInscription: "123456789"
  };

  const mockPartsDb = [
    {
      id: "part-123",
      name: "Placa Mãe Ultrassom",
      ncm: "8543.70.99",
      cfopIntraEstadual: "5102",
      cfopInterEstadual: "6102",
      cstIcms: "102"
    }
  ];

  it("deve validar com sucesso uma OS com dados corretos", () => {
    const mockOS = {
      usedParts: [
        {
          partId: "part-123",
          isAvulso: false,
          quantity: 1,
          price: 500
        }
      ],
      laborCost: 150
    };

    const result = validateFiscalData(mockOS, mockClientValido, mockPartsDb);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("deve falhar se o cliente não tiver CPF/CNPJ válido", () => {
    const mockOS = { usedParts: [] };
    const invalidClient = { ...mockClientValido, cpfCnpj: "123456" };

    const result = validateFiscalData(mockOS, invalidClient, mockPartsDb);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain("Documento com tamanho inválido");
  });

  it("deve falhar se um produto não tiver NCM válido de 8 dígitos", () => {
    const mockOS = {
      usedParts: [
        {
          partId: "part-123",
          isAvulso: false,
          quantity: 1,
          price: 500
        }
      ]
    };
    const badPartsDb = [
      {
        ...mockPartsDb[0],
        ncm: "123" // NCM inválido
      }
    ];

    const result = validateFiscalData(mockOS, mockClientValido, badPartsDb);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes("NCM inválido"))).toBe(true);
  });

  it("deve avisar se for NFC-e e o endereço for omitido, mas não gerar erro de bloqueio", () => {
    const mockOS = { usedParts: [] };
    const clientSemEndereço = { ...mockClientValido, address: "", city: "", state: "", zipCode: "" };

    const result = validateFiscalData(mockOS, clientSemEndereço, mockPartsDb, { isNfc: true });
    expect(result.isValid).toBe(true);
    expect(result.warnings).toContain("Endereço do cliente não informado. Para NFC-e, o endereço é opcional, mas recomendado.");
  });

  it("deve avisar se for NFS-e e o endereço for omitido, mas não gerar erro de bloqueio", () => {
    const mockOS = { usedParts: [] };
    const clientSemEndereço = { ...mockClientValido, address: "", city: "", state: "", zipCode: "" };

    const result = validateFiscalData(mockOS, clientSemEndereço, mockPartsDb, { isNfse: true });
    expect(result.isValid).toBe(true);
    expect(result.warnings.some(w => w.includes("Para NFS-e, o endereço é opcional, mas recomendado"))).toBe(true);
  });
});
