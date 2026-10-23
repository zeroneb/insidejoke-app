// Photos, voice notes and videos live in file storage (Vercel Blob), not in the database.
// The database only keeps the link, so pages stay light. Photos are shrunk first.
// Without BLOB_READ_WRITE_TOKEN (local dev) the shrunk file is kept inline as before.
import crypto from 'node:crypto';

const OK_TYPES = /^(image\/(jpeg|png|webp|gif|heic|heif|avif)|audio\/(webm|mp4|mpeg|ogg|aac|x-m4a)|video\/(webm|mp4|quicktime))$/;

export const blobOn = () => !!process.env.BLOB_READ_WRITE_TOKEN;
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'audio/ogg': 'ogg', 'video/webm': 'webm', 'video/mp4': 'mp4', 'video/quicktime': 'mov' };

async function shrink(buf, type, max) {
  if (!/^image\/(jpeg|png|webp|heic|heif|avif)$/.test(type)) return { buf, type };
  try {
    const { default: sharp } = await import('sharp');
    const out = await sharp(buf).rotate().resize({ width: max, height: max, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    return { buf: out, type: 'image/jpeg' };
  } catch { return { buf, type }; }
}

// buf + type -> a URL (or a small data URI locally). folder: 'items' | 'people' | 'notes'.
export async function storeMedia(buf, type, folder, { max = 1200 } = {}) {
  const s = await shrink(buf, type, max);
  if (blobOn()) {
    const { put } = await import('@vercel/blob');
    const name = `${folder}/${crypto.randomBytes(9).toString('base64url')}.${EXT[s.type] || 'bin'}`;
    const r = await put(name, s.buf, { access: 'public', contentType: s.type, addRandomSuffix: false, cacheControlMaxAge: 60 * 60 * 24 * 365 });
    return r.url;
  }
  return `data:${s.type};base64,${s.buf.toString('base64')}`;
}

export async function storeDataUri(uri, folder, opts) {
  const m = /^data:([^;,]+)(?:;[^,]*)?;base64,(.*)$/s.exec(uri || '');
  if (!m || !OK_TYPES.test(m[1])) return null;
  return storeMedia(Buffer.from(m[2], 'base64'), m[1], folder, opts);
}

export async function storeFile(f, folder, opts) {
  const type = String(f?.type || '').split(';')[0].trim();
  if (!OK_TYPES.test(type)) return null;
  return storeMedia(Buffer.from(await f.arrayBuffer()), type, folder, opts);
}
