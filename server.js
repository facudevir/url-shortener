// server.js
//
// Microservicio de acortamiento de URL estilo FreeCodeCamp
// SIN base de datos, usando memoria.
//
// Rutas:
//  - POST /api/shorturl  (campo de formulario: url)
//  - GET  /api/shorturl/:short_url
//
// Usa IDs numéricos (1, 2, 3, ...) y valida con dns.lookup

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const dns = require('dns');
const { URL } = require('url');
const cors = require('cors');

const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

// Habilitar CORS
app.use(cors());

// Middlewares
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// ---- "Base de datos" en memoria ----
// Guardamos objetos { original_url, short_url }
let urls = [];
let shortIdCounter = 1;

// Helper: validar URL con DNS, solo http/https
function validateUrl(urlString) {
  try {
    const urlObj = new URL(urlString);

    // Solo aceptar http / https
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return Promise.reject(new Error('Invalid protocol'));
    }

    const hostname = urlObj.hostname;
    return new Promise((resolve, reject) => {
      dns.lookup(hostname, (err) => {
        if (err) return reject(new Error('Invalid Hostname'));
        resolve(true);
      });
    });
  } catch (e) {
    return Promise.reject(new Error('Invalid URL'));
  }
}

// Ruta raíz (no la testean, pero sirve)
app.get('/', (req, res) => {
  res.send('URL Shortener Microservice. Usa POST /api/shorturl con campo "url".');
});

// POST /api/shorturl -> crea o devuelve short_url
app.post('/api/shorturl', async (req, res) => {
  const original_url = req.body.url;

  if (!original_url) {
    return res.json({ error: 'invalid url' });
  }

  // Validar URL
  try {
    await validateUrl(original_url);
  } catch (err) {
    return res.json({ error: 'invalid url' });
  }

  // Ver si ya existe la URL en memoria
  let existing = urls.find(u => u.original_url === original_url);
  if (existing) {
    return res.json({
      original_url: existing.original_url,
      short_url: existing.short_url
    });
  }

  // Crear nuevo registro
  const newRecord = {
    original_url,
    short_url: shortIdCounter++
  };
  urls.push(newRecord);

  return res.json({
    original_url: newRecord.original_url,
    short_url: newRecord.short_url
  });
});

// GET /api/shorturl/:short_url -> redirige
app.get('/api/shorturl/:short_url', (req, res) => {
  const shortId = parseInt(req.params.short_url, 10);

  if (isNaN(shortId)) {
    return res.json({ error: 'invalid url' });
  }

  const record = urls.find(u => u.short_url === shortId);
  if (!record) {
    return res.json({ error: 'invalid url' });
  }

  return res.redirect(record.original_url);
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
