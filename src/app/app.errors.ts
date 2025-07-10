import { InternalServerErrorException } from '@nestjs/common';

export class UnsupportedMessageTypeError extends InternalServerErrorException {
  constructor(messageType: string) {
    super(`Unsupported message type: ${messageType}`);
  }
}
