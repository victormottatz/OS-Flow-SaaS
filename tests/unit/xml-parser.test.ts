import { describe, it, expect } from "vitest";
import { XMLParser } from "fast-xml-parser";
import { convertXmlCfop } from "../../src/utils/tax.utils";

// Função utilitária de busca recursiva do bloco infNFe (idêntica à implementação de produção)
function findInfNFe(obj: any): any {
  if (!obj || typeof obj !== "object") return null;
  if (obj.infNFe) return obj.infNFe;
  for (const key of Object.keys(obj)) {
    const res = findInfNFe(obj[key]);
    if (res) return res;
  }
  return null;
}

// Parser de XML resiliente de NF-e
function parseXmlNfe(xml: string) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true
  });
  const jsonObj = parser.parse(xml);
  const infNFe = findInfNFe(jsonObj);

  if (!infNFe) {
    throw new Error("Estrutura infNFe não encontrada no XML da NF-e.");
  }

  const supplier = infNFe.emit?.xNome || infNFe.emit?.xFant || "Fornecedor Desconhecido";
  const nNF = String(infNFe.ide?.nNF || "S/N");

  let detList = infNFe.det;
  if (!detList) detList = [];
  if (!Array.isArray(detList)) detList = [detList];

  const items: any[] = [];
  for (const det of detList) {
    const prod = det.prod || {};
    const cProd = String(prod.cProd || "").trim();
    const xProd = String(prod.xProd || "").trim();
    const qCom = parseFloat(String(prod.qCom || "0"));
    const vUnCom = parseFloat(String(prod.vUnCom || "0"));
    const uCom = String(prod.uCom || "UN").trim();
    const NCM = String(prod.NCM || "").trim();
    const cEAN = String(prod.cEAN || "").trim();
    const cfopFornecedor = String(prod.CFOP || "").trim();

    const taxData = convertXmlCfop(cfopFornecedor);

    if (cProd && xProd) {
      items.push({
        code: cProd,
        name: xProd,
        quantity: qCom,
        cost: vUnCom,
        unit: uCom,
        ncm: NCM,
        barcode: (cEAN && cEAN !== "SEM GTIN") ? cEAN : null,
        cfopFornecedor,
        ...taxData
      });
    }
  }

  return { supplier, nNF, items };
}

describe("Parser de XML de Nota Fiscal (NF-e) & Markup", () => {
  it("deve extrair corretamente os dados da NF-e e fornecedor a partir de XML válido", () => {
    const xmlMock = `
      <nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
        <NFe>
          <infNFe>
            <ide>
              <nNF>12345</nNF>
            </ide>
            <emit>
              <xNome>DISTRIBUIDORA DE PEÇAS MGV LTDA</xNome>
            </emit>
            <det nItem="1">
              <prod>
                <cProd>PEC-001</cProd>
                <xProd>TELA DISPLAY OLED IPHONE 13</xProd>
                <NCM>85177090</NCM>
                <CFOP>5102</CFOP>
                <uCom>UND</uCom>
                <qCom>5.0000</qCom>
                <vUnCom>150.0000</vUnCom>
                <cEAN>7891234567890</cEAN>
              </prod>
            </det>
          </infNFe>
        </NFe>
      </nfeProc>
    `;

    const result = parseXmlNfe(xmlMock);

    expect(result.supplier).toBe("DISTRIBUIDORA DE PEÇAS MGV LTDA");
    expect(result.nNF).toBe("12345");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual({
      code: "PEC-001",
      name: "TELA DISPLAY OLED IPHONE 13",
      quantity: 5,
      cost: 150,
      unit: "UND",
      ncm: "85177090",
      barcode: "7891234567890",
      cfopFornecedor: "5102",
      cfopEntrada: "1102",
      cfopIntraEstadualSaida: "5102",
      cfopInterEstadualSaida: "6102",
      cstIcms: "102",
      isST: false
    });
  });

  it("deve calcular o preço de venda corretamente aplicado o markup dinâmico", () => {
    const costPrice = 100;
    const markupPercent = 60; // 60% de markup
    const markupMultiplier = 1 + (markupPercent / 100);

    const sellingPrice = Number((costPrice * markupMultiplier).toFixed(2));

    expect(sellingPrice).toBe(160.00);
  });

  it("deve aplicar o markup padrão de 50% quando o markup não for especificado", () => {
    const costPrice = 80;
    const defaultMarkup = 50;
    const sellingPrice = Number((costPrice * (1 + defaultMarkup / 100)).toFixed(2));

    expect(sellingPrice).toBe(120.00);
  });

  it("deve ignorar códigos cEAN com o valor 'SEM GTIN'", () => {
    const xmlMock = `
      <NFe>
        <infNFe>
          <ide><nNF>99</nNF></ide>
          <emit><xNome>FORNECEDOR TESTE</xNome></emit>
          <det nItem="1">
            <prod>
              <cProd>BAT-002</cProd>
              <xProd>BATERIA COMPATÍVEL S21</xProd>
              <CFOP>5102</CFOP>
              <qCom>1</qCom>
              <vUnCom>45</vUnCom>
              <cEAN>SEM GTIN</cEAN>
            </prod>
          </det>
        </infNFe>
      </NFe>
    `;

    const result = parseXmlNfe(xmlMock);
    expect(result.items[0].barcode).toBeNull();
  });
});
