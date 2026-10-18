// data.js - Raw CSV Data and Parser for Fernando & Luisa Wedding

export const RAW_CSV_DATA = `ID,Nombre Invitado,Pases Reservados,Telefono,Estado Confirmacion,Estado Envio,Enlace Tarjeta
"1","German y Mary","2","3148942664","No Asiste","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=german-y-mary"
"2","Angela y Gaby","2","3102227404","No Asiste","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=angela-y-gaby"
"3","Argenis","1","3213612986","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=argenis"
"4","Luis y Sandra","2","3006517876","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=luis-y-sandra"
"5","Juan y Paola","2","3007582252","No Asiste","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=juan-y-paola"
"6","Jorge y Alejandra","2","3134750682","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=jorge-y-alejandra"
"7","Enrique y Anita","2","3142457298","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=enrique-y-anita"
"8","Alejo y Kelly","2","3143119452","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=alejo-y-kelly"
"9","Wilson","1","3144262888","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=wilson"
"10","Ferenc y Diana","2","3153148043","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=ferenc-y-diana"
"11","Daniel","1","3163009310","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=daniel"
"12","Fabian Moreno","1","3174409887","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=fabian-moreno"
"13","Johnatan y Natalie","2","3183904862","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=johnatan-y-natalie"
"14","Yeisson y Lorena","2","3214900317","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=yeisson-y-lorena"
"15","Marcela","1","3128813030","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=marcela"
"16","Katalina","1","3161958838","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=katalina"
"17","Norma","1","3053473390","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=norma"
"18","Xiomara","1","3106959140","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=xiomara"
"19","Andrea","1","3148942658","No Asiste","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=andrea"
"20","Nubia","1","3123962885","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=nubia"
"21","Jairo e Irma","2","3155451681","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=jairo-e-irma"
"22","Oscar y Lina","2","3168258737","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=oscar-y-lina"
"23","Martha Diaz","1","3216770790","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=martha-diaz"
"24","Ciro y Adriana","2","3162543924","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=ciro-y-adriana"
"25","Miryam","1","3125429353","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=miryam"
"26","Familia Guzman Moreno","5","3176999226","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=familia-guzman-moreno"
"27","Camilo","1","3023631131","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=camilo"
"28","Mayra","1","3118965505","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=mayra"
"29","Leidy","1","3115698018","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=leidy"
"30","Raul y Sandra","2","3015092937","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=raul-y-sandra"
"31","Liss y Vivi","2","3045512639","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=liss-y-vivi"
"32","Familia Orozco Moreno","4","3046808114","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=familia-orozco-moreno"
"33","Alberto y Edith","2","3123633979","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=alberto-y-edith"
"34","Jairo y Diana","2","3134699155","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=jairo-y-diana"
"35","Oscar y Blanca","2","3178492983","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=oscar-y-blanca"
"36","Maria Jose","1","3187026437","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=maria-jose"
"37","Luis y Julieth","2","3204545796","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=luis-y-julieth"
"38","Fernando y Alejandra","2","3205582770","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=fernando-y-alejandra"
"39","Yesid y Martha","2","3205633432","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=yesid-y-martha"
"40","Santiago y Valen","2","3212082769","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=santiago-y-valen"
"41","Camilo y Lina","2","3212318833","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=camilo-y-lina"
"42","Familia Galindo Moreno","3","3213221773","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=familia-galindo-moreno"
"43","Familia Moreno Gonzalez","4","3222307829","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=familia-moreno-gonzalez"
"44","Victor y Xilenia","2","3228452238","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=victor-y-xilenia"
"45","Alexis Rubiano & Sra","1","3214841961","No Asiste","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=alexis-rubiano-sra"
"46","Javier & Sra","2","3045963615","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=javier-sra"
"47","Yeison","1","3154383970","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=yeison"
"48","Daniela","1","3175844709","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=daniela"
"49","Juan Pablo","1","3178688336","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=juan-pablo"
"50","Julian y Camila","2","3125304333","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=julian-y-camila"
"51","Jessica","1","3209406411","Confirmado","Pendiente","https://boda-fernando-luisa.vercel.app/index.html?invitado=jessica"
"52","PAPA LUIS","1","","Confirmado","Pendiente",""`;

/**
 * Parses CSV/TSV string and handles quoting, tabs, and commas properly
 */
export function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    let cells = [];

    if (line.includes('\t')) {
      // Tab-delimited (e.g. pasted directly or exported from Excel TSV)
      cells = line.split('\t').map(c => c.replace(/^["']|["']$/g, '').trim());
    } else {
      // Standard comma-separated with quotes
      let cur = '';
      let inQuotes = false;
      for (let c = 0; c < line.length; c++) {
        const ch = line[c];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
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
      const statusRaw = (cells[4] || '').toLowerCase().trim();
      const isDeclined = statusRaw.includes('no asiste') || statusRaw.includes('cancelad') || statusRaw.includes('rechazad');
      const status = isDeclined ? 'No Asiste' : 'Confirmado';

      rows.push({
        id: cells[0] || String(i),
        name: cells[1],
        passes: parseInt(cells[2], 10) || 1,
        phone: cells[3] || '',
        status: status,
        shipStatus: cells[5] || 'Pendiente',
        link: cells[6] || ''
      });
    }
  }
  return rows;
}

/**
 * Expands raw guest rows into individual seatable entities based on user rules:
 * - Only confirmed guests ("Estado Confirmacion" === "Confirmado")
 * - 2 passes: splits "Fernando y Julieth" into two separate entities ("Fernando" and "Julieth")
 * - Families (3+ passes): creates distinct entities all named e.g. "Familia Galindo Moreno"
 */
export function expandGuests(rows) {
  const confirmedRows = rows.filter(r => r.status.trim().toLowerCase() === 'confirmado');
  const individualGuests = [];

  confirmedRows.forEach(r => {
    const count = r.passes;
    const name = r.name.trim();

    if (count === 1) {
      individualGuests.push({
        id: `guest-${r.id}-1`,
        originalRowId: r.id,
        displayName: name,
        groupName: name,
        phone: r.phone,
        type: 'individual',
        passes: 1,
        partnerId: null,
        subIndex: 1,
        totalInGroup: 1,
        colorSeed: stringToColor(name)
      });
    } else if (count === 2) {
      let parts = [];
      if (name.includes(' y ')) {
        parts = name.split(' y ').map(s => s.trim());
      } else if (name.includes(' e ')) {
        parts = name.split(' e ').map(s => s.trim());
      } else if (name.includes(' & ')) {
        parts = name.split(' & ').map(s => s.trim());
      } else {
        parts = [`${name} (1)`, `${name} (2)`];
      }

      const id1 = `guest-${r.id}-1`;
      const id2 = `guest-${r.id}-2`;

      if (parts.length === 2) {
        individualGuests.push({
          id: id1,
          originalRowId: r.id,
          displayName: parts[0],
          groupName: name,
          phone: r.phone,
          type: 'pareja',
          partnerName: parts[1],
          partnerId: id2,
          passes: 1,
          subIndex: 1,
          totalInGroup: 2,
          colorSeed: stringToColor(name)
        });
        individualGuests.push({
          id: id2,
          originalRowId: r.id,
          displayName: parts[1],
          groupName: name,
          phone: r.phone,
          type: 'pareja',
          partnerName: parts[0],
          partnerId: id1,
          passes: 1,
          subIndex: 2,
          totalInGroup: 2,
          colorSeed: stringToColor(name)
        });
      } else {
        for (let k = 1; k <= count; k++) {
          individualGuests.push({
            id: `guest-${r.id}-${k}`,
            originalRowId: r.id,
            displayName: `${name} (${k})`,
            groupName: name,
            phone: r.phone,
            type: 'pareja',
            passes: 1,
            subIndex: k,
            totalInGroup: count,
            colorSeed: stringToColor(name)
          });
        }
      }
    } else {
      // 3 or more passes (Familias)
      // "y las que dicen familia como son mas de 2 pases solametne pones entes y les pones familia moreno ejemp familia galindo moreno son 3 entonces serian 3 entes nombrados familia galindo moreno"
      for (let k = 1; k <= count; k++) {
        individualGuests.push({
          id: `guest-${r.id}-${k}`,
          originalRowId: r.id,
          displayName: name, // Name is exactly "Familia ..."
          displayBadge: `#${k}`,
          groupName: name,
          phone: r.phone,
          type: 'familia',
          passes: 1,
          subIndex: k,
          totalInGroup: count,
          colorSeed: stringToColor(name)
        });
      }
    }
  });

  return individualGuests;
}

// Generate consistent soft pleasing color for groups/families
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 70%, 55%)`;
}
