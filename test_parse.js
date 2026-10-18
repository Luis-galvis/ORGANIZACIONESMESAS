import fs from 'fs';

const raw = fs.readFileSync('lista_invitados.csv', 'utf8');

export function robustParseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    let cells = [];
    if (line.includes('\t')) {
      cells = line.split('\t').map(c => c.replace(/^["']|["']$/g, '').trim());
    } else {
      let cur = '';
      let inQuotes = false;
      for (let c = 0; c < line.length; c++) {
        const ch = line[c];
        if (ch === '"') inQuotes = !inQuotes;
        else if (ch === ',' && !inQuotes) {
          cells.push(cur.trim());
          cur = '';
        } else {
          cur += ch;
        }
      }
      cells.push(cur.trim());
      cells = cells.map(c => c.replace(/^["']|["']$/g, '').trim());
    }

    if (cells.length >= 2 && cells[1]) {
      const status = (cells[4] || '').toLowerCase().trim();
      const isDeclined = status.includes('no asiste') || status.includes('cancelad') || status.includes('rechazad');

      rows.push({
        id: cells[0] || String(i),
        name: cells[1],
        passes: parseInt(cells[2], 10) || 1,
        phone: cells[3] || '',
        status: isDeclined ? 'No Asiste' : 'Confirmado',
        link: cells[6] || ''
      });
    }
  }
  return rows;
}

const parsed = robustParseCSV(raw);
console.log('Total parsed rows:', parsed.length);
const papaLuis = parsed.find(r => r.name.toLowerCase().includes('papa'));
console.log('Found PAPA LUIS:', papaLuis);
const confirmed = parsed.filter(r => r.status === 'Confirmado');
console.log('Total confirmed rows:', confirmed.length);
