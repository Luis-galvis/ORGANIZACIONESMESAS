import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.resolve('seating_db.json');

export default defineConfig({
  plugins: [
    {
      name: 'seating-api-middleware',
      configureServer(server) {
        server.middlewares.use('/api/seating', (req, res) => {
          res.setHeader('Content-Type', 'application/json');

          if (req.method === 'GET') {
            if (fs.existsSync(DB_FILE)) {
              const data = fs.readFileSync(DB_FILE, 'utf8');
              res.end(data);
            } else {
              res.end(JSON.stringify({ tables: null }));
            }
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                fs.writeFileSync(DB_FILE, body, 'utf8');
                res.end(JSON.stringify({ success: true, savedAt: new Date().toISOString() }));
              } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }

          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
        });
      }
    }
  ]
});
