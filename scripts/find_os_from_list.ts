import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const pdfNumbers = [
  // Page 1
  "23577", "23575", "23569", "23562", "23485", "23438", "23404", "23481", "23433", "23432", "23424", "23477", "23476", "23469",
  // Page 2
  "23445", "23491", "23454", "23430", "23471", "23484", "23477", "23463", "23416", "23466", "23375", "23363",
  // Page 3
  "23300", "23380", "23285", "23235", "23224", "23268", "23188", "23122"
];

async function main() {
  const osList = await prisma.ordemServico.findMany({
    include: { client: true }
  });

  const matchedOSs: any[] = [];
  
  // Try exact match "OS-" + number, or see if OS contains the number
  pdfNumbers.forEach(num => {
    const matches = osList.filter(os => os.osNumber === `OS-${num}` || os.osNumber.includes(num));
    if (matches.length > 0) {
      matches.forEach(m => {
        matchedOSs.push({ pdfNum: num, osNumber: m.osNumber, client: m.client.name, status: m.status });
      });
    } else {
      console.log(`Could not find OS for PDF number: ${num}`);
    }
  });

  console.log("\nMatched OSs:");
  console.table(matchedOSs);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
