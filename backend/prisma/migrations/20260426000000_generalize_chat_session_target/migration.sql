-- RecreatTable: ChatSession (SQLite does not support column rename)
CREATE TABLE "ChatSession_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL DEFAULT 'PR',
    "target_number" INTEGER NOT NULL,
    "scope_type" TEXT NOT NULL,
    "scope_target_id" TEXT NOT NULL,
    "claude_session_id" TEXT NOT NULL,
    "title" TEXT,
    "command" TEXT,
    "custom_prompt" TEXT,
    "created_at" DATETIME NOT NULL,
    "updated_at" DATETIME NOT NULL,
    "last_used_at" DATETIME NOT NULL
);

INSERT INTO "ChatSession_new" (
    "id", "project_id", "target_type", "target_number",
    "scope_type", "scope_target_id", "claude_session_id",
    "title", "command", "custom_prompt",
    "created_at", "updated_at", "last_used_at"
)
SELECT
    "id", "project_id", 'PR', "pr_number",
    "scope_type", "scope_target_id", "claude_session_id",
    "title", "command", "custom_prompt",
    "created_at", "updated_at", "last_used_at"
FROM "ChatSession";

DROP TABLE "ChatSession";
ALTER TABLE "ChatSession_new" RENAME TO "ChatSession";

CREATE UNIQUE INDEX "ChatSession_claude_session_id_key" ON "ChatSession"("claude_session_id");
CREATE INDEX "ChatSession_project_id_target_type_target_number_idx" ON "ChatSession"("project_id", "target_type", "target_number");
CREATE INDEX "ChatSession_project_id_target_type_target_number_scope_type_scope_target_id_idx" ON "ChatSession"("project_id", "target_type", "target_number", "scope_type", "scope_target_id");
