// generate_excel.js - Pre-generates the Excel report from the CSV data
import fs from 'fs';
import * as XLSX from 'xlsx';
import { RAW_CSV_DATA, parseCSV, expandGuests } from './src/data.js';
import { SeatingManager } from './src/seating.js';
import { exportToExcel } from './src/export.js';

// Setup Mock localStorage for node environment
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = v; },
  removeItem: (k) => { delete storage[k]; }
};

const csvText = fs.readFileSync('lista_invitados.csv', 'utf8');
const rows = parseCSV(csvText);
const guests = expandGuests(rows);
const seatingManager = new SeatingManager(guests);

// Auto-assign
seatingManager.autoAssignAll();

// Export Excel workbook
const filename = exportToExcel(seatingManager.tables, guests);
console.log('Successfully generated Excel report:', filename);
