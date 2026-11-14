import { HttpStatus, Injectable, PipeTransform } from '@nestjs/common';
import { ApiException } from '../common/errors/api.exception.js';
import { ListTicketsQuery, parseListTicketsQuery } from './list-tickets.query.js';

@Injectable()
export class ListTicketsQueryPipe implements PipeTransform<unknown, ListTicketsQuery> {
  transform(value: unknown): ListTicketsQuery {
    const result = parseListTicketsQuery(value);
    if (!result.ok) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_FAILED',
        `Invalid query parameter: ${result.error.field}`,
        { field: result.error.field, reason: result.error.reason },
      );
    }
    return result.value;
  }
}