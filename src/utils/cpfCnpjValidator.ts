/**
 * Utilitários para Validação Matemática de CPF e CNPJ (Módulo 11)
 */

/**
 * Valida se a string fornecida representa um CPF matematicamente válido.
 * @param cpf Número de CPF (pode conter pontos e hífen ou apenas números)
 */
export function isValidCPF(cpf: string): boolean {
  if (!cpf) return false;

  const cleanCpf = cpf.replace(/\D/g, "");

  // Deve ter exatamente 11 dígitos
  if (cleanCpf.length !== 11) return false;

  // Rejeita CPFs com todos os dígitos iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cleanCpf)) return false;

  // Validação do 1º Dígito Verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCpf.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCpf.charAt(9), 10)) return false;

  // Validação do 2º Dígito Verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCpf.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleanCpf.charAt(10), 10)) return false;

  return true;
}

/**
 * Valida se a string fornecida representa um CNPJ matematicamente válido.
 * @param cnpj Número de CNPJ (pode conter pontuação ou apenas números)
 */
export function isValidCNPJ(cnpj: string): boolean {
  if (!cnpj) return false;

  const cleanCnpj = cnpj.replace(/\D/g, "");

  // Deve ter exatamente 14 dígitos
  if (cleanCnpj.length !== 14) return false;

  // Rejeita CNPJs com todos os dígitos iguais
  if (/^(\d)\1{13}$/.test(cleanCnpj)) return false;

  // Validação do 1º Dígito Verificador
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCnpj.charAt(i), 10) * weights1[i];
  }
  let rev = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (rev !== parseInt(cleanCnpj.charAt(12), 10)) return false;

  // Validação do 2º Dígito Verificador
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCnpj.charAt(i), 10) * weights2[i];
  }
  rev = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (rev !== parseInt(cleanCnpj.charAt(13), 10)) return false;

  return true;
}

/**
 * Valida se o documento fornecido é um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.
 * @param doc Número do documento (CPF ou CNPJ)
 */
export function isValidCpfOrCnpj(doc: string): { valid: boolean; type: "CPF" | "CNPJ" | "INVALID"; message?: string } {
  if (!doc || !doc.trim()) {
    return { valid: false, type: "INVALID", message: "O número do documento (CPF/CNPJ) é obrigatório." };
  }

  const clean = doc.replace(/\D/g, "");

  if (clean.length === 11) {
    const valid = isValidCPF(clean);
    return {
      valid,
      type: "CPF",
      message: valid ? undefined : "CPF inválido. Por favor, verifique se digitou todos os números corretamente."
    };
  }

  if (clean.length === 14) {
    const valid = isValidCNPJ(clean);
    return {
      valid,
      type: "CNPJ",
      message: valid ? undefined : "CNPJ inválido. Por favor, verifique se digitou todos os números corretamente."
    };
  }

  return {
    valid: false,
    type: "INVALID",
    message: `Documento com tamanho inválido (${clean.length} dígitos). Um CPF deve conter 11 dígitos e um CNPJ 14 dígitos.`
  };
}
