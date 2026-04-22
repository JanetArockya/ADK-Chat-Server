const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const IMAGE_MAX = 3 * 1024 * 1024;
const FILE_MAX = 20 * 1024 * 1024;

const upload = multer({
  storage,
  limits: { fileSize: FILE_MAX },
  fileFilter: (_req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    if (isImage && file.size > IMAGE_MAX) {
      return cb(new Error('Image files must be under 3 MB'));
    }
    cb(null, true);
  },
});

module.exports = { upload, UPLOAD_DIR };
