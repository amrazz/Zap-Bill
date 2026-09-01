import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'zapbill.db');
const uploadsDir = path.join(path.dirname(dbPath), 'uploads');

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export function ensureUploadsDir(): string {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  return uploadsDir;
}

// Saves image bytes to the local uploads folder (next to the SQLite database)
// and returns the app-relative URL to serve it back from.
export function saveUploadBuffer(buffer: Buffer, mime: string): string {
  ensureUploadsDir();
  const ext = EXT_BY_MIME[mime] ?? 'jpg';
  const filename = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(uploadsDir, filename), buffer);
  return `/api/uploads/${filename}`;
}

export function readUpload(filename: string): { buffer: Buffer; mime: string } | null {
  // Guard against path traversal — only plain filenames we generated ourselves are valid.
  if (!/^[a-f0-9-]+\.(jpg|png|webp|gif)$/i.test(filename)) return null;

  const filePath = path.join(uploadsDir, filename);
  if (!fs.existsSync(filePath)) return null;

  const ext = path.extname(filename).slice(1).toLowerCase();
  const mime = Object.entries(EXT_BY_MIME).find(([, e]) => e === ext)?.[0] ?? 'application/octet-stream';
  return { buffer: fs.readFileSync(filePath), mime };
}
