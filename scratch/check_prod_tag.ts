import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const cols: any = await p.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'Tag' ORDER BY ordinal_position`
  );
  console.log("Colunas da tabela Tag:", cols.map((c: any) => c.column_name).join(", ") || "TABELA NAO EXISTE");
  if (cols.length > 0) {
    const data = await p.tag.count();
    console.log("Total de tags:", data);
    try {
      const enums: any = await p.$queryRawUnsafe(
        `SELECT enum_range(NULL::"TagScope") AS scope`
      );
      console.log("Enum TagScope:", enums[0]?.scope || "NAO EXISTE");
    } catch (e: any) {
      console.log("Enum TagScope: NAO EXISTE (", e.message.slice(0, 60), ")");
    }
  }
}
main().catch((e) => console.log("ERRO:", e.message)).finally(() => p.$disconnect());
