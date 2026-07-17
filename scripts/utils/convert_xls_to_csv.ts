import fs from 'fs';
import xlsx from 'xlsx';

// Funções de validação matemática
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

// Formatar CPF: xxx.xxx.xxx-xx
function formatCPF(cpf: string): string {
  const d = cpf.replace(/\D/g, '').padStart(11, '0');
  return `${d.substring(0,3)}.${d.substring(3,6)}.${d.substring(6,9)}-${d.substring(9,11)}`;
}

// Formatar CNPJ: xx.xxx.xxx/xxxx-xx
function formatCNPJ(cnpj: string): string {
  const d = cnpj.replace(/\D/g, '').padStart(14, '0');
  return `${d.substring(0,2)}.${d.substring(2,5)}.${d.substring(5,8)}/${d.substring(8,12)}-${d.substring(12,14)}`;
}

// Remover acentos de forma limpa para evitar erros de encoding
function removeAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function cleanPhone(phoneStr: string): string {
  if (!phoneStr) return '';
  let raw = String(phoneStr).trim();
  
  // Remover código do país (+55 ou 55 no início) se o número total for longo
  raw = raw.replace(/^\+?55\s*/, '');
  
  // Se tem barra (ex: "(17) 3342-2616/ (17)"), pegar apenas o primeiro número
  if (raw.includes('/')) {
    raw = raw.split('/')[0].trim();
  }
  
  // Extrair apenas dígitos
  let digits = raw.replace(/\D/g, '');
  
  // Se ainda sobrar 55 no início e o tamanho for maior que 11, tirar o DDI
  if (digits.length > 11 && digits.startsWith('55')) {
    digits = digits.substring(2);
  }
  
  // Validar tamanho exato para evitar erros no Bling
  if (digits.length < 10 || digits.length > 11) {
    return '';
  }
  
  return digits;
}

function run() {
  const inputPath = 'EXPOTAÇÃO-SH OFICINA/TABELA_CLIENTES.xls';

  console.log('Lendo arquivo Excel...');
  const wb = xlsx.readFile(inputPath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data: any[] = xlsx.utils.sheet_to_json(ws);

  console.log(`Foram lidos ${data.length} registros.`);

  // Cabeçalhos que o Bling V3 espera na importação manual
  const csvHeader = [
    'ID', 'Codigo', 'Nome', 'Fantasia', 'Endereco', 'Numero', 'Complemento', 'Bairro',
    'CEP', 'Cidade', 'Estado', 'Contatos', 'Fone', 'Fax', 'Celular', 'E-mail', 'Web Site',
    'Tipo pessoa', 'CNPJ / CPF', 'IE / RG', 'IE isento', 'Situacao', 'Tipo Contato'
  ];

  const processedRows: string[] = [];
  const seenDocs = new Set<string>(); // Evitar CPFs/CNPJs duplicados na mesma planilha
  let invalidDocs = 0;
  let duplicatedDocsCleared = 0;
  let fixedPhones = 0;

  for (const row of data) {
    const nome = row['NOME'] ? String(row['NOME']).trim() : '';
    
    // Pular registros em branco ou testes conhecidos
    if (!nome || nome.toLowerCase().includes('joão da silva teste') || nome.toLowerCase().includes('joao da silva teste')) {
      continue;
    }

    // --- CPF / CNPJ ---
    let rawDoc = row['CPF_CNPJ'] ? String(row['CPF_CNPJ']).trim() : '';
    let digits = rawDoc.replace(/\D/g, '');
    let tipoPessoa = 'Pessoa Física';
    let docFormatado = '';

    if (digits.length >= 14) {
      digits = digits.substring(0, 14);
      if (isValidCNPJ(digits)) {
        tipoPessoa = 'Pessoa Jurídica';
        docFormatado = formatCNPJ(digits);
      } else {
        invalidDocs++;
        tipoPessoa = 'Pessoa Jurídica';
        docFormatado = ''; // Limpar inválidos
      }
    } else if (digits.length >= 11) {
      digits = digits.substring(0, 11);
      if (isValidCPF(digits)) {
        tipoPessoa = 'Pessoa Física';
        docFormatado = formatCPF(digits);
      } else {
        invalidDocs++;
        tipoPessoa = 'Pessoa Física';
        docFormatado = '';
      }
    } else {
      if (digits.length > 0) invalidDocs++;
      tipoPessoa = 'Pessoa Física';
      docFormatado = '';
    }

    // --- Evitar Duplicidade de Documento no Mesmo Arquivo ---
    if (docFormatado) {
      if (seenDocs.has(docFormatado)) {
        duplicatedDocsCleared++;
        docFormatado = ''; // Se já vimos este CPF/CNPJ antes, limpamos esta ocorrência
      } else {
        seenDocs.add(docFormatado);
      }
    }

    // --- Endereço e Acentuação ---
    const endereco = row['ENDERECO'] ? removeAccents(String(row['ENDERECO'])) : '';
    const numero = row['NUMERO'] ? String(row['NUMERO']).trim().replace(/;/g, '') : '';
    const complemento = row['COMPLEM'] ? removeAccents(String(row['COMPLEM'])) : '';
    const bairro = row['BAIRRO'] ? removeAccents(String(row['BAIRRO'])) : '';
    const cidade = row['CIDADE'] ? removeAccents(String(row['CIDADE'])) : '';
    const uf = row['UF'] ? String(row['UF']).trim().substring(0, 2).toUpperCase() : '';
    
    let cep = row['CEP'] ? String(row['CEP']).replace(/\D/g, '') : '';
    if (cep.length === 8 && cep !== '01000000') {
      cep = `${cep.substring(0,5)}-${cep.substring(5)}`;
    } else {
      cep = '';
    }

    // --- Telefones ---
    const telefone = cleanPhone(row['TELEFONE']);
    const celular = cleanPhone(row['CELULAR']);
    const fax = cleanPhone(row['FAX']);
    if (telefone || celular) fixedPhones++;

    const email = row['EMAIL'] ? String(row['EMAIL']).trim().replace(/;/g, ',') : '';
    const fantasia = row['NFANTASIA'] ? removeAccents(String(row['NFANTASIA'])) : removeAccents(nome);

    // Montando a linha do Bling
    const csvRow = [
      '', // ID (deve ficar em branco para cadastros novos)
      '', // Codigo (deve ficar em branco para novos)
      removeAccents(nome),
      fantasia,
      endereco,
      numero,
      complemento,
      bairro,
      cep,
      cidade,
      uf,
      '', // Contatos
      telefone,
      fax,
      celular,
      email,
      '', // Web site
      tipoPessoa,
      docFormatado,
      '', // IE
      '', // IE_isento
      'Ativo', // Situacao (Conforme manual do Bling)
      'Cliente' // Tipo Contato
    ];

    // Mapeamento que escreve aspas apenas nos campos preenchidos.
    // Campos vazios ficam estritamente vazios (sem aspas "")
    const formattedRow = csvRow.map(c => c ? `"${c}"` : '').join(';');
    processedRows.push(formattedRow);
  }

  // Dividir em arquivos de no máximo 500 registros
  const maxRowsPerFile = 500;
  const totalFiles = Math.ceil(processedRows.length / maxRowsPerFile);

  console.log(`\nGerando ${totalFiles} partes de planilhas para o Bling em codificação Latin1 (ANSI)...`);

  for (let i = 0; i < totalFiles; i++) {
    const startIdx = i * maxRowsPerFile;
    const endIdx = Math.min(startIdx + maxRowsPerFile, processedRows.length);
    const chunk = processedRows.slice(startIdx, endIdx);
    
    // Cada arquivo precisa conter a linha de cabeçalho!
    const fileContent = [csvHeader.join(';'), ...chunk].join('\n');
    const partPath = `data/clientes_bling_final_parte${i + 1}.csv`;
    
    // IMPORTANTE: Gravando em 'latin1' para o Bling ler os acentos corretamente!
    fs.writeFileSync(partPath, fileContent, 'latin1');
    console.log(`- Parte ${i + 1} exportada: ${partPath} (${chunk.length} registros)`);
  }

  console.log(`\n=== RESUMO ===`);
  console.log(`Total de registros limpos e divididos: ${processedRows.length}`);
  console.log(`Documentos inválidos limpos (enviados em branco): ${invalidDocs}`);
  console.log(`Documentos duplicados limpos (enviados em branco): ${duplicatedDocsCleared}`);
  console.log(`Contatos com telefone válido: ${fixedPhones}`);
}

run();
