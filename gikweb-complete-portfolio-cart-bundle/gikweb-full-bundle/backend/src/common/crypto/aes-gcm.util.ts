import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

export class AesGcmCrypto {
  private readonly key: Buffer;

  constructor(hexKey: string) {
    const buf = Buffer.from(hexKey, 'hex');
    if (buf.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be a 32-byte (64-char hex) key.');
    }
    this.key = buf;
  }

  encrypt(plainText: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  decrypt(payload: string): string {
    const parts = payload.split(':');
    if (parts.length !== 3) throw new Error('Invalid encrypted payload format.');
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const encryptedText = Buffer.from(parts[2], 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encryptedText), decipher.final()]).toString('utf8');
  }

  blindIndex(value: string, pepper: string): string {
    return crypto.createHmac('sha256', pepper).update(value.trim()).digest('hex');
  }
}
