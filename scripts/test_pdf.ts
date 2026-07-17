import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync("D:\\HD\\MGV\\MGV_2026\\MGV-Assistência-Técnica\\listagem clientes.pdf");

pdf(dataBuffer).then(function(data: any) {
    console.log("Number of pages:", data.numpages);
    console.log("Text snippet:");
    console.log(data.text.substring(0, 500));
}).catch((err: any) => console.error(err));
