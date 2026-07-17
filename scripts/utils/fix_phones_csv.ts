import fs from 'fs';

// Função para validar CPF
function isValidCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;
  soma = 0;
  for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;
  return true;
}

// Função para validar CNPJ
function isValidCNPJ(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]+/g, '');
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  const digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;
  tamanho = tamanho + 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;
  return true;
}

function fixPhonesAndCPF() {
  const filePath = 'data/clientes_bling_final.csv';
  if (!fs.existsSync(filePath)) {
    console.log('Arquivo não encontrado:', filePath);
    return;
  }
  
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const lines = fileContent.split('\n');
  
  if (lines.length === 0) return;

  const header = lines[0];
  const dataLines = lines.slice(1);
  const fixedLines = [header];

  for (let line of dataLines) {
    if (line.trim().length === 0) continue;

    const cols = line.split(';');
    
    // indexes: 
    // 12 = Fone, 14 = Celular
    // 17 = Tipo_pessoa, 18 = CNPJ_CPF

    // 1. Validar CPF e CNPJ matematicamente
    let rawCpfCnpj = cols[18]?.replace(/"/g, '').replace(/\D/g, '') || '';
    if (rawCpfCnpj.length === 11) {
      if (!isValidCPF(rawCpfCnpj)) {
        cols[18] = '""'; // Invalido
      }
    } else if (rawCpfCnpj.length === 14) {
      if (!isValidCNPJ(rawCpfCnpj)) {
        cols[18] = '""'; // Invalido
      }
    }

    // 2. Limpar Telefones (deve ter 10 ou 11 digitos)
    const fixPhone = (phoneStr: string) => {
      let digits = phoneStr.replace(/"/g, '').replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 11) {
        return '""'; // Remove se for tamanho absurdo que o Bling nao aceita
      }
      return `"${digits}"`;
    };

    cols[12] = fixPhone(cols[12] || '');
    cols[14] = fixPhone(cols[14] || '');

    fixedLines.push(cols.join(';'));
  }

  fs.writeFileSync(filePath, fixedLines.join('\n'), 'utf8');
  console.log(`Planilha com telefones e CPFs corrigidos e sobrescrita em: ${filePath}`);
}

fixPhonesAndCPF();
