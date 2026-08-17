import fs from "fs";

const sql = fs.readFileSync("tabelas supabase/ordem_servicos_rows.sql", "utf8");
const match = sql.match(/VALUES\s*(.*)/is);
if (match) {
    const valuesStr = match[1];
    const rows = valuesStr.split(/\),\s*\(/);
    console.log("Total rows:", rows.length);
    for (let i = 0; i < rows.length; i++) {
        let r = rows[i].replace(/^\(|\);?$/g, '');
        // Split by comma outside of single quotes
        const cols = r.split(/,\s*(?=(?:[^']*'[^']*')*[^']*$)/);
        
        // JSON column indices (0-indexed based on the schema mapping we saw)
        // 9: usedParts, 17: billingLogs, 22: checklistEntrada, 23: laudoFotos, 27: checklistSaida
        const jsonCols = [9, 17, 22, 23, 27];
        
        for (const colIdx of jsonCols) {
            if (cols[colIdx]) {
                let val = cols[colIdx].trim();
                // if it's a string literal, check inner json
                if (val !== 'null' && val.startsWith("'") && val.endsWith("'")) {
                    let inner = val.slice(1, -1);
                    // if empty string in json col, Postgres fails if not cast, but wait, empty string is invalid json anyway!
                    if (inner === '') {
                        console.log(`Row ${i} ID ${cols[0]} has empty string in col ${colIdx}`);
                    } else {
                        try {
                            JSON.parse(inner);
                        } catch (e) {
                            console.log(`Row ${i} ID ${cols[0]} has invalid JSON in col ${colIdx}: ${inner}`);
                        }
                    }
                }
            }
        }
    }
}
