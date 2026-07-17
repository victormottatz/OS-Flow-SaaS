import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const pdfData = [
  { num: "23577", name: "RAFAELA PEREIRA" },
  { num: "23575", name: "CLINICA FRANKLIN" },
  { num: "23569", name: "MARCOS AURELIO" },
  { num: "23562", name: "CLINICA MEDICA NEFERTITI" },
  { num: "23485", name: "LUANA DE OLIVEIRA" },
  { num: "23438", name: "MIRIAM APARECIDA" },
  { num: "23404", name: "THALLES RODRIGUES" },
  { num: "23481", name: "ORGANIZACAO EDUCACIONAL" },
  { num: "23433", name: "MUNICIPIO DE ORLANDIA" },
  { num: "23432", name: "LEANDRA DORNELAS" },
  { num: "23424", name: "RAFAEL DE OLIVEIRA" },
  { num: "23477", name: "JACQUELINE MANENTE" },
  { num: "23476", name: "JACQUELINE MANENTE" },
  { num: "23469", name: "LUCIA HELENA" },

  { num: "23445", name: "JAQUELINE FERNANDES" },
  { num: "23491", name: "JULIANA PAES" },
  { num: "23454", name: "FABIOLA SOBREIRA" },
  { num: "23430", name: "ANA JOVINA" },
  { num: "23471", name: "ANAMED EQUIPAMENTOS" },
  { num: "23484", name: "CLINICA ESTETICA FISIOFORMA" },
  { num: "23477", name: "Kelly Adriele" }, // Actually maybe 23477 is not correct, wait...
  { num: "23463", name: "TATIANA RAMOS" },
  { num: "23416", name: "MORUMBA TROMBINI" },
  { num: "23466", name: "CLINICA ESTETICA FISIOFORMA" },
  { num: "23375", name: "BENESSERE CONDICIONAMENTO" },
  { num: "23363", name: "CLINICA DE EMAGRECIMENTO" },

  { num: "23300", name: "MARCIA ESTELA" },
  { num: "23380", name: "MICHELY DE PAULA" },
  { num: "23285", name: "ROSEMEIRE MOTA" },
  { num: "23235", name: "RAFAELA PEREIRA" },
  { num: "23224", name: "RAFAELA PEREIRA" }, // Wait, RAFAELA is not finding perfectly.
  { num: "23268", name: "JUE FERREIRA" },
  { num: "23188", name: "AMANDA DA SILVA" },
  { num: "23122", name: "RODRIGO DIAS" }
];

async function main() {
  const osList = await prisma.ordemServico.findMany({
    include: { client: true }
  });

  const idsToUpdate: string[] = [];

  for (const item of pdfData) {
    const nameUpper = item.name.toUpperCase().split(' ')[0]; // use first word to be safe
    let matches = osList.filter(os => 
      os.osNumber.startsWith(`OS-${item.num}`) &&
      os.client.name.toUpperCase().includes(nameUpper)
    );

    if (matches.length === 1) {
      console.log(`✅ [OK] ${item.num} -> ${matches[0].osNumber} (${matches[0].client.name})`);
      idsToUpdate.push(matches[0].id);
    } else if (matches.length > 1) {
      console.log(`⚠️ [MULTIPLE] ${item.num} - ${item.name}:`);
      matches.forEach(m => console.log(`    - ${m.osNumber} (${m.client.name})`));
      
      // We will push all of them if the client name matches perfectly? Let's just push the first one if we can differentiate, or if they are both the same person...
      // e.g. Jacqueline Manente has two OSs, 234776 and 234777.
      // In the PDF there are TWO lines for Jacqueline: 23477 and 23476. Wait! 
      // "23477" -> `OS-234777`. "23476" -> `OS-234776`!
      // But 23476 doesn't start with 23477!
      // So `os.osNumber.startsWith('OS-23476')` will match `OS-23476...`
      // Wait, `OS-234776` starts with `OS-23477`! Not `OS-23476`!
      // If `OS-234776` starts with `OS-23477`, then `OS-23476` will match what?
      
    } else {
      console.log(`❌ [NOT FOUND] ${item.num} - ${item.name}`);
      // find purely by name
      const nameMatches = osList.filter(os => os.client.name.toUpperCase().includes(item.name.toUpperCase()));
      if (nameMatches.length > 0) {
        console.log(`   -> Name matches:`);
        nameMatches.forEach(m => console.log(`      - ${m.osNumber} (${m.client.name})`));
      }
    }
  }

  // console.log(`Will update ${idsToUpdate.length} OSs...`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
