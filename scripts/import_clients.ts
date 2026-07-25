import { PrismaClient } from '@prisma/client';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const prisma = new PrismaClient();

function cleanPhone(phone: string | number | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.toString().replace(/\D/g, '');
  return cleaned.length >= 10 ? cleaned : null;
}

async function main() {
  const filePath = "D:\\HD\\MGV\\MGV_2026\\MGV-Assistência-Técnica\\clientes.xls";
  console.log(`Lendo arquivo: ${filePath}`);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];

  console.log(`Encontradas ${data.length} linhas na planilha.`);

  let createdCount = 0;
  let updatedCount = 0;
  let ignoredCount = 0;
  let invalidCount = 0;
  let duplicatedCount = 0;

  const startTime = Date.now();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;

    const legacyId = row[0] ? row[0].toString() : null;
    const name = row[1] ? row[1].toString().trim() : '';
    const cpfCnpj = row[4] ? row[4].toString().trim() : '';
    const rawPhone = row[11] ? row[11].toString() : '';
    const rawCell = row[14] ? row[14].toString() : '';
    const phone = rawCell || rawPhone || '';
    const email = row[12] ? row[12].toString().trim() : '';
    
    const endereco = row[6] ? row[6].toString().trim() : '';
    const numero = row[30] ? row[30].toString().trim() : '';
    const bairro = row[8] ? row[8].toString().trim() : '';
    const cidade = row[9] ? row[9].toString().trim() : '';
    const uf = row[10] ? row[10].toString().trim() : '';
    const cep = row[7] ? row[7].toString().trim() : '';
    
    const address = `${endereco}, ${numero} - ${bairro}, ${cidade}/${uf} - CEP: ${cep}`.replace(/undefined/g, '').trim();

    if (!name) {
      invalidCount++;
      continue;
    }

    const clientPhone = cleanPhone(phone);
    const clientCpf = cpfCnpj.replace(/\D/g, '');

    // Nova ordem de prioridade: legacyId -> CPF/CNPJ -> Telefone -> Nome Completo
    let existingClient = null;

    if (legacyId) {
      existingClient = await prisma.client.findUnique({ where: { legacyId } });
    }

    if (!existingClient && clientCpf && clientCpf.length >= 11) {
      existingClient = await prisma.client.findFirst({
        where: { cpfCnpj: { contains: clientCpf } }
      });
    }

    if (!existingClient && clientPhone) {
      existingClient = await prisma.client.findFirst({
        where: { phone: { contains: clientPhone } }
      });
    }

    if (!existingClient) {
      existingClient = await prisma.client.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } }
      });
    }

    if (existingClient) {
      // Atualiza com o legacyId e outros dados se estiver vazio
      const wasUpdated = existingClient.legacyId !== legacyId || existingClient.cpfCnpj === '' || existingClient.phone === '' || existingClient.address === '';
      if (wasUpdated) {
        await prisma.client.update({
          where: { id: existingClient.id },
          data: {
            legacyId: legacyId || existingClient.legacyId,
            cpfCnpj: existingClient.cpfCnpj === '' ? cpfCnpj : existingClient.cpfCnpj,
            phone: existingClient.phone === '' ? phone : existingClient.phone,
            address: existingClient.address === '' ? address : existingClient.address,
          }
        });
        updatedCount++;
      } else {
        duplicatedCount++;
      }
    } else {
      // Criar novo cliente
      await prisma.client.create({
        data: {
          legacyId,
          name,
          cpfCnpj,
          phone,
          email,
          address
        }
      });
      createdCount++;
    }

    // Pequeno atraso para não estourar pool de conexão
    await new Promise(r => setTimeout(r, 10));
  }

  const endTime = Date.now();
  const timeElapsed = ((endTime - startTime) / 1000).toFixed(2);

  console.log(`\n=== Import Summary ===`);
  console.log(`Clientes criados: ${createdCount}`);
  console.log(`Clientes atualizados: ${updatedCount}`);
  console.log(`Clientes duplicados (já existiam e sem att): ${duplicatedCount}`);
  console.log(`Clientes inválidos (sem nome): ${invalidCount}`);
  console.log(`Tempo total: ${timeElapsed} segundos`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
