import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { requireSecret } from '../common/config/require-secret.js';
import {
  CursorContext,
  CursorPosition,
  encodeCursor,
  decodeCursor,
} from './ticket-cursor.js';
import { ApiException } from '../common/errors/api.exception.js';

@Injectable()
export class TicketCursorCodec {
  private readonly logger = new Logger(TicketCursorCodec.name);
  private readonly secret: string;
  constructor(config: ConfigService) {
    this.secret = requireSecret(config, 'CURSOR_SECRET');
  }

  encoded(position: CursorPosition, context: CursorContext) {
    return encodeCursor(position, context, this.secret);
  }

  decode(cursor: string, context: CursorContext) {
    const result = decodeCursor(cursor, context, this.secret);
    if (!result.ok) {
      this.logger.warn(`Rejected cursor: ${result.reason}`);
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'INVALID_CURSOR',
        'The cursor is not valid for this query. Restart from the first page.',
      );
    }
    return result.position;
  }
}
