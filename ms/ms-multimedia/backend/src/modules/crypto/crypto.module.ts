import { Module } from '@nestjs/common';
import { CryptoService } from './application/crypto.service';

@Module({
  providers: [CryptoService],
  exports: [CryptoService],
})
export class CryptoModule {}
