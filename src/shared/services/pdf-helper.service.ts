import { Injectable } from '@nestjs/common';
import { pdfToPng } from 'pdf-to-png-converter';

@Injectable()
export class PdfHelperService {
  async convertPdfToPng(data: Buffer): Promise<string[]> {
    const parsedPages = await pdfToPng(data, {
      viewportScale: 2.0,
    });

    return parsedPages.map((page) => page.content.toString('base64'));
  }
}
