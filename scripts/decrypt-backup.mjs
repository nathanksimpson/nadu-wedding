// Decrypts a .nadubackup file (Admin → Full backup) back into the .sql file wrangler can load.
//   node scripts/decrypt-backup.mjs nadu-wedding-production-backup-YYYYMMDD-HHMM.nadubackup > backup.sql
// It asks for the passphrase (or reads NADU_BACKUP_PASSPHRASE). Then restore with:
//   npx wrangler d1 execute nadu-wedding-db --remote --file backup.sql
// Note: when DATA_KEY encryption is on, plan data inside the .sql stays encrypted with DATA_KEY;
// restore into a Worker that has the same DATA_KEY (and DATA_KEY_PREV while rotating).
import { webcrypto as crypto } from 'node:crypto';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export async function decryptBackup(text, passphrase) {
  const f = JSON.parse(text);
  if (f.format !== 'nadu-backup' || f.v !== 1) throw new Error('Not a Nadu backup file');
  const enc = new TextEncoder(), b = (s) => Uint8Array.from(Buffer.from(s, 'base64'));
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: b(f.salt), iterations: f.iter }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  try {
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b(f.iv) }, key, b(f.data)));
  } catch { throw new Error('Wrong passphrase, or the file was changed'); }
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const file = process.argv[2];
  if (!file) { console.error('usage: node scripts/decrypt-backup.mjs <file.nadubackup> > backup.sql'); process.exit(1); }
  let pass = process.env.NADU_BACKUP_PASSPHRASE;
  if (!pass) {
    const rl = (await import('node:readline')).createInterface({ input: process.stdin, output: process.stderr });
    pass = await new Promise((res) => rl.question('Backup passphrase: ', (a) => { rl.close(); res(a); }));
  }
  try { process.stdout.write(await decryptBackup(fs.readFileSync(file, 'utf8'), pass)); }
  catch (e) { console.error(e.message); process.exit(1); }
}
