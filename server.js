const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null;

app.use(helmet());
app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: '200kb' }));

const DATA_DIR = path.join(__dirname, 'data');
const RESP_FILE = path.join(DATA_DIR, 'responses.json');

async function readAll() {
  try {
    const exists = await fs.pathExists(RESP_FILE);
    if (!exists) return [];
    const raw = await fs.readFile(RESP_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('readAll error', e);
    return [];
  }
}

async function writeAll(arr) {
  await fs.ensureDir(DATA_DIR);
  await fs.writeFile(RESP_FILE, JSON.stringify(arr, null, 2), 'utf-8');
}

function calcScores(ans) {
  const get = k => Number(ans[k] || 0);
  const groups = {
    OK: ['OK1','OK2','OK3','OK4','OK5'],
    PH: ['PH1','PH2','PH3','PH4','PH5'],
    KD: ['KD1','KD2','KD3','KD4','KD5'],
    TE: ['TE1','TE2','TE3','TE4','TE5']
  };
  function avg(keys) {
    const s = keys.reduce((a,k)=>a+get(k), 0);
    return Number((s/keys.length).toFixed(2));
  }
  const OK_Ort = avg(groups.OK);
  const PH_Ort = avg(groups.PH);
  const KD_Ort = avg(groups.KD);
  const TE_Ort = avg(groups.TE);
  const Genel_Ort = Number(((OK_Ort+PH_Ort+KD_Ort+TE_Ort)/4).toFixed(2));
  return { OK_Ort, PH_Ort, KD_Ort, TE_Ort, Genel_Ort };
}

// Submit endpoint
app.post('/api/submit', async (req, res) => {
  try {
    const { answers } = req.body || {};
    if (!answers) return res.status(400).send('answers gerekli');
    const keys = [
      'OK1','OK2','OK3','OK4','OK5',
      'PH1','PH2','PH3','PH4','PH5',
      'KD1','KD2','KD3','KD4','KD5',
      'TE1','TE2','TE3','TE4','TE5'
    ];
    for (const k of keys) {
      if (typeof answers[k] === 'undefined') return res.status(400).send(`Eksik madde: ${k}`);
      const v = Number(answers[k]);
      if (!(v>=1 && v<=5)) return res.status(400).send(`Geçersiz değer (1-5): ${k}`);
    }

    const scores = calcScores(answers);
    const record = {
      zamanISO: new Date().toISOString(),
      ...answers,
      ...scores
    };
    const all = await readAll();
    all.push(record);
    await writeAll(all);
    return res.json({ ok: true, record });
  } catch (e) {
    console.error(e);
    return res.status(500).send('Sunucu hatası');
  }
});

// List responses + basic stats
app.get('/api/responses', async (req, res) => {
  const all = await readAll();
  const count = all.length;
  function mean(key) {
    if (count===0) return null;
    const s = all.reduce((a,r)=>a+Number(r[key]||0),0);
    return Number((s/count).toFixed(2));
  }
  const stats = {
    OK_Ort: mean('OK_Ort'),
    PH_Ort: mean('PH_Ort'),
    KD_Ort: mean('KD_Ort'),
    TE_Ort: mean('TE_Ort'),
    Genel_Ort: mean('Genel_Ort'),
  };
  return res.json({ count, stats, responses: all.slice(-1000) }); // son 1000 kaydı döndür
});

// CSV export
app.get('/api/export.csv', async (req, res) => {
  const all = await readAll();
  const headers = ["zamanISO","OK1","OK2","OK3","OK4","OK5","PH1","PH2","PH3","PH4","PH5","KD1","KD2","KD3","KD4","KD5","TE1","TE2","TE3","TE4","TE5","OK_Ort","PH_Ort","KD_Ort","TE_Ort","Genel_Ort"];
  const rows = [headers].concat(all.map(d => headers.map(h => String(d[h] ?? ""))));
  const csv = rows.map(r => r.map(v => `"${v.replaceAll('"','""')}"`).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="anket_sonuclari.csv"');
  res.send(csv);
});

// Admin clear (optional)
app.delete('/api/responses', async (req, res) => {
  if (!ADMIN_TOKEN) return res.status(403).send('ADMIN_TOKEN ayarlı değil');
  const token = req.headers['x-admin-token'];
  if (token !== ADMIN_TOKEN) return res.status(401).send('Yetkisiz');
  await writeAll([]);
  return res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`API çalışıyor: http://localhost:${PORT}`);
});
