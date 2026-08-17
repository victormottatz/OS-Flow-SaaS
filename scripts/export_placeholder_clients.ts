/**
 * Exporta CSV de clientes com endereços-placeholder ("Rua das Flores",
 * "Rua das Palmeiras", "Rua Teste", "Endereço não informado", etc.) do banco
 * de produção, para o gestor identificar quais são dados reais que precisam
 * de correção manual.
 *
 * Uso (a partir da pasta TESTE, com o client atualizado):
 *   DATABASE_URL="postgresql://..." npx tsx scripts/export_placeholder_clients.ts
 *
 * Saída: clientes_placeholder_endereco.csv na raiz do projeto
 */
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import { writeFileSync } from "node:fs";

const prisma = new PrismaClient();

function csvEscape(v: any): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function main() {
  const clients: any[] = await prisma.$queryRawUnsafe(`
    SELECT
      c.id,
      c.name,
      c."cpfCnpj",
      c.phone,
      c."phone2",
      c.email,
      c.address,
      c.city,
      c.state,
      c."zipCode",
      c."legacyId",
      (SELECT count(*) FROM "ordem_servicos" o
        WHERE o."clientId" = c.id AND o."deletedAt" IS NULL) AS total_os,
      (SELECT count(*) FROM "devices" d
        WHERE d."clientId" = c.id AND d."deletedAt" IS NULL) AS total_dispositivos,
      c."createdAt"::date AS criado_em
    FROM clients c
    WHERE c."deletedAt" IS NULL
      AND (
        c.address ILIKE '%Rua das Flores%'
        OR c.address ILIKE '%Rua das Palmeiras%'
        OR c.address ILIKE '%Rua Teste%'
        OR c.address ILIKE '%Endere%o n%o informado%'
        OR c.address ILIKE '%endereco nao informado%'
        OR c.name ILIKE '%cliente de teste%'
        OR c.name ILIKE '%cliente os audit%'
        OR c.name ILIKE '%cliente equipamento audit%'
        OR c.name ILIKE '%cliente teste%'
      )
    ORDER BY c.name
  `);

  const headers = [
    "id",
    "nome",
    "cpf_cnpj",
    "telefone",
    "telefone2",
    "email",
    "endereco",
    "cidade",
    "uf",
    "cep",
    "origem_legado_mdb",
    "total_os",
    "total_dispositivos",
    "criado_em",
    "suspeito_dado_real"
  ];

  const rows = clients.map((c: any) => {
    const totalOs = Number(c.total_os) || 0;
    const totalDev = Number(c.total_dispositivos) || 0;
    const temNomeGenerico = /(cliente (de teste|os audit|equipamento audit|teste))/i.test(c.name || "");
    const temEnderecoGenerico = /(Rua das Flores|Rua das Palmeiras|Rua Teste|Endere.?.?o n.o informado)/i.test(c.address || "");
    // Suspeito de dado real: tem OS e/ou dispositivos reais, mesmo com endereço-placeholder
    const suspeito = (totalOs > 0 || totalDev > 0) && (temNomeGenerico || temEnderecoGenerico) && !/^Cliente (de )?(Teste|OS|Equipamento)/i.test(c.name || "");

    return [
      c.id,
      c.name,
      c.cpfCnpj,
      c.phone,
      c.phone2,
      c.email,
      c.address,
      c.city,
      c.state,
      c.zipCode,
      c.legacyId ? "SIM" : "NAO",
      totalOs,
      totalDev,
      c.criado_em ? new Date(c.criado_em).toISOString().slice(0, 10) : "",
      suspeito ? "SIM - REVISAR" : "NAO"
    ];
  });

  // UTF-8 com BOM para o Excel abrir acentos corretamente
  const csv = "\uFEFF" + [headers.join(";"), ...rows.map(r => r.map(csvEscape).join(";"))].join("\r\n");
  writeFileSync("clientes_placeholder_endereco.csv", csv, "utf8");

  const totalSuspeitos = rows.filter(r => r[14] === "SIM - REVISAR").length;

  console.log(`Total de clientes-placeholder exportados: ${clients.length}`);
  console.log(`Suspeitos de dado real (com OS/dispositivos): ${totalSuspeitos}`);
  console.log(`Arquivo gerado: clientes_placeholder_endereco.csv (${csv.length} bytes)`);
  console.log("\nLegenda da coluna 'suspeito_dado_real':");
  console.log("  SIM - REVISAR = tem OS/dispositivos reais vinculados (provavelmente cliente real com endereço genérico)");
  console.log("  NAO           = provável cadastro de teste/auditoria sem movimentação");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
