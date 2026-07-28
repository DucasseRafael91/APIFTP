require('dotenv').config();
const express = require('express');
const multer = require('multer');
const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = process.env.API_KEY;
const FTP_HOST = process.env.FTP_HOST;
const FTP_PORT = process.env.FTP_PORT ? parseInt(process.env.FTP_PORT, 10) : 21;
const FTP_USER = process.env.FTP_USER;
const FTP_PASS = process.env.FTP_PASS;
const FTP_SECURE = process.env.FTP_SECURE !== 'false';
const FTP_REMOTE_DIR = process.env.FTP_REMOTE_DIR || '/images';

const TMP_DIR = path.join(__dirname, 'tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

const upload = multer({
  dest: TMP_DIR,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    cb(null, allowed.includes(file.mimetype));
  }
});

app.use(cors());
app.use(express.json());

function checkApiKey(req, res, next) {
  if (req.header('x-api-key') !== API_KEY) return res.sendStatus(401);
  next();
}

app.post('/api/upload-image', checkApiKey, upload.single('image'), async (req, res) => {
  if (!req.file) return res.sendStatus(400);

  const localPath = req.file.path;
  const remoteName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
  const remotePath = `${FTP_REMOTE_DIR}/${remoteName}`;

  const client = new ftp.Client();

  try {
    await client.access({
      host: FTP_HOST,
      port: FTP_PORT,
      user: FTP_USER,
      password: FTP_PASS,
      secure: FTP_SECURE
    });
    await client.uploadFrom(localPath, remotePath);
    res.json({ success: true, filename: remoteName });
  } catch (err) {
    res.sendStatus(500);
  } finally {
    client.close();
    fs.unlink(localPath, () => {});
  }
});

app.listen(PORT);