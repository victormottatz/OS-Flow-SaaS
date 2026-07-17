import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const pdfData = [
  // Page 1
  { num: "23577", name: "RAFAELA PEREIRA", total: 680.00 },
  { num: "23575", name: "CLINICA FRANKLIN", total: 675.00 },
  { num: "23569", name: "MARCOS AURELIO", total: 680.00 },
  { num: "23562", name: "CLINICA MEDICA NEFERTITI", total: 1270.00 },
  { num: "23485", name: "LUANA DE OLIVEIRA", total: 520.00 },
  { num: "23438", name: "MIRIAM APARECIDA", total: 630.00 },
  { num: "23404", name: "THALLES RODRIGUES", total: 1597.90 },
  { num: "23481", name: "ORGANIZACAO EDUCACIONAL", total: 700.00 },
  { num: "23433", name: "MUNICIPIO DE ORLANDIA", total: 1069.90 },
  { num: "23432", name: "LEANDRA DORNELAS", total: 3599.80 },
  { num: "23424", name: "RAFAEL DE OLIVEIRA", total: 590.00 },
  { num: "23477", name: "JACQUELINE MANENTE", total: 600.00 },
  { num: "23476", name: "JACQUELINE MANENTE", total: 950.00 },
  { num: "23469", name: "LUCIA HELENA", total: 580.00 },

  // Page 2
  { num: "23445", name: "JAQUELINE FERNANDES", total: 1550.00 },
  { num: "23491", name: "JULIANA PAES", total: 2429.30 },
  { num: "23454", name: "FABIOLA SOBREIRA", total: 1400.00 },
  { num: "23430", name: "ANA JOVINA", total: 1249.00 },
  { num: "23471", name: "ANAMED EQUIPAMENTOS", total: 870.00 },
  { num: "23484", name: "CLINICA ESTETICA FISIOFORMA", total: 2300.00 },
  { num: "23477", name: "Kelly Adriele", total: 180.00 },
  { num: "23463", name: "TATIANA RAMOS", total: 870.00 },
  { num: "23416", name: "MORUMBA TROMBINI", total: 2610.00 },
  { num: "23466", name: "CLINICA ESTETICA FISIOFORMA", total: 1500.00 },
  { num: "23375", name: "BENESSERE CONDICIONAMENTO", total: 850.00 },
  { num: "23363", name: "CLINICA DE EMAGRECIMENTO", total: 1830.00 },

  // Page 3
  { num: "23300", name: "MARCIA ESTELA", total: 2031.00 },
  { num: "23380", name: "MICHELY DE PAULA", total: 1080.00 },
  { num: "23285", name: "ROSEMEIRE MOTA", total: 455.00 },
  { num: "23235", name: "RAFAELA PEREIRA", total: 219.00 },
  { num: "23224", name: "RAFAELA PEREIRA", total: 1900.00 },
  { num: "23268", name: "JUE FERREIRA", total: 2730.00 },
  { num: "23188", name: "AMANDA DA SILVA", total: 1420.00 },
  { num: "23122", name: "RODRIGO DIAS", total: 380.00 }
];

async function main() {
  const osList = await prisma.ordemServico.findMany({
    include: { client: true }
  });

  const idsToUpdate: string[] = [];

  for (const item of pdfData) {
    const nameUpper = item.name.toUpperCase().split(' ')[0]; // first word
    
    // First, let's try to match by name and total cost.
    let possibleMatches = osList.filter(os => 
      os.client.name.toUpperCase().includes(nameUpper) &&
      Math.abs(os.totalCost - item.total) < 0.01
    );

    if (possibleMatches.length === 1) {
      console.log(`[MATCH BY NAME+TOTAL] ${item.num} -> ${possibleMatches[0].osNumber} (${possibleMatches[0].client.name})`);
      idsToUpdate.push(possibleMatches[0].id);
      continue;
    }

    // Try by prefix and name
    let prefixMatches = osList.filter(os => 
      os.osNumber.startsWith(`OS-${item.num}`) &&
      os.client.name.toUpperCase().includes(nameUpper)
    );

    if (prefixMatches.length === 1) {
      console.log(`[MATCH BY PREFIX+NAME] ${item.num} -> ${prefixMatches[0].osNumber} (${prefixMatches[0].client.name})`);
      idsToUpdate.push(prefixMatches[0].id);
      continue;
    }

    // fallback: if multiple matches by prefix, pick the closest total cost
    if (prefixMatches.length > 1) {
      const closest = prefixMatches.reduce((prev, curr) => 
        Math.abs(curr.totalCost - item.total) < Math.abs(prev.totalCost - item.total) ? curr : prev
      );
      console.log(`[MATCH BY PREFIX+CLOSEST TOTAL] ${item.num} -> ${closest.osNumber} (${closest.client.name})`);
      idsToUpdate.push(closest.id);
      continue;
    }

    console.log(`[NOT FOUND] ${item.num} - ${item.name} - Total: ${item.total}`);
  }

  console.log(`Found ${idsToUpdate.length} / ${pdfData.length} to update.`);

  // Do the update
  const res = await prisma.ordemServico.updateMany({
    where: {
      id: { in: idsToUpdate }
    },
    data: {
      status: 'AGUARDANDO_AUTORIZACAO'
    }
  });

  console.log(`Successfully updated ${res.count} OSs to AGUARDANDO_AUTORIZACAO.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
