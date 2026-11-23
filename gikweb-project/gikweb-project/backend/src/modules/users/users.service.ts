import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { AesGcmCrypto } from '../../common/crypto/aes-gcm.util';

export interface UserRecord {
  id: string;
  phoneEncrypted: string;
  phoneBlindIndex: string;
  createdAt: string;
}

@Injectable()
export class UsersService {
  private readonly cipher: AesGcmCrypto;
  private readonly pepper: string;
  private readonly usersByIndex = new Map<string, UserRecord>();

  constructor() {
    const fallbackKey = crypto.createHash('sha256').update('gikweb-dev-key').digest('hex');
    this.cipher = new AesGcmCrypto(process.env.ENCRYPTION_KEY || fallbackKey);
    this.pepper = process.env.BLIND_INDEX_PEPPER || 'gikweb-dev-pepper';
  }

  async findOrCreateByPhone(phone: string): Promise<UserRecord> {
    const index = this.cipher.blindIndex(phone, this.pepper);
    const existing = this.usersByIndex.get(index);
    if (existing) return existing;

    const created: UserRecord = {
      id: crypto.randomUUID(),
      phoneEncrypted: this.cipher.encrypt(phone),
      phoneBlindIndex: index,
      createdAt: new Date().toISOString(),
    };
    this.usersByIndex.set(index, created);
    return created;
  }
}
