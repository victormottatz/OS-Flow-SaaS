/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Client, Device } from "../types";

/**
 * Remove acentuação e converte para minúsculas
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Extrai apenas caracteres numéricos (dígitos)
 */
export function extractDigits(text: string | null | undefined): string {
  if (!text) return "";
  return text.toString().replace(/\D/g, "");
}

/**
 * Verifica se uma busca bate com os dados de um cliente ou de seus equipamentos vinculados
 */
export function matchClient(
  client: (Client & { devices?: Device[]; phone2?: string }) | null | undefined,
  query: string
): boolean {
  if (!client) return false;
  if (!query || !query.trim()) return true;
  if ((client as any).deletedAt) return false;

  const queryClean = normalizeText(query);
  const queryDigits = extractDigits(query);

  // 1. Nome, E-mail, Endereço
  const nameClean = normalizeText(client.name);
  const emailClean = normalizeText(client.email);
  const addressClean = normalizeText(client.address);

  if (
    nameClean.includes(queryClean) ||
    emailClean.includes(queryClean) ||
    addressClean.includes(queryClean)
  ) {
    return true;
  }

  // 2. CPF/CNPJ
  const docClean = normalizeText(client.cpfCnpj);
  const docDigits = extractDigits(client.cpfCnpj);
  if (docClean.includes(queryClean) || (queryDigits && docDigits.includes(queryDigits))) {
    return true;
  }

  // 3. Telefones
  const phone1Clean = normalizeText(client.phone);
  const phone1Digits = extractDigits(client.phone);
  if (phone1Clean.includes(queryClean) || (queryDigits && phone1Digits.includes(queryDigits))) {
    return true;
  }

  if (client.phone2) {
    const phone2Clean = normalizeText(client.phone2);
    const phone2Digits = extractDigits(client.phone2);
    if (phone2Clean.includes(queryClean) || (queryDigits && phone2Digits.includes(queryDigits))) {
      return true;
    }
  }

  // 4. Equipamentos vinculados
  if (client.devices && Array.isArray(client.devices)) {
    const hasDeviceMatch = client.devices.some(d => {
      if ((d as any).deletedAt) return false;
      const brandClean = normalizeText(d.brand);
      const modelClean = normalizeText(d.model);
      const serialClean = normalizeText(d.serialNumber);
      const typeClean = normalizeText(d.type);
      const descClean = normalizeText(d.description);
      const serialDigits = extractDigits(d.serialNumber);

      return (
        brandClean.includes(queryClean) ||
        modelClean.includes(queryClean) ||
        serialClean.includes(queryClean) ||
        typeClean.includes(queryClean) ||
        descClean.includes(queryClean) ||
        (queryDigits.length >= 2 && serialDigits.includes(queryDigits))
      );
    });

    if (hasDeviceMatch) return true;
  }

  return false;
}

/**
 * Verifica se uma busca bate com os dados de uma Ordem de Serviço
 */
export function matchOS(os: any, query: string): boolean {
  if (!os) return false;
  if (!query || !query.trim()) return true;
  if (os.deletedAt) return false;

  const queryClean = normalizeText(query);
  const queryDigits = extractDigits(query);

  // 1. Nº da OS
  const osNumClean = normalizeText(os.osNumber);
  const osNumDigits = extractDigits(os.osNumber);
  if (osNumClean.includes(queryClean) || (queryDigits && osNumDigits.includes(queryDigits))) {
    return true;
  }

  // 2. Defeito, Diagnóstico, Acessórios, Estado Físico
  const defectClean = normalizeText(os.reportedDefect);
  const diagClean = normalizeText(os.diagnostic);
  const accClean = normalizeText(os.accessoriesLeft);
  const physClean = normalizeText(os.physicalState);

  if (
    defectClean.includes(queryClean) ||
    diagClean.includes(queryClean) ||
    accClean.includes(queryClean) ||
    physClean.includes(queryClean)
  ) {
    return true;
  }

  // 3. Cliente associado à OS
  if (os.client && matchClient(os.client, query)) {
    return true;
  }

  // 4. Dispositivo associado à OS
  if (os.device) {
    const brandClean = normalizeText(os.device.brand);
    const modelClean = normalizeText(os.device.model);
    const serialClean = normalizeText(os.device.serialNumber);
    const typeClean = normalizeText(os.device.type);
    const descClean = normalizeText(os.device.description);
    const serialDigits = extractDigits(os.device.serialNumber);

    if (
      brandClean.includes(queryClean) ||
      modelClean.includes(queryClean) ||
      serialClean.includes(queryClean) ||
      typeClean.includes(queryClean) ||
      descClean.includes(queryClean) ||
      (queryDigits && serialDigits.length >= 2 && serialDigits.includes(queryDigits))
    ) {
      return true;
    }
  }

  return false;
}
