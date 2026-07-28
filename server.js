require('dotenv').config();
const express = require('express');
const multer = require('multer');
const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Config ---
const API_KEY = process.env.API_KEY;                 
const FTP_HOST = process.env.FTP_HOST;
const FTP_USER = process.env.FTP_USER;
const FTP_PASS = process.env.FTP_PASS;
const FTP_SECURE = process.env.FTP_SECURE !== 'false'; 
const FTP_REMOTE_DIR = process.env.FTP_REMOTE_DIR || '/images';

// Dossier temporaire local pour stocker le fichier le temps de l'upload FTP
const TMP_DIR = path.join(__dirname, 'tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

const upload = multer({
  dest: TMP_DIR,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 Mo max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Type de fichier non autorisé'));
  }
});

app.use(cors()); // à restreindre si besoin (voir README)
app.use(express.json());

// --- Middleware d'authentification simple par clé API ---
function checkApiKey(req, res, next) {
  const key = req.header('x-api-key');
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  next();
}

// --- Route d'upload ---
app.post('/api/upload-image', checkApiKey, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier reçu' });
  }

  const client = new ftp.Client();
  client.ftp.verbose = false;

  const localPath = req.file.path;
  const remoteName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
  const remotePath = `${FTP_REMOTE_DIR}/${remoteName}`;

  try {
    await client.access({
      host: FTP_HOST,
      user: FTP_USER,
      password: FTP_PASS,
      secure: FTP_SECURE
    });

    await client.uploadFrom(localPath, remotePath);

    res.json({
      success: true,
      filename: remoteName
    });
  } catch (err) {
    console.error('Erreur upload FTP:', err.message);
    res.status(500).json({ error: 'Échec de l\'upload vers le serveur' });
  } finally {
    client.close();
    fs.unlink(localPath, () => {}); // nettoyage du fichier temporaire
  }
});

// --- Route de santé (pour vérifier que l'API tourne) ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`APIFTP démarrée sur le port ${PORT}`);
});
