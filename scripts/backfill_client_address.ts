/**
 * Backfill de endereço de clientes (CEP / Cidade / UF)
 * ---------------------------------------------------
 * 1) Extrai CEP/cidade/UF que estejam embutidos no texto do endereço.
 * 2) Para o que faltar, consulta o ViaCEP (por logradouro+cidade+UF, ou por CEP
 *    quando o CEP existe no texto mas falta cidade/UF).
 * 3) Grava apenas os campos que estavam vazios (nunca sobrescreve dados existentes).
 *
 * Usa SQL nativo ($queryRawUnsafe / $executeRawUnsafe) para não depender da versão
 * do Prisma Client gerado em node_modules.
 *
 * Uso:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/backfill_client_address.ts            # dry-run
 *   DATABASE_URL="postgresql://..." npx tsx scripts/backfill_client_address.ts --apply    # grava
 */
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const prisma = new PrismaClient();

const APPLY = process.argv.includes("--apply");

// ── Parsers de endereço ────────────────────────────────────────────────
const CEP_RE = /\b(\d{5})-?(\d{3})\b/;

// UF no final: "... / SP" ou "... - SP"
const UF_SLASH_RE = /\/\s*([A-Z]{2})\s*$/;
const UF_HYPHEN_RE = /-\s*([A-Z]{2})\s*$/;

// Cidade antes de " / UF" (ex.: "Ribeirão Preto / SP")
const CITY_BEFORE_SLASH_RE = /-\s*([^,-]+?)\s*\/\s*[A-Z]{2}\s*$/;
// Cidade antes de " - UF" (ex.: "..., Ribeirão Preto - SP")
const CITY_BEFORE_HYPHEN_RE = /,\s*([^,-]+?)\s*-\s*[A-Z]{2}\s*$/;

// Logradouro: primeira parte até a 1ª vírgula, sem o número da casa
function extractStreet(address: string): string {
  let street = address.split(",")[0] || address;
  street = street
    .replace(/\s+\d+[A-Za-z]?\s*$/, "") // remove " 215", " 291" etc. do fim
    .replace(/\s+[A-Za-z]+\s*\d+\s*$/, "")
    .trim();
  // Remove prefixos de bloco/condomínio residuais
  street = street.replace(/^(bloco|condomínio|condominio|edifício|edificio)\b/i, "").trim();
  return street;
}

// ── ViaCEP ─────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function viaCepByCep(cep: string) {
  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  if (!res.ok) return null;
  const data = await res.json();
  if (data.erro) return null;
  return data;
}

async function viaCepByAddress(uf: string, city: string, street: string) {
  const url = `https://viacep.com.br/ws/${encodeURIComponent(uf)}/${encodeURIComponent(
    city
  )}/${encodeURIComponent(street)}/json/`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  // Prefere o primeiro resultado que corresponda ao logradouro buscado
  const streetLow = street.toLowerCase();
  return data.find((d: any) => (d.logradouro || "").toLowerCase().includes(streetLow)) || data[0];
}

// ── Main ───────────────────────────────────────────────────────────────
async function main() {
  console.log(`Modo: ${APPLY ? "APLICAR (grava no banco)" : "DRY-RUN (não grava)"}`);

  // SQL nativo: clientes com algum campo de endereço vazio
  const clients: any[] = await prisma.$queryRawUnsafe(`
    SELECT id, name, address, city, state, "zipCode"
    FROM clients
    WHERE "deletedAt" IS NULL
      AND ("zipCode" = '' OR "zipCode" IS NULL OR city = '' OR state = '')
  `);

  console.log(`\nClientes com algum campo de endereço vazio: ${clients.length}\n`);

  let updated = 0;
  let unchanged = 0;
  let errors = 0;
  let viaCepHits = 0;

  for (const c of clients) {
    const address = (c.address || "").trim();
    if (!address) {
      errors++;
      console.log(`[${String(c.id).slice(0, 8)}] SEM ENDEREÇO — ${c.name}`);
      continue;
    }

    let newZip = c.zipCode || "";
    let newCity = c.city || "";
    let newState = c.state || "";

    // 1) CEP no texto do endereço
    const cepMatch = address.match(CEP_RE);
    if (!newZip && cepMatch) {
      newZip = `${cepMatch[1]}${cepMatch[2]}`;
    }

    // 2) UF no texto
    const ufSlash = address.match(UF_SLASH_RE);
    const ufHyphen = address.match(UF_HYPHEN_RE);
    const uf = ufSlash?.[1] || ufHyphen?.[1] || "";
    if (!newState && uf) newState = uf;

    // 3) Cidade no texto
    if (!newCity) {
      const citySlash = address.match(CITY_BEFORE_SLASH_RE);
      const cityHyphen = address.match(CITY_BEFORE_HYPHEN_RE);
      const cityCandidate = (citySlash?.[1] || cityHyphen?.[1] || "").trim();
      // Rejeita candidatos que sejam apenas números/curtos demais para ser cidade
      if (cityCandidate && cityCandidate.length >= 3 && /\D/.test(cityCandidate)) {
        newCity = cityCandidate;
      }
    }

    // 4) ViaCEP para completar o que faltar
    if (newZip && (!newCity || !newState)) {
      // Tem CEP, falta cidade/UF → resolve pelo CEP
      const data = await viaCepByCep(newZip);
      if (data) {
        if (!newCity) newCity = data.localidade || "";
        if (!newState) newState = data.uf || "";
        viaCepHits++;
      }
      await sleep(400);
    } else if (!newZip && newCity && newState) {
      // Tem cidade/UF, falta CEP → resolve pelo logradouro
      const street = extractStreet(address);
      if (street && !/(teste|informado|sem\s+cep)/i.test(street)) {
        const data = await viaCepByAddress(newState, newCity, street);
        if (data) {
          newZip = (data.cep || "").replace(/\D/g, "");
          if (!newCity) newCity = data.localidade || "";
          if (!newState) newState = data.uf || "";
          viaCepHits++;
        }
        await sleep(400);
      }
    }

    const changed =
      (newZip && newZip !== (c.zipCode || "")) ||
      (newCity && newCity !== (c.city || "")) ||
      (newState && newState !== (c.state || ""));

    if (!changed) {
      unchanged++;
      console.log(`[${String(c.id).slice(0, 8)}] SEM ALTERAÇÃO — ${c.name} | endereço: "${address.slice(0, 60)}"`);
      continue;
    }

    if (APPLY) {
      try {
        const setClauses: string[] = [];
        const params: any[] = [];
        if (newZip) { params.push(newZip); setClauses.push(`"zipCode" = $${params.length}`); }
        if (newCity) { params.push(newCity); setClauses.push(`city = $${params.length}`); }
        if (newState) { params.push(newState); setClauses.push(`state = $${params.length}`); }
        params.push(c.id);
        await prisma.$executeRawUnsafe(
          `UPDATE clients SET ${setClauses.join(", ")} WHERE id = $${params.length}`,
          ...params
        );
        updated++;
        console.log(`[${String(c.id).slice(0, 8)}] ✔ GRAVADO — ${c.name}`);
      } catch (e: any) {
        errors++;
        console.log(`[${String(c.id).slice(0, 8)}] ✘ ERRO — ${c.name}: ${e.message}`);
      }
    } else {
      updated++;
      console.log(
        `[${String(c.id).slice(0, 8)}] → ${c.name}\n` +
          `      CEP: "${c.zipCode || ""}" → "${newZip}" | Cidade: "${c.city || ""}" → "${newCity}" | UF: "${c.state || ""}" → "${newState}"\n` +
          `      Endereço: "${address.slice(0, 70)}"`
      );
    }
  }

  console.log(`\n══════════════════════════════════════════`);
  console.log(`TOTAL CLIENTES:        ${clients.length}`);
  console.log(`COM ALTERAÇÃO:         ${updated}`);
  console.log(`SEM ALTERAÇÃO:         ${unchanged}`);
  console.log(`ERROS/SEM ENDEREÇO:    ${errors}`);
  console.log(`VIA CEP (buscas ok):   ${viaCepHits}`);
  console.log(APPLY ? "✔ ALTERAÇÕES GRAVADAS NO BANCO" : "⚠ DRY-RUN — nada foi gravado (use --apply para gravar)");
  console.log(`══════════════════════════════════════════`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
