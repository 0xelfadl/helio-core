import type { Faker } from '@faker-js/faker';
import { Rng, skewedIndex, weightedPick } from './random.js';
import { generateCreatedAtTimes, MS_PER_DAY } from './timestamps.js';
import type { TenantSpec } from './tenants.js';
import { uuidV7 } from './uuid-v7.js';

export type Role = 'admin' | 'agent' | 'viewer';
export type Status = 'open' | 'pending' | 'solved' | 'closed';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export interface SeedOrganization { id: string; name: string; createdAt: Date }
export interface SeedUser {
  id: string; orgId: string; name: string; email: string; role: Role; createdAt: Date;
}
export interface SeedTicket {
  id: string; orgId: string; subject: string; status: Status; priority: Priority;
  requesterId: string; assigneeId: string | null; createdAt: Date; updatedAt: Date;
}

export interface SeedContext { rng: Rng; faker: Faker; anchorMs: number }

export interface TenantUsers { admin: SeedUser; agents: SeedUser[]; requesters: SeedUser[] }

const ACCOUNTS_AGE_DAYS = 800;
const TICKET_SPAN_DAYS = 730;

const STATUS_BY_AGE: ReadonlyArray<{
  maxAgeDays: number;
  weights: ReadonlyArray<readonly [Status, number]>;
}> = [
  { maxAgeDays: 7,        weights: [['open', 50], ['pending', 25], ['solved', 22], ['closed', 3]] },
  { maxAgeDays: 60,       weights: [['open', 15], ['pending', 10], ['solved', 62], ['closed', 13]] },
  { maxAgeDays: Infinity, weights: [['open', 2],  ['pending', 1],  ['solved', 77], ['closed', 20]] },
];

const UNASSIGNED_RATE: Record<Status, number> = {
  open: 0.4, pending: 0.1, solved: 0.01, closed: 0.01,
};

const MAX_DAYS_UNTIL_UPDATE: Record<Status, number> = {
  open: 0, pending: 2, solved: 7, closed: 10,
};

const PRIORITY_WEIGHTS: ReadonlyArray<readonly [Priority, number]> = [
  ['low', 30], ['normal', 50], ['high', 15], ['urgent', 5],
];

const SUBJECT_TOPICS = [
  'Cannot log in', 'Refund request', 'Invoice looks wrong', 'Export failed',
  'Account locked', 'Question about pricing', 'Bug report', 'Integration error',
  'Password reset email missing', 'Feature request',
] as const;

function pickStatus(rng: Rng, ageDays: number): Status {
  const bucket = STATUS_BY_AGE.find((b) => ageDays < b.maxAgeDays)!;
  return weightedPick(rng, bucket.weights);
}
export function buildOrganization(ctx: SeedContext, spec: TenantSpec): SeedOrganization {
  const createdMs = ctx.anchorMs - ACCOUNTS_AGE_DAYS * MS_PER_DAY;
  return { id: uuidV7(createdMs, ctx.rng), name: spec.name, createdAt: new Date(createdMs) };
}
export function buildUsers(ctx: SeedContext, spec: TenantSpec, orgId: string): TenantUsers {
  const createdMs = ctx.anchorMs - ACCOUNTS_AGE_DAYS * MS_PER_DAY;
  const make = (localPart: string, role: Role): SeedUser => ({
    id: uuidV7(createdMs, ctx.rng),
    orgId,
    name: ctx.faker.person.fullName(),
    email: `${localPart}@${spec.slug}.test`,
    role,
    createdAt: new Date(createdMs),
  });

  return {
    admin: make('admin', 'admin'),
    agents: Array.from({ length: spec.agents }, (_, i) => make(`agent${i + 1}`, 'agent')),
    requesters: Array.from({ length: spec.requesters }, (_, i) => make(`viewer${i + 1}`, 'viewer')),
  };
}
export function buildTickets(
  ctx: SeedContext,
  spec: TenantSpec,
  orgId: string,
  users: TenantUsers,
): SeedTicket[] {
  if (users.agents.length === 0 || users.requesters.length === 0) {
    throw new Error(`Tenant ${spec.slug} needs at least one agent and one requester`);
  }

  const times = generateCreatedAtTimes(spec.tickets, ctx.rng, {
    anchorMs: ctx.anchorMs,
    spanDays: TICKET_SPAN_DAYS,
    burstShare: 0.25,
    minBurst: 20,
    maxBurst: 200,
  });

  return times.map((createdMs): SeedTicket => {
    const ageDays = (ctx.anchorMs - createdMs) / MS_PER_DAY;
    const status = pickStatus(ctx.rng, ageDays);

    const isUnassigned = ctx.rng() < UNASSIGNED_RATE[status];
    const assignee = isUnassigned
      ? null
      : users.agents[skewedIndex(ctx.rng, users.agents.length)]!;
    const requester = users.requesters[Math.floor(ctx.rng() * users.requesters.length)]!;

    const delayMs = Math.floor(ctx.rng() * MAX_DAYS_UNTIL_UPDATE[status] * MS_PER_DAY);
    const updatedMs = Math.min(createdMs + delayMs, ctx.anchorMs);

    return {
      id: uuidV7(createdMs, ctx.rng),
      orgId,
      subject: `${ctx.faker.helpers.arrayElement(SUBJECT_TOPICS)}: ${ctx.faker.commerce.productName()}`,
      status,
      priority: weightedPick(ctx.rng, PRIORITY_WEIGHTS),
      requesterId: requester.id,
      assigneeId: assignee?.id ?? null,
      createdAt: new Date(createdMs),
      updatedAt: new Date(updatedMs),
    };
  });
}
