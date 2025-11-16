// server.js
//
// Microservicio de acortamiento de URL estilo FreeCodeCamp
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
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Basic Configuration (FCC suele tener algo así)
const port = process.env.PORT || 3000;

// Habilitar CORS (FCC lo usa en sus ejemplos)
app.use(cors());

// Middlewares
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// (Opcional) servir archivos estáticos si los usás
// app.use('/public', express.static(`${process.cwd()}/public`));

// Conexión a MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (MONGODB_URI) {
  mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).catch(err => console.error('Mongo connect error:', err));
}

// Esquema y modelo
const urlSchema = new mongoose.Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true, unique: true }
});

const Url = mongoose.model('Url', urlSchema);

// Helper: obtener el próximo ID numérico
async function getNextShortId() {
  const last = await Url.findOne().sort({ short_url: -1 }).exec();
  if (!last) return 1;
  return last.short_url + 1;
}

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

// Ruta raíz (similar al template de FCC)
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

  try {
    // Ver si ya existe la URL
    let existing = await Url.findOne({ original_url }).exec();
    if (existing) {
      return res.json({
        original_url: existing.original_url,
        short_url: existing.short_url
      });
    }

    // Crear nuevo registro con siguiente ID
    const nextId = await getNextShortId();

    const newDoc = new Url({
      original_url,
      short_url: nextId
    });

    await newDoc.save();

    return res.json({
      original_url: newDoc.original_url,
      short_url: newDoc.short_url
    });
  } catch (err) {
    console.error('Error en POST /api/shorturl:', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// GET /api/shorturl/:short_url -> redirige
app.get('/api/shorturl/:short_url', async (req, res) => {
  const shortId = parseInt(req.params.short_url, 10);

  if (isNaN(shortId)) {
    return res.json({ error: 'invalid url' });
  }

  try {
    const doc = await Url.findOne({ short_url: shortId }).exec();
    if (!doc) {
      return res.json({ error: 'invalid url' });
    }

    return res.redirect(doc.original_url);
  } catch (err) {
    console.error('Error en GET /api/shorturl/:short_url:', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
