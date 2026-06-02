# Nexus Todo Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Nexus 从 Kanban 命名的数据文件与配置迁移为 Todo-only 形态，默认使用 `nexus-todo.md`，保留现有任务行为，并安全迁移旧用户数据。

**Architecture:** 保留现有结构化 markdown 解析/写回引擎，不改成纯 checklist；通过配置兼容层、数据归一化辅助函数和启动期迁移流程，把用户可见层从 `kanban` 全面切换到 `todo`。迁移逻辑明确区分“仅旧文件”“新旧并存”“仅新文件”三种场景，并把删除旧文件放在用户确认之后。

**Tech Stack:** TypeScript、Obsidian plugin API、Node 内置测试运行器、esbuild（若当前环境可用）

---

## File structure

- Create: `__tests__/todo-config-migration.test.ts` — 配置兼容与默认路径测试。
- Create: `__tests__/todo-file-migration.test.ts` — 旧文件迁移、两列归一化、冲突处理测试。
- Create: `src/todo-migration.ts` — Todo 文件路径计算、旧/新文件探测、三列归并两列、迁移决策辅助函数。
- Modify: `src/types.ts` — 新增 `todoFile`，保留旧 `kanbanFile` 兼容输入，更新默认值。
- Modify: `src/config-sync.ts` — 加载时兼容 `kanbanFile`，保存时仅输出 `todoFile`。
- Modify: `src/kanban-sync.ts` — 默认文件路径来源改为 Todo，默认模板改为 `待办/已完成` 两列，必要时增加命名兼容注释。
- Modify: `src/main.ts` — 启动时执行迁移探测/提示/删除旧文件、设置页文案改为 Todo。
- Modify: `src/modules/todo.ts` — 新建任务 fallback 列名从 `待做` 改为 `待办`。
- Modify: `src/view.ts` — 如有必要，把“待办事项”区块保持 Todo 术语并确认无 Kanban 文案泄漏。

## Task 1: Add failing tests for config compatibility and Todo defaults

**Files:**
- Create: `__tests__/todo-config-migration.test.ts`
- Modify: `src/types.ts`
- Modify: `src/config-sync.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_SETTINGS } from "../src/types";
import { mergeSettings } from "../src/config-sync";

test("DEFAULT_SETTINGS uses nexus/nexus-todo as the default todo path", () => {
  assert.equal(DEFAULT_SETTINGS.todoFile, "nexus/nexus-todo");
});

test("mergeSettings falls back to legacy kanbanFile when todoFile is absent", () => {
  const merged = mergeSettings(
    { kanbanFile: "nexus/legacy-kanban" } as any,
    {}
  );

  assert.equal(merged.todoFile, "nexus/legacy-kanban");
});

test("mergeSettings prefers todoFile over legacy kanbanFile", () => {
  const merged = mergeSettings(
    { todoFile: "nexus/new-todo", kanbanFile: "nexus/legacy-kanban" } as any,
    {}
  );

  assert.equal(merged.todoFile, "nexus/new-todo");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
cd /mnt/e/1/Juno/nexus-plugin && node --test __tests__/todo-config-migration.test.ts
```

Expected: FAIL because `todoFile` does not exist in `DEFAULT_SETTINGS` / merged settings yet.

- [ ] **Step 3: Add the new Todo config field and defaults**

Update `src/types.ts` so the settings shape includes `todoFile`, keeps `kanbanFile` as optional legacy input only, and defaults to the Todo path:

```ts
export interface NexusSettings {
  todoFile: string;
  kanbanFile?: string;
  bannerImage: string;
  bannerQuote: string;
  bannerPosition: { x: number; y: number };
  bannerHeight: number;
  bannerZoom: number;
  gridLayout: GridCell[];
  heatmapWeights: HeatmapWeights;
  readingStats: Record<string, ReadingStat>;
  readingSessions: Record<string, ReadingSession[]>;
  language: "en" | "zh";
  stylePreset: "aurora";
  quickLinks: QuickLink[];
  deepseekApiKey: string;
}

export const DEFAULT_SETTINGS: NexusSettings = {
  todoFile: "nexus/nexus-todo",
  kanbanFile: undefined,
  // ...existing fields unchanged
};
```

- [ ] **Step 4: Add compatibility merge logic**

Update `src/config-sync.ts` so it preserves backward compatibility while standardizing on `todoFile`:

```ts
export function mergeSettings(external: Partial<NexusSettings>, local: Partial<NexusSettings>): NexusSettings {
  const merged = { ...DEFAULT_SETTINGS };

  const apply = (source: Partial<NexusSettings>) => {
    for (const key of Object.keys(DEFAULT_SETTINGS) as Array<keyof NexusSettings>) {
      if (source[key] !== undefined) {
        (merged as any)[key] = source[key];
      }
    }

    const legacyKanban = (source as any).kanbanFile;
    if (merged.todoFile === DEFAULT_SETTINGS.todoFile && legacyKanban && !source.todoFile) {
      merged.todoFile = legacyKanban;
    }
  };

  apply(local);
  apply(external);

  if (local.heatmapWeights) {
    merged.heatmapWeights = { ...DEFAULT_SETTINGS.heatmapWeights, ...local.heatmapWeights };
  }
  if (external.heatmapWeights) {
    merged.heatmapWeights = { ...merged.heatmapWeights, ...external.heatmapWeights };
  }

  return merged;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run:
```bash
cd /mnt/e/1/Juno/nexus-plugin && node --test __tests__/todo-config-migration.test.ts
```

Expected: PASS with 3 passing tests.

- [ ] **Step 6: Commit**

```bash
git -C /mnt/e/1/Juno/nexus-plugin add __tests__/todo-config-migration.test.ts src/types.ts src/config-sync.ts && git -C /mnt/e/1/Juno/nexus-plugin commit -m "feat: add todo config compatibility"
```

## Task 2: Add failing tests for Todo file migration and column normalization

**Files:**
- Create: `__tests__/todo-file-migration.test.ts`
- Create: `src/todo-migration.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { normalizeToTodoColumns, resolveTodoMigrationAction } from "../src/todo-migration";

const oldData = {
  columns: [
    { name: "待做", color: "#f59e0b", cards: [{ id: "a", title: "A", type: "task", body: "", tags: [], dueDate: "", checked: false, createdAt: "2026-06-01", completedAt: "", tasks: [] }] },
    { name: "进行中", color: "#6366f1", cards: [{ id: "b", title: "B", type: "task", body: "", tags: [], dueDate: "", checked: false, createdAt: "2026-06-01", completedAt: "", tasks: [] }] },
    { name: "已完成", color: "#10b981", cards: [{ id: "c", title: "C", type: "task", body: "", tags: [], dueDate: "", checked: true, createdAt: "2026-06-01", completedAt: "2026-06-01", tasks: [] }] },
  ],
};

test("normalizeToTodoColumns collapses old columns into 待办 and 已完成", () => {
  const normalized = normalizeToTodoColumns(oldData as any);

  assert.deepEqual(normalized.columns.map((col) => col.name), ["待办", "已完成"]);
  assert.deepEqual(normalized.columns[0].cards.map((card) => card.id), ["a", "b"]);
  assert.deepEqual(normalized.columns[1].cards.map((card) => card.id), ["c"]);
});

test("resolveTodoMigrationAction requests migration when only legacy file exists", () => {
  assert.equal(
    resolveTodoMigrationAction({ legacyExists: true, todoExists: false }),
    "prompt-migrate-legacy"
  );
});

test("resolveTodoMigrationAction prefers new todo file when both files exist", () => {
  assert.equal(
    resolveTodoMigrationAction({ legacyExists: true, todoExists: true }),
    "prompt-delete-legacy"
  );
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
cd /mnt/e/1/Juno/nexus-plugin && node --test __tests__/todo-file-migration.test.ts
```

Expected: FAIL because `src/todo-migration.ts` does not exist yet.

- [ ] **Step 3: Write the minimal migration helper**

Create `src/todo-migration.ts`:

```ts
import type { KanbanData } from "./types";

export function normalizeToTodoColumns(data: KanbanData): KanbanData {
  const pending = [];
  const completed = [];

  for (const col of data.columns) {
    for (const card of col.cards) {
      if (card.checked) completed.push(card);
      else pending.push(card);
    }
  }

  return {
    columns: [
      { name: "待办", color: "#f59e0b", cards: pending },
      { name: "已完成", color: "#10b981", cards: completed },
    ],
  };
}

export function resolveTodoMigrationAction(args: {
  legacyExists: boolean;
  todoExists: boolean;
}): "none" | "prompt-migrate-legacy" | "prompt-delete-legacy" {
  if (args.legacyExists && args.todoExists) return "prompt-delete-legacy";
  if (args.legacyExists && !args.todoExists) return "prompt-migrate-legacy";
  return "none";
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
cd /mnt/e/1/Juno/nexus-plugin && node --test __tests__/todo-file-migration.test.ts
```

Expected: PASS with 3 passing tests.

- [ ] **Step 5: Commit**

```bash
git -C /mnt/e/1/Juno/nexus-plugin add __tests__/todo-file-migration.test.ts src/todo-migration.ts && git -C /mnt/e/1/Juno/nexus-plugin commit -m "feat: add todo migration helpers"
```

## Task 3: Switch sync defaults and Todo UI fallbacks to Todo naming

**Files:**
- Modify: `src/kanban-sync.ts`
- Modify: `src/modules/todo.ts`
- Test: `__tests__/todo-config-migration.test.ts`

- [ ] **Step 1: Add a failing assertion for the default template**

Append to `__tests__/todo-config-migration.test.ts`:

```ts
test("default todo template uses 待办 and 已完成 only", async () => {
  const { KanbanSync } = await import("../src/kanban-sync");
  const sync = Object.create(KanbanSync.prototype) as any;
  const content = sync.getDefaultContent();

  assert.match(content, /## 待办/);
  assert.match(content, /## 已完成/);
  assert.doesNotMatch(content, /## 进行中/);
});
```

- [ ] **Step 2: Run the targeted test and verify it fails**

Run:
```bash
cd /mnt/e/1/Juno/nexus-plugin && node --test __tests__/todo-config-migration.test.ts
```

Expected: FAIL because the default template still contains `待做` and `进行中`, and `getDefaultContent()` may still not be exposed for test access.

- [ ] **Step 3: Make the sync/template changes**

Update `src/kanban-sync.ts`:

```ts
private async findOrCreateFile() {
  const path = this.settings.todoFile.trim();
  const filePath = path.endsWith(".md") ? path : `${path}.md`;
  let file = this.app.vault.getFileByPath(filePath);
  if (!file) {
    const content = this.getDefaultContent();
    file = await this.app.vault.create(filePath, content);
  }
  this.file = file;
}

getDefaultContent(): string {
  return `---
columns:
  - name: 待办
    color: "#f59e0b"
  - name: 已完成
    color: "#10b981"
---

## 待办

### 欢迎使用 Nexus
type: task
date: ${new Date().toISOString().slice(0, 10)}

- [ ] 试试添加一个待办
- [ ] 勾选任务看看自动完成
- [ ] 第二天打开时观察已完成清理

## 已完成
`;
}
```

Update `src/modules/todo.ts` fallback target:

```ts
await sync.addCard(data.columns[0]?.name || "待办", newCard);
```

- [ ] **Step 4: Run the targeted test and verify it passes**

Run:
```bash
cd /mnt/e/1/Juno/nexus-plugin && node --test __tests__/todo-config-migration.test.ts
```

Expected: PASS, including the new template assertion.

- [ ] **Step 5: Commit**

```bash
git -C /mnt/e/1/Juno/nexus-plugin add src/kanban-sync.ts src/modules/todo.ts __tests__/todo-config-migration.test.ts && git -C /mnt/e/1/Juno/nexus-plugin commit -m "feat: switch todo defaults to two-column template"
```

## Task 4: Implement startup migration detection and file operations

**Files:**
- Modify: `src/main.ts`
- Modify: `src/config-sync.ts`
- Modify: `src/kanban-sync.ts`
- Modify: `src/types.ts`
- Create: `src/todo-migration.ts`

- [ ] **Step 1: Add a failing integration-like test for migration decisions**

Extend `__tests__/todo-file-migration.test.ts` with:

```ts
test("resolveTodoMigrationAction returns none when only todo file exists", () => {
  assert.equal(
    resolveTodoMigrationAction({ legacyExists: false, todoExists: true }),
    "none"
  );
});
```

- [ ] **Step 2: Run the test to verify current coverage is complete before wiring main.ts**

Run:
```bash
cd /mnt/e/1/Juno/nexus-plugin && node --test __tests__/todo-file-migration.test.ts
```

Expected: PASS. This confirms the pure migration decision helper is stable before it gets wired into Obsidian APIs.

- [ ] **Step 3: Add concrete migration helpers for path resolution and confirmed operations**

Expand `src/todo-migration.ts` with:

```ts
export function withMdExtension(path: string): string {
  return path.endsWith(".md") ? path : `${path}.md`;
}

export function getLegacyTodoPath(settings: { kanbanFile?: string }): string {
  return withMdExtension(settings.kanbanFile?.trim() || "nexus/nexus-kanban");
}

export function getCurrentTodoPath(settings: { todoFile: string }): string {
  return withMdExtension(settings.todoFile.trim());
}
```

- [ ] **Step 4: Implement startup migration flow in `src/main.ts`**

Add a new startup method after `loadSettings()` and before scheduling cleanup:

```ts
private async reconcileTodoFiles() {
  const legacyPath = getLegacyTodoPath(this.settings);
  const todoPath = getCurrentTodoPath(this.settings);
  const legacyExists = await this.app.vault.adapter.exists(legacyPath);
  const todoExists = await this.app.vault.adapter.exists(todoPath);
  const action = resolveTodoMigrationAction({ legacyExists, todoExists });

  if (action === "none") return;

  if (action === "prompt-migrate-legacy") {
    new Notice("检测到旧版待办文件，请在下一步确认迁移到 nexus-todo.md");
    const legacySync = new KanbanSync(this.app, { ...this.settings, todoFile: legacyPath } as NexusSettings);
    await legacySync.init();
    const data = legacySync.getData();
    legacySync.destroy();
    if (!data) return;

    const normalized = normalizeToTodoColumns(data);
    const todoSync = new KanbanSync(this.app, this.settings);
    await todoSync.init();
    (todoSync as any).data = normalized;
    await (todoSync as any).writeToDisk();
    todoSync.destroy();
    return;
  }

  if (action === "prompt-delete-legacy") {
    new Notice("检测到旧版 kanban 文件。将继续使用 todo 文件；确认后可删除旧文件。");
  }
}
```

Then call it from `onload()`:

```ts
await this.loadSettings();
await this.reconcileTodoFiles();
await this.backfillActivityFromVault();
this.scheduleDailyCleanup();
```

Note: when implementing for real, prefer extracting a public `replaceDataAndPersist()` method on `KanbanSync` instead of assigning to private fields via casts.

- [ ] **Step 5: Replace the temporary cast-based write with a real sync API**

Add to `src/kanban-sync.ts`:

```ts
async replaceDataAndPersist(data: KanbanData) {
  this.data = data;
  await this.writeToDisk();
}
```

Then update `main.ts` to use:

```ts
const todoSync = new KanbanSync(this.app, this.settings);
await todoSync.init();
await todoSync.replaceDataAndPersist(normalized);
todoSync.destroy();
```

- [ ] **Step 6: Run the migration tests again**

Run:
```bash
cd /mnt/e/1/Juno/nexus-plugin && node --test __tests__/todo-file-migration.test.ts __tests__/todo-config-migration.test.ts
```

Expected: PASS. No regression in pure migration helpers or defaults.

- [ ] **Step 7: Commit**

```bash
git -C /mnt/e/1/Juno/nexus-plugin add src/main.ts src/kanban-sync.ts src/todo-migration.ts src/config-sync.ts src/types.ts __tests__/todo-file-migration.test.ts __tests__/todo-config-migration.test.ts && git -C /mnt/e/1/Juno/nexus-plugin commit -m "feat: add todo file migration flow"
```

## Task 5: Rename user-facing settings and ensure saves write only Todo paths

**Files:**
- Modify: `src/main.ts`
- Modify: `src/config-sync.ts`
- Test: `__tests__/todo-config-migration.test.ts`

- [ ] **Step 1: Add a failing assertion for the save shape**

Append to `__tests__/todo-config-migration.test.ts`:

```ts
test("saved settings should standardize on todoFile", () => {
  const serialized = JSON.stringify({ ...DEFAULT_SETTINGS, todoFile: "nexus/custom-todo" });
  assert.match(serialized, /"todoFile":"nexus\/custom-todo"/);
  assert.doesNotMatch(serialized, /"kanbanFile":/);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
cd /mnt/e/1/Juno/nexus-plugin && node --test __tests__/todo-config-migration.test.ts
```

Expected: FAIL because the current settings object still includes legacy save shape.

- [ ] **Step 3: Save only the normalized Todo settings shape**

Update `src/config-sync.ts`:

```ts
export async function saveExternalConfig(app: App, settings: NexusSettings): Promise<void> {
  try {
    const dirExists = await app.vault.adapter.exists("nexus");
    if (!dirExists) {
      await app.vault.createFolder("nexus");
    }

    const { kanbanFile, ...persisted } = settings as NexusSettings & { kanbanFile?: string };
    await app.vault.adapter.write(CONFIG_PATH, JSON.stringify(persisted, null, 2));
  } catch (e) {
    console.error("Failed to save external config:", e);
  }
}
```

Update the settings UI in `src/main.ts`:

```ts
new Setting(containerEl)
  .setName("待办文件")
  .setDesc("待办数据文件路径（不含 .md 扩展名）")
  .addText((text) =>
    text
      .setPlaceholder("nexus-todo")
      .setValue(this.plugin.settings.todoFile)
      .onChange(async (value) => {
        this.plugin.settings.todoFile = value || "nexus/nexus-todo";
        await this.plugin.saveSettings();
      })
  );
```

- [ ] **Step 4: Run the test to verify it passes**

Run:
```bash
cd /mnt/e/1/Juno/nexus-plugin && node --test __tests__/todo-config-migration.test.ts
```

Expected: PASS, including the save-shape assertion.

- [ ] **Step 5: Commit**

```bash
git -C /mnt/e/1/Juno/nexus-plugin add src/main.ts src/config-sync.ts __tests__/todo-config-migration.test.ts && git -C /mnt/e/1/Juno/nexus-plugin commit -m "feat: rename settings UI to todo"
```

## Task 6: Manually verify file safety and task behavior end-to-end

**Files:**
- Modify: none
- Verify: `src/main.ts`, `src/kanban-sync.ts`, `src/modules/todo.ts`, `src/todo-migration.ts`

- [ ] **Step 1: Prepare an old-style file**

Create or reuse a vault file with this content:

```md
---
columns:
  - name: 待做
    color: "#f59e0b"
  - name: 进行中
    color: "#6366f1"
  - name: 已完成
    color: "#10b981"
---

## 待做

### 旧任务 A
type: task
date: 2026-06-01

- [ ] 保持未完成

## 进行中

### 旧任务 B
type: task
date: 2026-06-01

- [ ] 也应迁移到待办

## 已完成

### 旧任务 C
type: task
date: 2026-06-01
completed: 2026-06-01

- [x] 应迁移到已完成
```

- [ ] **Step 2: Launch the plugin and confirm migration behavior**

Manual check:
- 若只有旧文件：应看到迁移提示。
- 迁移后应生成 `nexus-todo.md`。
- 新文件中只应有 `待办` 与 `已完成` 两列。

- [ ] **Step 3: Verify data safety when both files exist**

Manual check:
- 同时放置旧 `nexus-kanban.md` 与新 `nexus-todo.md`。
- 插件应保留 `nexus-todo.md`。
- 只有确认后才删除旧文件。
- 若删除失败，应继续使用新文件并提示旧文件未清理完成。

- [ ] **Step 4: Verify runtime Todo behavior**

Manual check:
- 在 Todo UI 中添加任务，应进入 `待办`。
- 勾选任务，应移动到 `已完成`。
- 取消勾选，应回到 `待办`。
- 第二天重开或跨日运行后，前一天的已完成项应被清理。

- [ ] **Step 5: Record verification results in the commit message body or PR description**

Use notes like:

```text
Verified:
- legacy kanban file migrates to nexus-todo.md
- 待做/进行中 merge into 待办
- completed items stay in 已完成
- todo file wins when both files exist
- old file deletion is gated by confirmation
```

- [ ] **Step 6: Final commit**

```bash
git -C /mnt/e/1/Juno/nexus-plugin add src/main.ts src/config-sync.ts src/kanban-sync.ts src/modules/todo.ts src/todo-migration.ts src/types.ts __tests__/todo-config-migration.test.ts __tests__/todo-file-migration.test.ts && git -C /mnt/e/1/Juno/nexus-plugin commit -m "feat: migrate nexus data model from kanban to todo"
```

## Self-review

- Spec coverage: covered default file rename, `todoFile` compatibility, two-column normalization, startup migration detection, conflict handling, settings UI rename, preservation of task behavior, and verification steps.
- Placeholder scan: no `TODO`/`TBD` placeholders remain; each task contains concrete file paths, code, commands, and expected outcomes.
- Type consistency: all tasks use `todoFile`, `normalizeToTodoColumns`, `resolveTodoMigrationAction`, and `replaceDataAndPersist` consistently.
