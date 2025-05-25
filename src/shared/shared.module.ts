import { Global, Module } from '@nestjs/common';
import { PdfHelperService } from './services/pdf-helper.service';

@Global()
@Module({
  providers: [PdfHelperService],
  exports: [PdfHelperService],
})
export class SharedModule {}
