import { describe, expect, it } from 'vitest';
import { ApiException } from '../common/errors/api.exception.js';
import {ListTicketsQueryPipe} from "./list-tickets-query.pipe.js";

describe("ListTicketsQueryPipe",()=>{
    const pipe = new ListTicketsQueryPipe();

      it('returns the parsed query for valid input', () => {
          expect(pipe.transform({ limit: '10' }).limit).toBe(10);
      });

    it('throws a 400 VALIDATION_FAILED ApiException naming the field',()=>{
        try{
            pipe.transform({limit:'abc'});
            expect.unreachable('should have thrown');
        } catch(error){
            expect(error).toBeInstanceOf(ApiException);
            const apiError = error as ApiException;
            expect(apiError.getStatus()).toBe(400);
            expect(apiError.code).toBe('VALIDATION_FAILED');
            expect(apiError.details).toMatchObject({field:'limit'});
        }
    });
});
