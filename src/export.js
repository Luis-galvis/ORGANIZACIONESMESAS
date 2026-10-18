// export.js - Excel Export using SheetJS (xlsx)
import * as XLSX from 'xlsx';

/**
 * Exports current seating arrangement to a multi-sheet formatted Excel workbook (.xlsx)
 * @param {Array} tables - list of tables with their seats
 * @param {Array} guests - list of all confirmed individual guest entities
 */
export function exportToExcel(tables, guests) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet 1: Distribución por Mesas
  const tableRows = [
    ['REPORTE DE DISTRIBUCIÓN DE MESAS - BODA FERNANDO & LUISA'],
    [`Generado el: ${new Date().toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short' })}`],
    [] // blank line
  ];

  // Header row
  tableRows.push([
    'MESA',
    'CAPACIDAD MESA',
    'ASIENTO #',
    'NOMBRE INVITADO',
    'DETALLE / ENTE',
    'GRUPO / FAMILIA ORIGINAL',
    'TELÉFONO',
    'TIPO DE INVITADO',
    'ESTADO ASIENTO'
  ]);

  tables.forEach(table => {
    table.seats.forEach((seat, idx) => {
      const guest = guests.find(g => g.id === seat.guestId);
      const isNovio = Boolean(seat.customName || table.isNoviosTable);
      const displayName = seat.customName || (guest ? guest.displayName : '(Vacante / Libre)');

      tableRows.push([
        table.name,
        `${table.capacity} personas`,
        idx + 1,
        displayName,
        isNovio ? 'Pareja Nupcial' : (guest && guest.displayBadge ? guest.displayBadge : ''),
        isNovio ? 'Novios (Mesa de Honor)' : (guest ? guest.groupName : '-'),
        guest ? guest.phone : '-',
        isNovio ? 'Novios' : (guest ? formatGuestType(guest.type) : '-'),
        (guest || isNovio) ? 'Asignado' : 'Disponible'
      ]);
    });
  });

  const wsTables = XLSX.utils.aoa_to_sheet(tableRows);

  // Set column widths
  wsTables['!cols'] = [
    { wch: 22 }, // Mesa
    { wch: 16 }, // Capacidad
    { wch: 11 }, // Asiento #
    { wch: 30 }, // Nombre Invitado
    { wch: 14 }, // Detalle / Ente
    { wch: 32 }, // Grupo Original
    { wch: 16 }, // Telefono
    { wch: 18 }, // Tipo
    { wch: 15 }  // Estado Asiento
  ];

  XLSX.utils.book_append_sheet(wb, wsTables, 'Distribución de Mesas');

  // 2. Sheet 2: Lista Completa de Invitados (Orden Alfabético)
  const alphabetGuestRows = [
    ['LISTADO GENERAL DE INVITADOS CONFIRMADOS - BODA FERNANDO & LUISA'],
    [`Total Invitados Confirmados: ${guests.length} personas`],
    []
  ];

  alphabetGuestRows.push([
    'NOMBRE INVITADO',
    'IDENTIFICADOR ENTE',
    'MESA ASIGNADA',
    'ASIENTO #',
    'GRUPO ORIGINAL CSV',
    'TELÉFONO DE CONTACTO',
    'TIPO',
    'ESTADO CONFIRMACIÓN'
  ]);

  // Sort guests alphabetically by name
  const sortedGuests = [...guests].sort((a, b) => a.displayName.localeCompare(b.displayName));

  sortedGuests.forEach(guest => {
    // Find where guest is seated
    let assignedTable = null;
    let seatNum = null;

    for (const t of tables) {
      const sIndex = t.seats.findIndex(s => s.guestId === guest.id);
      if (sIndex !== -1) {
        assignedTable = t;
        seatNum = sIndex + 1;
        break;
      }
    }

    alphabetGuestRows.push([
      guest.displayName,
      guest.displayBadge || guest.displayName,
      assignedTable ? assignedTable.name : '⚠️ SIN ASIGNAR',
      seatNum ? seatNum : '-',
      guest.groupName,
      guest.phone,
      formatGuestType(guest.type),
      'Confirmado'
    ]);
  });

  const wsGuests = XLSX.utils.aoa_to_sheet(alphabetGuestRows);
  wsGuests['!cols'] = [
    { wch: 30 },
    { wch: 20 },
    { wch: 24 },
    { wch: 12 },
    { wch: 32 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 }
  ];

  XLSX.utils.book_append_sheet(wb, wsGuests, 'Invitados Confirmados');

  // 3. Sheet 3: Resumen Ejecutivo y Estadísticas
  const totalSeats = tables.reduce((sum, t) => sum + t.capacity, 0);
  const seatedCount = tables.reduce((sum, t) => sum + t.seats.filter(s => s.guestId).length, 0);
  const pendingCount = guests.length - seatedCount;

  const summaryRows = [
    ['RESUMEN DE LOGÍSTICA DE MESAS - BODA FERNANDO & LUISA'],
    [],
    ['MÉTRICA', 'VALOR'],
    ['Total Invitados Confirmados (Entes)', guests.length],
    ['Total Mesas Habilitadas', tables.length],
    ['Capacidad Total de Asientos', totalSeats],
    ['Invitados Asignados en Mesas', seatedCount],
    ['Invitados Pendientes por Asignar', pendingCount],
    ['Porcentaje de Asignación', `${((seatedCount / (guests.length || 1)) * 100).toFixed(1)}%`],
    ['Porcentaje de Ocupación del Salón', `${((seatedCount / (totalSeats || 1)) * 100).toFixed(1)}%`],
    [],
    ['DESGLOSE POR MESA', 'CAPACIDAD', 'OCUPADOS', 'LIBRES', 'ESTADO']
  ];

  tables.forEach(t => {
    const occ = t.seats.filter(s => s.guestId).length;
    const free = t.capacity - occ;
    let status = 'Disponible';
    if (occ === t.capacity) status = 'Llena (Completa)';
    else if (occ === 0) status = 'Vacía';
    else status = `Parcial (${free} libres)`;

    summaryRows.push([t.name, t.capacity, occ, free, status]);
  });

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 35 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 22 }
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen Logístico');

  // Generate date stamp for file name
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const filename = `Boda_Fernando_y_Luisa_Mesas_Asignadas_${dateStr}.xlsx`;

  XLSX.writeFile(wb, filename);
  return filename;
}

function formatGuestType(type) {
  switch (type) {
    case 'pareja': return 'Pareja (2 pases)';
    case 'familia': return 'Familia (3+ pases)';
    case 'individual': return 'Individual (1 pase)';
    default: return type;
  }
}
