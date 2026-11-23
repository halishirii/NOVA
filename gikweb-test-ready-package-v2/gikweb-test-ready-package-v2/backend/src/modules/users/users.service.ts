import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { AesGcmCrypto } from '../../common/crypto/aes-gcm.util';

@Injectable()
export class UsersService {
  private readonly cipher: AesGcmCrypto;
  private readonly pepper: string;

  constructor() {
    const fallbackKey = crypto.createHash('sha256').update('gikweb-dev-key').digest('hex');
    this.cipher = new AesGcmCrypto(process.env.ENCRYPTION_KEY || fallbackKey);
    this.pepper = process.env.BLIND_INDEX_PEPPER || 'gikweb-dev-pepper';
  }

  async findOrCreateByPhone(phone: string) {
    return {
      id: crypto.randomUUID(),
      phoneEncrypted: this.cipher.encrypt(phone),
      phoneBlindIndex: this.cipher.blindIndex(phone, this.pepper),
    };
  }
}
