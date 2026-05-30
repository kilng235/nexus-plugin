import { NexusSettings, GridCell } from "./types";

interface GridOptions {
  container: HTMLElement;
  cells: GridCell[];
  renderCell: (cell: GridCell, el: HTMLElement) => void;
}

export function createGrid(options: GridOptions) {
  const { container, cells, renderCell } = options;
  container.empty();
  container.addClass("nexus-grid");

  // Calculate grid dimensions
  const maxX = Math.max(...cells.map(c => c.x + c.w));
  const maxY = Math.max(...cells.map(c => c.y + c.h));

  container.style.display = "grid";
  container.style.gridTemplateColumns = `repeat(${maxX}, 1fr)`;
  container.style.gridTemplateRows = `repeat(${maxY}, 1fr)`;
  container.style.gap = "12px";

  for (const cell of cells) {
    const el = container.createDiv({ cls: `nexus-cell nexus-cell-${cell.id}` });
    el.style.gridColumn = `${cell.x + 1} / span ${cell.w}`;
    el.style.gridRow = `${cell.y + 1} / span ${cell.h}`;
    renderCell(cell, el);
  }
}
