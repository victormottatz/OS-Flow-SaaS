import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    console.log("Iniciando migração de banco manual para Fornecedores...");
    
    // 1. Adicionar deleted_at na tabela fornecedores
    await client.query(`
      ALTER TABLE fornecedores 
      ADD COLUMN IF NOT EXISTS deleted_at timestamp without time zone;
    `);
    console.log("✔ Coluna 'deleted_at' verificada/adicionada em 'fornecedores'.");

    // 2. Adicionar supplierId na tabela parts
    await client.query(`
      ALTER TABLE parts 
      ADD COLUMN IF NOT EXISTS "supplierId" uuid;
    `);
    console.log("✔ Coluna 'supplierId' verificada/adicionada em 'parts'.");

    // 3. Criar chave estrangeira se não existir
    // Verifica se a restrição já existe para evitar erro
    const constraintCheck = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'parts' AND constraint_name = 'parts_supplierId_fkey';
    `);

    if (constraintCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE parts 
        ADD CONSTRAINT "parts_supplierId_fkey" 
        FOREIGN KEY ("supplierId") REFERENCES fornecedores(id) 
        ON DELETE SET NULL ON UPDATE CASCADE;
      `);
      console.log("✔ Chave estrangeira 'parts_supplierId_fkey' criada.");
    } else {
      console.log("✔ Chave estrangeira 'parts_supplierId_fkey' já existe.");
    }

    console.log("Migração física concluída com sucesso!");
  } catch (err) {
    console.error("Falha ao rodar comandos de ALTER TABLE no Postgres:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
