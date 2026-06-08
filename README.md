# Hubstack

Hubstack is an Obsidian homepage dashboard plugin that brings together a sidebar, tasks, activity heatmap, bookshelf, EPUB reader, banner, and countdowns in one personal command center.

## Features

- Sidebar with quick links, recently edited notes, DeepSeek balance, and countdown cards.
- Todo panel powered by markdown kanban cards.
- Activity heatmap based on task completion, note activity, and reading sessions.
- Bookshelf that scans `.epub` files in the vault and caches covers.
- Built-in EPUB reader with reading time tracking and position restore.
- Custom banner image, quote, position, zoom, and height controls.

## Install

1. Download `main.js`, `styles.css`, and `manifest.json`.
2. Put them in `.obsidian/plugins/hubstack/`.
3. Enable `Hubstack` in Obsidian settings.

## Development

```bash
npm install
npm run dev
npm run build
```

## Project Structure

```text
src/
|-- main.ts
|-- view.ts
|-- types.ts
|-- kanban-sync.ts
|-- kanban-parser.ts
|-- kanban-archive.ts
`-- modules/
    |-- sidebar.ts
    |-- banner.ts
    |-- todo.ts
    |-- heatmap.ts
    |-- bookshelf.ts
    |-- epub-reader.ts
    |-- balance.ts
    |-- kanban.ts
    |-- input-modal.ts
    `-- file-picker-modal.ts
```

## Data

- Plugin settings are stored in `hubstack/config.json`.
- Activity logs are stored in `hubstack/activity-log.json`.
- Archived completed cards are stored in `hubstack/archive/`.
- EPUB cover cache is stored in `hubstack/covers/`.
- Legacy `nexus/` data paths are still read for compatibility.

## License

MIT
