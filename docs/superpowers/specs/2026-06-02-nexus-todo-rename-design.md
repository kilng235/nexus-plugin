# Nexus Todo-Only Rename and Migration Design

Date: 2026-06-02

## Context

Nexus currently uses a Kanban-named markdown data file (`nexus-kanban.md`) and Kanban-oriented configuration, but the current product shape exposes only a Todo experience to the user. The user wants the product to match that reality: rename the data file and configuration from Kanban to Todo, reduce the data model to two user-visible columns (`待办` and `已完成`), and safely migrate existing data without silent loss.

The existing implementation already supports the key runtime behaviors we want to preserve:
- task creation writes structured markdown data
- checking a task moves it to the final column and marks it complete
- unchecking returns it to the first column
- completed items can be pruned on the next day

So this change is not a rewrite into a raw checklist format. It is a product-level rename and data-shape migration that keeps the stable structured markdown mechanics underneath.

## Goals

1. Rename the default Nexus task data file from `nexus-kanban.md` to `nexus-todo.md`.
2. Rename user-facing configuration and labels from Kanban terminology to Todo terminology.
3. Normalize the default data template to two columns only: `待办` and `已完成`.
4. Migrate existing users safely from old Kanban-named files and config.
5. Preserve all current task behaviors after migration.

## Non-Goals

1. Do not replace the structured markdown format with a plain checklist file.
2. Do not redesign task interaction behavior beyond the rename and two-column normalization.
3. Do not silently overwrite a newer Todo file with older Kanban data.

## Recommended Approach

### 1. Rename the public product surface to Todo

Update the user-visible product surface so it consistently reflects a Todo-only model:
- default config path changes from `nexus/nexus-kanban` to `nexus/nexus-todo`
- default file name changes from `nexus-kanban.md` to `nexus-todo.md`
- settings UI changes from “看板文件” to Todo-oriented wording such as “待办文件”
- migration notices and related copy use Todo terminology, not Kanban terminology

Internal code can still keep some compatible implementation structure during the transition, but the user-facing experience should become uniformly Todo-first in this change.

### 2. Introduce config compatibility for old users

Move from `kanbanFile` to `todoFile` at the settings level.

Compatibility behavior:
- on load: prefer `todoFile`; if absent, fall back to legacy `kanbanFile`
- on save: write only `todoFile`
- defaults: use the new Todo path

This gives old users a smooth upgrade path while ensuring all future persisted settings use Todo naming.

### 3. Migrate data files with explicit confirmation

Migration should run at startup when old data is detected, but it must not silently rewrite or delete files.

#### Case A: only old file exists
If `nexus-kanban.md` exists and `nexus-todo.md` does not:
- prompt the user to migrate
- on confirmation:
  - create the new Todo file
  - migrate tasks into the new file
  - normalize to two columns
  - update config to the new Todo path
  - optionally delete the old Kanban file as part of the confirmed migration flow
- on cancellation:
  - keep using the old file for now or defer the migration cleanly, depending on implementation simplicity

#### Case B: both old and new files exist
The user explicitly wants:
- keep the new Todo file
- delete the old Kanban file

This still must be gated by a confirmation prompt. The prompt should clearly state that the Todo file will be kept and the Kanban file removed.

#### Case C: only new file exists
- use the new Todo file directly
- no migration prompt

### 4. Normalize migrated data into two columns

Old data may contain `待做`, `进行中`, and `已完成`. After migration, the Todo file should contain exactly two user-visible columns:
- `待办`
- `已完成`

Normalization rule:
- every unchecked task goes to `待办`
- every checked task goes to `已完成`

The migration should not preserve `进行中` as a separate concept in the output file. Its unchecked tasks are merged into `待办`.

### 5. Preserve existing runtime behavior

After migration, runtime task behavior should remain the same:
- creating a task inserts it into the first column (`待办`)
- checking a task moves it to the last column (`已完成`)
- unchecking returns it to the first column (`待办`)
- next-day cleanup of completed tasks still applies to the completed column

This works well with the current “first column = active, last column = done” behavior and avoids unnecessary logic churn.

## Implementation Shape

### Files likely to change

- `src/types.ts`
  - rename/default settings updates
  - add `todoFile` setting and legacy compatibility path handling
- `src/main.ts`
  - startup migration detection and prompting flow
- `src/config-sync.ts`
  - compatibility for loading old `kanbanFile` and saving new `todoFile`
- `src/kanban-sync.ts` or renamed sync layer
  - update default content template to two columns
  - keep structured parsing/writing behavior
- `src/modules/todo.ts`
  - confirm assumptions still match Todo-first naming
- settings UI code in `src/main.ts`
  - rename labels/descriptions from Kanban to Todo

Optional but recommended:
- rename key types/classes toward Todo naming where safe, while preserving behavior
- keep focused compatibility shims where a full rename would create unnecessary risk in one pass

## Error Handling

1. Never silently overwrite a newer Todo file with migrated Kanban data.
2. Never silently delete the old Kanban file.
3. If migration fails:
   - keep the original file intact
   - do not switch config to the new path
   - surface a clear error notice
4. If both files exist and deletion of the old file fails:
   - continue using the new Todo file
   - notify the user that cleanup of the old file did not complete

## Testing Strategy

### Automated

Add or update tests for:
1. config compatibility (`todoFile` preferred, `kanbanFile` fallback)
2. migration from old file to new file
3. three-column to two-column normalization
4. conflict handling when both files exist
5. preserving check/uncheck behavior after migration
6. preserving cross-day cleanup behavior after migration

### Manual

1. Start from an old `nexus-kanban.md` with tasks in `待做`, `进行中`, and `已完成`.
2. Confirm migration.
3. Verify a new `nexus-todo.md` is created with only `待办` and `已完成`.
4. Verify unchecked items from both `待做` and `进行中` end up in `待办`.
5. Verify checked items end up in `已完成`.
6. Verify task creation/check/uncheck still works in the Todo UI.
7. Verify that if both files exist, the Todo file is kept and the old Kanban file is removed only after confirmation.
8. Verify next-day cleanup still removes prior-day completed tasks from the Todo file.

## User-Facing Prompt Copy

### Old file only
"检测到旧版待办数据文件 `nexus-kanban.md`。Nexus 现已改为使用 Todo 命名。是否将旧文件迁移为新的 `nexus-todo.md`？迁移会保留现有任务，并将“待做 / 进行中 / 已完成”整理为“待办 / 已完成”。"

### Old and new files both exist
"同时检测到旧文件 `nexus-kanban.md` 和新文件 `nexus-todo.md`。将保留新的 Todo 文件，并删除旧的 Kanban 文件。是否继续？"

## Summary

This design converts Nexus from a Kanban-named task data experience into a Todo-first one without discarding the stable structured markdown engine underneath. It changes the public naming, safely migrates existing users, collapses the file model to two columns, and preserves current runtime task behavior and cleanup logic.