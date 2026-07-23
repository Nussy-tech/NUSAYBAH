const http = require('http');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const PORT = 3000;
const ROOT = __dirname;
const DB_PATH = path.join(ROOT, 'codelokal.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Failed to open SQLite database:', err.message);
    process.exit(1);
  }

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      name TEXT,
      school TEXT,
      method TEXT,
      createdAt TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS quizStats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      school TEXT,
      method TEXT,
      score INTEGER,
      time TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      school TEXT,
      method TEXT,
      age TEXT,
      gender TEXT,
      responses TEXT,
      score INTEGER,
      time TEXT
    )`);
  });
});

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { ok: false, error: message });
}

function serveStaticFile(res, filePath) {
  const safePath = path.normalize(filePath).replace(/^\.(?:\.[\\/])*|[\\/]+$/, '');
  const fullPath = path.join(ROOT, safePath);

  if (!fullPath.startsWith(ROOT)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    const types = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.avif': 'image/avif'
    };

    res.writeHead(200, {
      'Content-Type': types[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(content);
  });
}

function readAllData(callback) {
  const payload = { participants: [], quizStats: [], feedback: [] };

  db.all('SELECT * FROM participants ORDER BY createdAt DESC', (err, participants) => {
    if (err) {
      callback(err);
      return;
    }

    payload.participants = participants;

    db.all('SELECT * FROM quizStats ORDER BY id DESC', (err2, quizStats) => {
      if (err2) {
        callback(err2);
        return;
      }

      payload.quizStats = quizStats;

      db.all('SELECT * FROM feedback ORDER BY id DESC', (err3, feedback) => {
        if (err3) {
          callback(err3);
          return;
        }

        payload.feedback = feedback.map((item) => ({
          ...item,
          responses: item.responses ? JSON.parse(item.responses) : []
        }));

        callback(null, payload);
      });
    });
  });
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (reqUrl.pathname === '/api/admin') {
    if (req.method !== 'GET') {
      sendError(res, 405, 'Method not allowed');
      return;
    }

    readAllData((err, data) => {
      if (err) {
        sendError(res, 500, 'Unable to fetch admin records');
        return;
      }

      sendJson(res, 200, data);
    });
    return;
  }

  if (reqUrl.pathname === '/api/register') {
    if (req.method !== 'POST') {
      sendError(res, 405, 'Method not allowed');
      return;
    }

    let body = '';
    req.on('data', (chunk) => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const existsSql = `SELECT id FROM participants WHERE name = ? AND school = ?`;

        db.get(existsSql, [payload.name, payload.school], (err, existing) => {
          if (err) {
            sendError(res, 500, 'Unable to check registration');
            return;
          }

          if (existing) {
            sendJson(res, 200, { ok: true, message: 'User already registered', payload });
            return;
          }

          db.run(
            `INSERT INTO participants (id, name, school, method, createdAt)
             VALUES (?, ?, ?, ?, ?)`,
            [payload.id?.toString() || Date.now().toString(), payload.name, payload.school, payload.method || null, payload.createdAt || new Date().toISOString()],
            (insertErr) => {
              if (insertErr) {
                sendError(res, 500, 'Unable to save registration');
                return;
              }

              sendJson(res, 200, { ok: true, message: 'User registered', payload });
            }
          );
        });
      } catch (error) {
        sendError(res, 400, 'Invalid JSON payload');
      }
    });
    return;
  }

  if (reqUrl.pathname === '/api/quiz') {
    if (req.method !== 'POST') {
      sendError(res, 405, 'Method not allowed');
      return;
    }

    let body = '';
    req.on('data', (chunk) => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        db.run(
          `INSERT INTO quizStats (name, school, method, score, time)
           VALUES (?, ?, ?, ?, ?)`,
          [payload.name, payload.school, payload.method, payload.score, payload.time || new Date().toISOString()],
          (err) => {
            if (err) {
              sendError(res, 500, 'Unable to save quiz result');
              return;
            }

            sendJson(res, 200, { ok: true, message: 'Quiz result saved', payload });
          }
        );
      } catch (error) {
        sendError(res, 400, 'Invalid JSON payload');
      }
    });
    return;
  }

  if (reqUrl.pathname === '/api/questionnaire') {
    if (req.method !== 'POST') {
      sendError(res, 405, 'Method not allowed');
      return;
    }

    let body = '';
    req.on('data', (chunk) => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        db.run(
          `INSERT INTO feedback (name, school, method, age, gender, responses, score, time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [payload.name, payload.school, payload.method, payload.age, payload.gender, JSON.stringify(payload.responses || []), payload.score, payload.time || new Date().toISOString()],
          (err) => {
            if (err) {
              sendError(res, 500, 'Unable to save questionnaire response');
              return;
            }

            sendJson(res, 200, { ok: true, message: 'Questionnaire response saved', payload });
          }
        );
      } catch (error) {
        sendError(res, 400, 'Invalid JSON payload');
      }
    });
    return;
  }

  if (reqUrl.pathname === '/' || reqUrl.pathname === '/index.html') {
    serveStaticFile(res, 'index.html');
    return;
  }

  serveStaticFile(res, reqUrl.pathname.replace(/^\//, ''));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`CodeLokal API server running at http://localhost:${PORT}`);
  console.log(`Network access available on port ${PORT}`);
});
