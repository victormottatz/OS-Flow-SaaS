// Conexões de banco centralizadas — sem senha hardcoded no código.
// Configura HOMOLOG_URL no .env para apontar o banco de homologação.
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../../.env") });

export function getHomologUrl(): string {
  const url = process.env.HOMOLOG_URL;
  if (!url) {
    throw new Error("HOMOLOG_URL não definido no .env — configure antes de rodar (ex.: postgresql://postgres:senha@localhost:5432/mgv_homolog).");
  }
  return url;
}

export function getProdUrl(): string | undefined {
  return process.env.DIRECT_URL || process.env.DATABASE_URL;
}
