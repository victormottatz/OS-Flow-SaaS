const fs = require('fs');
const PDFParser = require("pdf2json");

const pdfParser = new PDFParser(this, 1); // 1 = text parsing
pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
pdfParser.on("pdfParser_dataReady", pdfData => {
    const rawText = pdfParser.getRawTextContent();
    console.log("Raw text length:", rawText.length);
    console.log("Text snippet:");
    console.log(rawText.substring(0, 1500));
});

pdfParser.loadPDF("D:\\HD\\MGV\\MGV_2026\\MGV-Assistência-Técnica\\listagem clientes.pdf");
