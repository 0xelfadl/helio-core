# Failed Concurrent Index Migration Runbook

## Purpose

This runbook explains how to recover if a concurrent index migration fails during deployment.

A failed concurrent index build can leave an **invalid index** in PostgreSQL and block future Prisma migrations until the failed migration is resolved.

---

## Symptom

The deployment fails while running:

```bash
pnpm --filter @helio/api exec prisma migrate deploy
```

Later deployments also fail because Prisma reports that a previous migration failed.

---

## Step 1: Check for invalid indexes

Connect to PostgreSQL and run:

```sql
SELECT
    indexrelid::regclass AS index_name,
    indisvalid
FROM pg_index
WHERE indrelid = 'tickets'::regclass;
```

Expected:

```text
indisvalid = t
```

If one of the indexes shows:

```text
indisvalid = f
```

the concurrent index build did not finish successfully.

---

## Step 2: Check for long-running transactions

Concurrent index builds wait for older transactions to finish.

Look for transactions that have been open for a long time:

```sql
SELECT
    pid,
    state,
    xact_start,
    wait_event_type,
    wait_event,
    query
FROM pg_stat_activity
WHERE datname = current_database()
ORDER BY xact_start;
```

If you find a long-running transaction, identify why it is still open before continuing.

---

## Step 3: Remove the invalid index

Drop the invalid index using `CONCURRENTLY` so writes are not blocked.

Example:

```sql
DROP INDEX CONCURRENTLY IF EXISTS "tickets_org_created_idx";
```

or

```sql
DROP INDEX CONCURRENTLY IF EXISTS "tickets_org_assignee_active_idx";
```

or

```sql
DROP INDEX CONCURRENTLY IF EXISTS "tickets_org_updated_idx";
```

---

## Step 4: Mark the failed migration as rolled back

Tell Prisma that the failed migration should be treated as rolled back.

```bash
pnpm --filter @helio/api exec prisma migrate resolve --rolled-back <migration_folder_name>
```

Example:

```bash
pnpm --filter @helio/api exec prisma migrate resolve --rolled-back 20261126230656_concurrent_indexes
```

---

## Step 5: Remove the root cause

Before retrying the deployment:

- Finish or cancel the long-running transaction.
- Verify that no session is still blocking the concurrent index build.

---

## Step 6: Deploy again

Run the deployment again:

```bash
pnpm --filter @helio/api exec prisma migrate deploy
```

Verify that the migration completes successfully.

---

## Prevention

Before deploying concurrent index migrations:

- Check for long-running transactions.
- Avoid running deployments during heavy maintenance jobs.
- Configure a reasonable `lock_timeout` so the migration fails quickly instead of waiting indefinitely.
- If a concurrent index build fails, always remove the invalid index before retrying the migration.