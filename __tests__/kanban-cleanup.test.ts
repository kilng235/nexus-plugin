import test from "node:test";
import assert from "node:assert/strict";
import { pruneCompletedCardsData } from "../src/kanban-cleanup.ts";

test("pruneCompletedCardsData removes completed cards from prior days and keeps today's completions", () => {
  const data = {
    columns: [
      {
        name: "待做",
        color: "#f59e0b",
        cards: [
          {
            id: "done-yesterday",
            title: "昨日完成",
            type: "task" as const,
            body: "",
            tags: [],
            dueDate: "",
            checked: true,
            createdAt: "2026-06-01",
            completedAt: "2026-06-01",
            tasks: [],
          },
          {
            id: "done-today",
            title: "今日完成",
            type: "task" as const,
            body: "",
            tags: [],
            dueDate: "",
            checked: true,
            createdAt: "2026-06-02",
            completedAt: "2026-06-02",
            tasks: [],
          },
          {
            id: "pending",
            title: "未完成",
            type: "task" as const,
            body: "",
            tags: [],
            dueDate: "",
            checked: false,
            createdAt: "2026-06-02",
            completedAt: "",
            tasks: [],
          },
        ],
      },
    ],
  };

  const changed = pruneCompletedCardsData(data, "2026-06-02");

  assert.equal(changed, true);
  assert.deepEqual(
    data.columns[0].cards.map((card) => card.id),
    ["done-today", "pending"]
  );
});

test("pruneCompletedCardsData reports false when nothing is removed", () => {
  const data = {
    columns: [
      {
        name: "已完成",
        color: "#10b981",
        cards: [
          {
            id: "done-today",
            title: "今日完成",
            type: "task" as const,
            body: "",
            tags: [],
            dueDate: "",
            checked: true,
            createdAt: "2026-06-02",
            completedAt: "2026-06-02",
            tasks: [],
          },
        ],
      },
    ],
  };

  const changed = pruneCompletedCardsData(data, "2026-06-02");

  assert.equal(changed, false);
  assert.equal(data.columns[0].cards.length, 1);
});
