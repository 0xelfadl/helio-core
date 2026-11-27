-- Hand-edited: CONCURRENTLY so the build never blocks writes on tickets (4M rows in prod).
-- If a build fails, see docs/runbooks/failed-concurrent-index.md.

-- CreateIndex
CREATE INDEX CONCURRENTLY "tickets_org_created_idx" ON "tickets"("org_id", "created_at", "id");

-- CreateIndex
CREATE INDEX CONCURRENTLY "tickets_org_assignee_active_idx" ON "tickets"("org_id", "assignee_id", "created_at", "id") WHERE (status IN ('open', 'pending'));

-- CreateIndex
CREATE INDEX CONCURRENTLY "tickets_org_updated_idx" ON "tickets"("org_id", "updated_at", "id");
