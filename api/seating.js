// api/seating.js - Vercel Serverless Function / Cloud Persistence for Seating Layout
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'seating_db.json');

export default async function handler(req, res) {
  // Enable CORS for mobile / web clients
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      if (fs.existsSync(DB_FILE)) {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return res.status(200).json(JSON.parse(data));
      } else {
        return res.status(200).json({ tables: null, updatedAt: null });
      }
    } catch (err) {
      return res.status(500).json({ error: 'Error reading database: ' + err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const dataToSave = {
        tables: payload.tables,
        updatedAt: new Date().toISOString(),
        author: 'Fernando & Luisa Web'
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave, null, 2), 'utf8');
      return res.status(200).json({ success: true, savedAt: dataToSave.updatedAt });
    } catch (err) {
      return res.status(500).json({ error: 'Error saving to database: ' + err.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
