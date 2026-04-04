-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "pr_number" INTEGER NOT NULL,
    "scope_type" TEXT NOT NULL,
    "scope_target_id" TEXT NOT NULL,
    "claude_session_id" TEXT NOT NULL,
    "title" TEXT,
    "created_at" DATETIME NOT NULL,
    "updated_at" DATETIME NOT NULL,
    "last_used_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatSession_claude_session_id_key" ON "ChatSession"("claude_session_id");

-- CreateIndex
CREATE INDEX "ChatSession_project_id_pr_number_idx" ON "ChatSession"("project_id", "pr_number");

-- CreateIndex
CREATE INDEX "ChatSession_project_id_pr_number_scope_type_scope_target_id_idx" ON "ChatSession"("project_id", "pr_number", "scope_type", "scope_target_id");
