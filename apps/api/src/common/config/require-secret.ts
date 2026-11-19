import { ConfigService } from '@nestjs/config';

const MIN_SECRET_BYTES = 32;

export function requireSecret(config: ConfigService, name: string): string {
  const secret = config.getOrThrow<string>(name);
  if (Buffer.byteLength(secret, 'utf8') < MIN_SECRET_BYTES) {
    throw new Error(`${name} must be at least ${MIN_SECRET_BYTES} bytes`);
  }
  return secret;
}
