import 'dotenv/config';
import { parseArgs } from 'node:util';
import { JwtService } from '@nestjs/jwt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const DEFAULT_TTL_SECONDS = 3600;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to mint dev tokens when NODE_ENV=production');
  }

  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      ttl: { type: 'string', default: String(DEFAULT_TTL_SECONDS) },
    },
  });
  if (!values.email) {
    throw new Error('Usage: dev:token --email <email> [--ttl <seconds>]');
  }
  const ttlSeconds = Number(values.ttl);
  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error('--ttl must be a positive integer (seconds)');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: requireEnv('DATABASE_URL') }),
  });

  try {
    const users = await prisma.user.findMany({
      where: { email: values.email },
      select: { id: true, orgId: true, role: true },
      take: 2,
    });
    if (users.length === 0) throw new Error(`No user with email ${values.email}`);
    if (users.length > 1) throw new Error(`Email ${values.email} exists in several orgs`);
    const [user] = users;

    const jwt = new JwtService({ secret: requireEnv('JWT_SECRET') });
    const token = await jwt.signAsync(
      { sub: user!.id, org_id: user!.orgId, role: user!.role },
      {
        algorithm: 'HS256',
        issuer: requireEnv('JWT_ISSUER'),
        audience: requireEnv('JWT_AUDIENCE'),
        expiresIn: ttlSeconds,
      },
    );
    process.stdout.write(`${token}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});