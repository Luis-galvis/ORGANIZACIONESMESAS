import fs from 'fs';
import * as XLSX from 'xlsx';

const buf = fs.readFileSync('Boda_Fernando_y_Luisa_Mesas_Asignadas_2026-10-18.xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });
console.log('Sheets in Excel:', wb.SheetNames);
const data = XLSX.utils.sheet_to_json(wb.Sheets['Distribución de Mesas'], { header: 1 });
console.log('Total rows in Distribución de Mesas:', data.length);
console.log('Sample rows:');
data.slice(0, 26).forEach((r, i) => console.log(i, JSON.stringify(r)));
