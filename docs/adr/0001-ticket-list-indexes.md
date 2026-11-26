# ADR 0001: Indexes for the Ticket List Endpoint

**Status:** Accepted

## Context

The ticket list endpoint must support multiple query patterns on a large table (~4M rows in production) while keeping the p95 latency below 150 ms. The table also receives continuous writes, so every index adds write cost.

The goal of these experiments was to find the smallest set of indexes that provides good read performance while keeping write overhead reasonable.

All results below were measured on the seeded dataset (300k rows), PostgreSQL 16.15, using the second (warm cache) execution.

---

## Decision

Keep the following indexes:

### `tickets_org_created_idx`

```sql
(org_id, created_at, id)
```

### `tickets_org_assignee_active_idx`

```sql
(org_id, assignee_id, created_at, id)
WHERE status IN ('open', 'pending')
```

### `tickets_org_updated_idx`

```sql
(org_id, updated_at, id)
```

---

## Why these indexes?

### 1. `tickets_org_created_idx`

This index gave stable performance for all `createdAt` queries and keyset pagination.

| Query | Result |
| ------ | ------ |
| Default inbox, page 1 | 5 buffers |
| Default inbox, page 500 | 7 buffers |
| Unassigned tickets | 7 buffers |

This became the base index for all `createdAt` queries.

---

### 2. `tickets_org_assignee_active_idx`

```sql
(org_id, assignee_id, created_at, id)
WHERE status IN ('open', 'pending')
```

This index gave the best performance for the "My Tickets" queries.

For the worst-case user (agent60):

- **I1:** planner switched to a sequential scan.
- **B1:** 1,438 buffers.
- **B2:** 181 buffers.

Unlike B1, the cost of B2 depends only on the agent's current open tickets, not their entire ticket history.

---

### 3. `tickets_org_updated_idx`

The API contract supports sorting by `updatedAt`.

With this index:

- Index Scan
- ~0.14 ms

Without this index:

- Parallel Sequential Scan
- ~25 ms

Without an index on `updated_at`, the query would become much slower as the table grows.

---

## Rejected alternatives

### I2

```sql
(org_id, status, created_at, id)
```

Although it looked promising, PostgreSQL chose a Bitmap Scan followed by a Sort.

**Result**

- 4,409 buffers
- ~30 ms

Adding `status` to the index did not improve the query.

---

### I3

```sql
(org_id, created_at, id)
WHERE status IN ('open', 'pending')
```

The default inbox already used only 5 buffers with I1.

I3 also used 5 buffers, so it provided no measurable improvement while adding another index to maintain.

---

### B1

```sql
(org_id, assignee_id, created_at, id)
```

For agent60, B1 required reading all tickets ever assigned to that user.

**Result**

- 1,438 buffers

As an agent's history grows, the read cost also grows.

B2 avoids this by indexing only active tickets.

---

### Standalone `(assignee_id)` index

This index would only help `ON DELETE SET NULL` operations.

Hard user deletion is a rare administrative task, so adding another permanent index was not considered worthwhile.

---

## Consequences

Adding the `updated_at` index means HOT updates are no longer possible.

Every ticket update now creates new index entries, increasing:

- write cost
- WAL (write-ahead log) generation
- index maintenance

This trade-off was accepted because supporting `-updatedAt` is part of the API contract.

---

## Final measurements

After applying the final index set, the queries were measured again on the seeded dataset (300k rows). The second (warm cache) execution was used for all measurements.

| Query | Final plan | Buffers | Time (ms) |
| ------ | ---------- | -------: | --------: |
| A: default inbox, page 1 | Index Scan Backward (`tickets_org_created_idx`) | 5 | 0.132 |
| C: default inbox, page 500 | Index Scan Backward (`tickets_org_created_idx`) | 7 | 0.189 |
| B: agent1 urgent | Index Scan Backward (`tickets_org_assignee_active_idx`) | 252 | 0.797 |
| B: agent60 urgent | Index Scan Backward (`tickets_org_assignee_active_idx`) | 29 | 0.124 |
| D: unassigned | Index Scan Backward (`tickets_org_created_idx`) | 7 | 0.200 |
| E: Lumen | Index Scan + Sort (`tickets_org_assignee_active_idx`) | 13 | 0.324 |
| `-updatedAt` default inbox | Index Scan Backward (`tickets_org_updated_idx`) | 7 | 0.192 |

These measurements confirm that the selected indexes cover all supported query patterns while keeping buffer usage and execution time low.

---

## Known limitations and follow-ups

- `ON DELETE SET NULL` still scans the `tickets` table because there is no index starting with `assignee_id`.
- If the product only needs `updatedAt` for active tickets, a partial `updated_at` index could reduce both read and write cost.
- PostgreSQL 17 improves some `IN` list optimizations, so I2 may be worth testing again after an upgrade.
- The experiments included both a common case (agent1) and a worst-case user (agent60) to avoid optimizing only for heavily assigned agents.