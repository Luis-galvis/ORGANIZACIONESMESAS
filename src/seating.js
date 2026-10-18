// seating.js - State Management, Table Configuration & Intelligent Seating Algorithms
import { saveSeatingState, loadSeatingState } from './cloud.js';

const STORAGE_KEY = 'boda_fernando_luisa_mesas_v3';

export class SeatingManager {
  constructor(initialGuests) {
    this.guests = initialGuests || [];
    this.tables = [];
    this.loadState();
  }

  /**
   * Initializes:
   * 1. Dedicated Sweetheart Table for the Novios (Fernando & Luisa) aparte en el escenario.
   * 2. Exactly 8 Guest Tables of standard 10 seats each (Mesa 1 to Mesa 8).
   */
  getDefaultTables() {
    // 1. Separate Bridal Sweetheart Table (Novios aparte)
    const noviosTable = {
      id: 't_novios',
      name: 'Mesa de Novios • Fernando & Luisa',
      capacity: 2,
      isNoviosTable: true,
      isPresidencial: true,
      position: { x: 0, z: -15.2 },
      seats: [
        { index: 0, guestId: 'novio_fernando', customName: 'Fernando (Novio)' },
        { index: 1, guestId: 'novia_luisa', customName: 'Luisa (Novia)' }
      ]
    };

    // 2. Exactly 8 Guest Tables with standard 10 capacity each
    const guestTableConfigs = [
      // Fila Delantera (4 mesas)
      { id: 't1', name: 'Mesa 1', capacity: 10, position: { x: -15, z: -5.5 } },
      { id: 't2', name: 'Mesa 2', capacity: 10, position: { x: -5, z: -5.5 } },
      { id: 't3', name: 'Mesa 3', capacity: 10, position: { x: 5, z: -5.5 } },
      { id: 't4', name: 'Mesa 4', capacity: 10, position: { x: 15, z: -5.5 } },

      // Fila Trasera (4 mesas)
      { id: 't5', name: 'Mesa 5', capacity: 10, position: { x: -15, z: 6 } },
      { id: 't6', name: 'Mesa 6', capacity: 10, position: { x: -5, z: 6 } },
      { id: 't7', name: 'Mesa 7', capacity: 10, position: { x: 5, z: 6 } },
      { id: 't8', name: 'Mesa 8', capacity: 10, position: { x: 15, z: 6 } }
    ];

    const guestTables = guestTableConfigs.map(cfg => ({
      ...cfg,
      isNoviosTable: false,
      isPresidencial: false,
      seats: Array.from({ length: cfg.capacity }, (_, idx) => ({
        index: idx,
        guestId: null
      }))
    }));

    return [noviosTable, ...guestTables];
  }

  loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tables && parsed.tables.length > 0) {
          this.tables = parsed.tables;
          return;
        }
      }
    } catch (err) {
      console.warn('Error loading seating state from localStorage:', err);
    }
    this.tables = this.getDefaultTables();
  }

  async loadFromCloud() {
    const cloudTables = await loadSeatingState();
    if (cloudTables && cloudTables.length > 0) {
      this.tables = cloudTables;
      return true;
    }
    return false;
  }

  saveState() {
    saveSeatingState(this.tables);
  }

  resetAllAssignments() {
    this.tables.forEach(table => {
      if (!table.isNoviosTable) {
        table.seats.forEach(seat => {
          seat.guestId = null;
        });
      }
    });
    this.saveState();
  }

  resetToDefault() {
    localStorage.removeItem(STORAGE_KEY);
    this.tables = this.getDefaultTables();
    this.saveState();
  }

  getUnassignedGuests() {
    const assignedIds = new Set();
    this.tables.forEach(t => {
      t.seats.forEach(s => {
        if (s.guestId) assignedIds.add(s.guestId);
      });
    });
    return this.guests.filter(g => !assignedIds.has(g.id));
  }

  getGuestLocation(guestId) {
    for (const table of this.tables) {
      const seatIdx = table.seats.findIndex(s => s.guestId === guestId);
      if (seatIdx !== -1) {
        return { table, seatIndex: seatIdx };
      }
    }
    return null;
  }

  assignGuest(tableId, seatIndex, guestId) {
    const table = this.tables.find(t => t.id === tableId);
    if (!table || seatIndex < 0 || seatIndex >= table.capacity) return false;

    // If guest was seated elsewhere, unseat first
    const existingLoc = this.getGuestLocation(guestId);
    if (existingLoc) {
      existingLoc.table.seats[existingLoc.seatIndex].guestId = null;
    }

    table.seats[seatIndex].guestId = guestId;
    this.saveState();
    return true;
  }

  unassignSeat(tableId, seatIndex) {
    const table = this.tables.find(t => t.id === tableId);
    if (!table || seatIndex < 0 || seatIndex >= table.capacity) return false;

    table.seats[seatIndex].guestId = null;
    this.saveState();
    return true;
  }

  swapSeats(tableId1, seatIndex1, tableId2, seatIndex2) {
    const t1 = this.tables.find(t => t.id === tableId1);
    const t2 = this.tables.find(t => t.id === tableId2);
    if (!t1 || !t2) return false;

    const g1 = t1.seats[seatIndex1].guestId;
    const g2 = t2.seats[seatIndex2].guestId;

    t1.seats[seatIndex1].guestId = g2;
    t2.seats[seatIndex2].guestId = g1;
    this.saveState();
    return true;
  }

  addTable(name, capacity = 10) {
    const newId = `t${Date.now()}`;
    const count = this.tables.filter(t => !t.isNoviosTable).length;
    const x = -15 + (count % 4) * 10;
    const z = 12 + Math.floor(count / 4) * 8;

    const newTable = {
      id: newId,
      name: name || `Mesa ${count + 1}`,
      capacity: parseInt(capacity, 10) || 10,
      isNoviosTable: false,
      isPresidencial: false,
      position: { x, z },
      seats: Array.from({ length: capacity }, (_, idx) => ({
        index: idx,
        guestId: null
      }))
    };

    this.tables.push(newTable);
    this.saveState();
    return newTable;
  }

  removeTable(tableId) {
    const idx = this.tables.findIndex(t => t.id === tableId);
    if (idx === -1) return false;
    // Don't remove novios table
    if (this.tables[idx].isNoviosTable) return false;

    this.tables.splice(idx, 1);
    this.saveState();
    return true;
  }

  updateTable(tableId, newName, newCapacity) {
    const table = this.tables.find(t => t.id === tableId);
    if (!table) return false;

    if (newName) table.name = newName;
    if (newCapacity && newCapacity !== table.capacity) {
      // Allow capacity from 6 up to 15 maximum (standard is 10)
      const cap = Math.max(6, Math.min(15, parseInt(newCapacity, 10)));
      table.capacity = cap;
      if (table.seats.length < cap) {
        while (table.seats.length < cap) {
          table.seats.push({ index: table.seats.length, guestId: null });
        }
      } else if (table.seats.length > cap) {
        table.seats = table.seats.slice(0, cap);
      }
    }

    this.saveState();
    return true;
  }

  adjustTableCapacity(tableId, delta) {
    const table = this.tables.find(t => t.id === tableId);
    if (!table || table.isNoviosTable) return false;

    const newCap = Math.max(8, Math.min(15, table.capacity + delta));
    return this.updateTable(tableId, null, newCap);
  }

  /**
   * SMART AUTO-ASSIGNMENT ALGORITHM
   * Seats guests strictly into the 8 guest tables (excluding the Novios table).
   * Prioritizes:
   * 1. Keeping families together (Guzman Moreno 5, Orozco Moreno 4, Moreno Gonzalez 4, Galindo Moreno 3)
   * 2. Keeping couples together side-by-side
   * 3. Placing individual guests in balanced spots
   */
  autoAssignAll() {
    this.resetAllAssignments();

    // Guest tables only (excluding novios table)
    const guestTables = this.tables.filter(t => !t.isNoviosTable);

    // Group guests by groupName
    const groupsMap = new Map();
    this.guests.forEach(g => {
      if (!groupsMap.has(g.groupName)) {
        groupsMap.set(g.groupName, []);
      }
      groupsMap.get(g.groupName).push(g);
    });

    // Sort groups by size descending (Families first, then couples, then individuals)
    const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => b.length - a.length);

    for (const group of sortedGroups) {
      const groupSize = group.length;

      // Find table with enough free seats
      let targetTable = null;
      for (const table of guestTables) {
        const freeSeats = table.seats.filter(s => !s.guestId).length;
        if (freeSeats >= groupSize) {
          targetTable = table;
          break;
        }
      }

      // If no table has enough room for whole group, pick the one with most free seats
      if (!targetTable) {
        let maxFree = 0;
        for (const table of guestTables) {
          const freeSeats = table.seats.filter(s => !s.guestId).length;
          if (freeSeats > maxFree) {
            maxFree = freeSeats;
            targetTable = table;
          }
        }
      }

      if (targetTable) {
        let guestIdx = 0;
        for (let sIdx = 0; sIdx < targetTable.seats.length && guestIdx < group.length; sIdx++) {
          if (!targetTable.seats[sIdx].guestId) {
            targetTable.seats[sIdx].guestId = group[guestIdx].id;
            guestIdx++;
          }
        }

        // Leftover members if split
        while (guestIdx < group.length) {
          const nextTable = guestTables.find(t => t.seats.some(s => !s.guestId));
          if (!nextTable) break;
          const openSeat = nextTable.seats.find(s => !s.guestId);
          if (openSeat) {
            openSeat.guestId = group[guestIdx].id;
            guestIdx++;
          } else {
            break;
          }
        }
      }
    }

    this.saveState();
  }

  exportBackupJSON() {
    return JSON.stringify({
      version: '2.0',
      boda: 'Fernando & Luisa',
      exportDate: new Date().toISOString(),
      tables: this.tables
    }, null, 2);
  }

  importBackupJSON(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data.tables)) {
        this.tables = data.tables;
        this.saveState();
        return true;
      }
    } catch (e) {
      console.error('Invalid backup JSON:', e);
    }
    return false;
  }
}
