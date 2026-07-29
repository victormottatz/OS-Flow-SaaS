/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, test, expect } from "vitest";
import { matchClient, matchOS, normalizeText, extractDigits } from "./searchUtils";

describe("searchUtils", () => {
  const sampleClient = {
    id: "client-1",
    name: "João da Silva Conceição",
    cpfCnpj: "123.456.789-00",
    phone: "(11) 98765-4321",
    phone2: "(11) 3218-9900",
    email: "joao.silva@email.com",
    address: "Av. Tiradentes, 850 - Centro - São Paulo / SP",
    deletedAt: null,
    devices: [
      {
        id: "device-1",
        clientId: "client-1",
        type: "Notebook",
        brand: "Dell",
        model: "Inspiron 15",
        serialNumber: "SN-998877",
        description: "Notebook cinza com adesivo",
        deletedAt: null
      }
    ]
  };

  const sampleOS = {
    id: "os-1",
    osNumber: "OS-0042",
    clientId: "client-1",
    deviceId: "device-1",
    reportedDefect: "Não liga após queda de energia",
    diagnostic: "Placa mãe com curto no circuito primário",
    accessoriesLeft: "Fonte de alimentação de 65W",
    physicalState: "Marcas leves de uso",
    client: sampleClient,
    device: sampleClient.devices[0],
    deletedAt: null
  };

  test("normalizeText deve remover acentos e converter para minúsculas", () => {
    expect(normalizeText("Conceição")).toBe("conceicao");
    expect(normalizeText("SÃO PAULO")).toBe("sao paulo");
  });

  test("extractDigits deve manter apenas caracteres numéricos", () => {
    expect(extractDigits("(11) 98765-4321")).toBe("11987654321");
    expect(extractDigits("123.456.789-00")).toBe("12345678900");
  });

  test("matchClient deve encontrar cliente pelos últimos dígitos do telefone", () => {
    expect(matchClient(sampleClient, "4321")).toBe(true);
    expect(matchClient(sampleClient, "9900")).toBe(true);
    expect(matchClient(sampleClient, "987654321")).toBe(true);
  });

  test("matchClient deve encontrar cliente por CPF sem pontuação", () => {
    expect(matchClient(sampleClient, "12345678900")).toBe(true);
    expect(matchClient(sampleClient, "456789")).toBe(true);
  });

  test("matchClient deve encontrar cliente por nome sem acento", () => {
    expect(matchClient(sampleClient, "joao")).toBe(true);
    expect(matchClient(sampleClient, "conceicao")).toBe(true);
  });

  test("matchClient deve encontrar cliente por equipamento vinculado", () => {
    expect(matchClient(sampleClient, "Inspiron")).toBe(true);
    expect(matchClient(sampleClient, "998877")).toBe(true);
  });

  test("matchOS deve encontrar OS por número, defeito, laudo ou cliente", () => {
    expect(matchOS(sampleOS, "0042")).toBe(true);
    expect(matchOS(sampleOS, "4321")).toBe(true);
    expect(matchOS(sampleOS, "queda de energia")).toBe(true);
    expect(matchOS(sampleOS, "placa mae")).toBe(true);
  });
});
