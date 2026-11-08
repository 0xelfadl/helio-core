import 'dotenv/config';
import { Faker, en } from '@faker-js/faker';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  buildOrganization,
  buildTickets,
  buildUsers,
  SeedContext,
  SeedOrganization,
  SeedTicket,
  SeedUser,
} from './seeding/builders.js';
import { createRng } from './seeding/random.js';
import { TENANTS } from './seeding/tenants.js';

const SEED = 142;
/** Fixed "now" for the dataset, so every run produces identical timestamps. */
const ANCHOR_MS = Date.UTC(2026, 10, 1);
/** Tickets have 9 columns: 9 × 5,000 = 45,000 bind params, under Postgres' 65,535 limit. */
const BATCH_SIZE = 5_000;
const LOCAL_DB_HOSTS = new Set(['localhost', '127.0.0.1', 'postgres']);
/** The E2E test loads a second page of "Me + urgent": needs more than one page (25). */
const MIN_STAR_AGENT_URGENT_OPEN = 26;
const MIN_LARGEST_TIE_GROUP = 26;
// Guards : refuse the prod and prod database
// the duplication of requireEnv it's normal rigth now but if we add it third time maybe we should things use utils/env.ts file 
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}
function assertSafeTarget(databaseUrl: string): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed when NODE_ENV=production');
  }
  const host = new URL(databaseUrl).hostname;
  if (!LOCAL_DB_HOSTS.has(host)) {
    throw new Error(`Refusing to seed a non-local database (host: ${host})`);
  }
}
// Build : all the tenants that we alerady build 
function buildDataset() {
  const faker = new Faker({ locale: [en] });
  faker.seed(SEED);
  const ctx: SeedContext = { rng: createRng(SEED), faker, anchorMs: ANCHOR_MS };

  const organizations: SeedOrganization[] = [];
  const users: SeedUser[] = [];
  const tickets: SeedTicket[] = [];

  for (const spec of TENANTS) {
    const org = buildOrganization(ctx, spec);
    const tenantUsers = buildUsers(ctx, spec, org.id);
    organizations.push(org);
    for (const user of [tenantUsers.admin, ...tenantUsers.agents, ...tenantUsers.requesters]) {
      users.push(user);
    }
    // you are asking why i' use for instead of use the whole function inside tickets.push man we are use 200_000 tickets and this things will crash for sure js don't support all this arguments in one shot , neaither you don't support that :) 
    for (const ticket of buildTickets(ctx, spec, org.id, tenantUsers)) {
      tickets.push(ticket);
    }
  }
  // Sort: let's sort them by created_at across the tenants
  tickets.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return { organizations, users, tickets };
}
// Insert: orgs and users and tickets in batches of 5000 
async function insertInBatches<T>(
  label: string,
  rows: readonly T[],
  insert: (batch: T[]) => Promise<unknown>,
): Promise<void> {
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    await insert(rows.slice(start, start + BATCH_SIZE));
  }
  console.log(`  inserted ${rows.length.toLocaleString()} ${label}`);
}
// verify : query and let's test 
async function verifyPreconditions(prisma: PrismaClient, users: SeedUser[]): Promise<void> {
  const star = users.find((u) => u.email === 'agent1@acme.test');
  if (!star) throw new Error('Known account agent1@acme.test is missing');

  const starUrgentOpen = await prisma.ticket.count({
    where: {
      orgId: star.orgId,
      assigneeId: star.id,
      priority: 'urgent',
      status: { in: ['open', 'pending'] },
    },
  });

  const [largest] = await prisma.$queryRaw<{ ties: number }[]>`
    SELECT count(*)::int AS ties
    FROM tickets
    WHERE org_id = ${star.orgId}::uuid
    GROUP BY created_at
    ORDER BY ties DESC
    LIMIT 1`;

  console.log(`  agent1@acme.test urgent open+pending: ${starUrgentOpen}`);
  console.log(`  largest group of identical created_at in acme: ${largest?.ties ?? 0}`);

  if (starUrgentOpen < MIN_STAR_AGENT_URGENT_OPEN) {
    throw new Error(`E2E precondition failed: agent1 has only ${starUrgentOpen} urgent open tickets`);
  }
  if ((largest?.ties ?? 0) < MIN_LARGEST_TIE_GROUP) {
    throw new Error('Pagination precondition failed: no tie group larger than a page');
  }
}

async function main(): Promise<void> {
  const databaseUrl = requireEnv('DATABASE_URL');
  assertSafeTarget(databaseUrl);

  const startedAt = Date.now();
  const { organizations, users, tickets } = buildDataset();
  console.log(`Built dataset in ${Date.now() - startedAt} ms`);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  try {
    await prisma.$executeRaw`TRUNCATE TABLE tickets, users, organizations`;
    await insertInBatches('organizations', organizations, (data) => prisma.organization.createMany({ data }));
    await insertInBatches('users', users, (data) => prisma.user.createMany({ data }));
    await insertInBatches('tickets', tickets, (data) => prisma.ticket.createMany({ data }));
    await prisma.$executeRaw`ANALYZE organizations, users, tickets`;
    console.log('Verifying preconditions:');
    await verifyPreconditions(prisma, users);
  } finally {
    await prisma.$disconnect();
  }

  console.log(`Seed finished in ${((Date.now() - startedAt) / 1000).toFixed(1)} s`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});