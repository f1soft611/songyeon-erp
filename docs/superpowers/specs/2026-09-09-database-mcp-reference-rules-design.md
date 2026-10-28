# Database MCP Reference Rules Design

## Goal

Require database-related S-ERP work to verify the current central PostgreSQL contract through the workspace read-only MCP server before implementation, without imposing database access on unrelated UI work.

## Scope

The rule applies when a task creates, changes, debugs, or documents database queries, tables, columns, data constraints, migrations, or backend API data contracts. It does not apply to frontend-only presentation changes that do not depend on database structure.

## Architecture

`AGENTS.md` contains the workspace-wide decision rule and completion evidence requirement. A dedicated `.github/instructions/database-mcp.instructions.md` supplies actionable steps when an agent edits backend Java, MyBatis XML, SQL, or database documentation. The existing `s-erp-postgresql-readonly` MCP server remains the only database access path and is never used for mutations.

## Required Workflow

1. Confirm that the task is database-related.
2. Before implementation, use `list_tables` and `describe_table`, then use a limited `query_readonly` only when schema metadata is insufficient.
3. Treat the MCP response as evidence of the current database contract; do not record sensitive row values in task documents.
4. Continue to use the repository's date-based SQL migration and rollback record rules for every schema change. MCP cannot replace migration history.
5. If the MCP server cannot connect, record the reason in the result document and use the current schema history, Mapper XML, and domain code as fallback evidence.

## Safety

- Only the registered `s-erp-postgresql-readonly` server is allowed.
- Do not request or persist credentials in task documents, code, test output, or chat responses.
- Use only `list_tables`, `describe_table`, and `query_readonly`; the server itself rejects non-read-only SQL.
- Prefer metadata and aggregate or limited queries. Do not copy personal, account, authentication, or tenant data into documentation.

## Validation

Validate the customization frontmatter and confirm the instruction's `applyTo` pattern includes backend Java, mapper XML, SQL, and database documentation but not frontend-only sources. Review the resulting root checklist and instruction text for consistent MCP server name and fallback workflow.
