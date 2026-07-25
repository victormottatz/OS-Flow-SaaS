import { describe, it, expect } from "vitest";
import { convertXmlCfop } from "./tax.utils";

describe("tax.utils - convertXmlCfop", () => {
  it("should convert CFOP 5102 (Tributado Estadual) to 1102 correctly", () => {
    const result = convertXmlCfop("5102");
    expect(result.cfopEntrada).toBe("1102");
    expect(result.isST).toBe(false);
    expect(result.cfopIntraEstadualSaida).toBe("5102");
    expect(result.cfopInterEstadualSaida).toBe("6102");
    expect(result.cstIcms).toBe("102");
  });

  it("should convert CFOP 6102 (Tributado Interestadual) to 2102 correctly", () => {
    const result = convertXmlCfop("6102");
    expect(result.cfopEntrada).toBe("2102");
    expect(result.isST).toBe(false);
    expect(result.cfopIntraEstadualSaida).toBe("5102");
  });

  it("should convert CFOP 5405 (Substituição Tributária Estadual) to 1403 correctly", () => {
    const result = convertXmlCfop("5405");
    expect(result.cfopEntrada).toBe("1403");
    expect(result.isST).toBe(true);
    expect(result.cfopIntraEstadualSaida).toBe("5405");
    expect(result.cfopInterEstadualSaida).toBe("6404");
    expect(result.cstIcms).toBe("500");
  });

  it("should convert CFOP 6405 (Substituição Tributária Interestadual) to 2403 correctly", () => {
    const result = convertXmlCfop("6405");
    expect(result.cfopEntrada).toBe("2403");
    expect(result.isST).toBe(true);
  });

  it("should handle empty or unmapped CFOPs gracefully", () => {
    const result = convertXmlCfop("9999");
    expect(result.cfopEntrada).toBe("");
    expect(result.cstIcms).toBe("102"); // Fallback padrão
  });
});
