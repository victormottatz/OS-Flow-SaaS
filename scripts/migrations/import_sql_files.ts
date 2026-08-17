/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SQL_DIR = path.join(process.cwd(), "tabelas supabase");

// A ordem das tabelas é crucial para respeitar as chaves estrangeiras.
// Clientes e Usuários primeiro, seguidos por Dispositivos, depois Ordens de Serviço, e por fim os detalhes.
const TABLES_ORDER = [
  "users_rows.sql",
  "role_permissions_rows.sql",
  "device_categories_rows.sql",
  "parts_rows.sql",
  "clients_rows.sql",
  "devices_rows.sql",
  "ordem_servicos_rows.sql",
  "service_items_rows.sql",
  "part_usages_rows.sql",
  "payments_rows.sql",
  "audit_logs_rows.sql",
  "bling_configs_rows.sql",
  "feature_flags_rows.sql",
  "office_settings_rows.sql",
  "os_conciliation_batches_rows.sql"
];

async function runImport() {
  console.log("======================================================");
  console.log("    MGV TECNOLOGIA - IMPORTADOR SQL PARA LOCAL        ");
  console.log("======================================================");
  console.log(`Buscando arquivos SQL na pasta: ${SQL_DIR}`);

  try {
    for (const file of TABLES_ORDER) {
      const filePath = path.join(SQL_DIR, file);
      
      try {
        await fs.access(filePath);
        console.log(`\nImportando: ${file}...`);
        
        // Lê o arquivo SQL.
        let sqlContent = await fs.readFile(filePath, "utf-8");
        
        if (sqlContent.trim().length === 0) {
          console.log(`Arquivo ${file} vazio. Ignorando.`);
          continue;
        }

        // Corrige arrays vazios sem cast, exigidos pelo Postgres
        sqlContent = sqlContent.replace(/ARRAY\[\]/g, "ARRAY[]::text[]");

        // Corrige aspas escapadas dentro do JSON que se perdem no parse do PostgreSQL
        if (file === "ordem_servicos_rows.sql") {
            sqlContent = sqlContent.replace(/\\"/g, '\\\\"');
        }

        // Executar a query SQL bruta
        // Usamos $executeRawUnsafe pois o conteúdo do arquivo já vem sanitizado pelo dump original.
        await prisma.$executeRawUnsafe(sqlContent);
        
        console.log(`✓ ${file} importado com sucesso!`);
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          console.log(`[Aviso] Arquivo ${file} não encontrado na pasta. Ignorando.`);
        } else {
          console.error(`❌ Erro ao importar ${file}:`, err.message);
          // Falhar caso ocorra erro de foreign key para evitar dados inconsistentes
          throw err; 
        }
      }
    }

    console.log("\n======================================================");
    console.log("🚀 Importação concluída com sucesso!");
    console.log("Seu banco de dados local agora possui todas as informações do Supabase.");
    console.log("======================================================");
  } catch (globalErr: any) {
    console.error("\n[CRÍTICO] A importação foi interrompida devido a um erro:", globalErr.message);
  } finally {
    await prisma.$disconnect();
  }
}

runImport();
