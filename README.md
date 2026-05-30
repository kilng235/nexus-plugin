# Nexus

Obsidian 首页仪表盘插件 — 看板 + 待办 + 热力图 + 书架

## 功能

- **看板**：拖拽排序、复选框自动移动、多列管理
- **待办**：从看板卡片中提取任务，勾选自动完成
- **热力图**：GitHub 风格活动日历，支持自定义权重
- **书架**：epub 扫描与封面展示
- **Banner**：可自定义背景图和每日格言

## 安装

1. 下载 `main.js`、`styles.css`、`manifest.json`
2. 放入 `.obsidian/plugins/nexus/`
3. 在 Obsidian 设置中启用插件

## 开发

```bash
npm install
npm run dev    # 开发模式
npm run build  # 生产构建
```

## 架构

- 数据存储：看板存 `.md`，配置存 `data.json`
- UI 框架：原生 DOM + CSS Grid
- 构建：esbuild + TypeScript

## 文件结构

```
src/
├── main.ts              # 插件入口
├── view.ts              # 主视图
├── grid.ts              # 网格布局
├── types.ts             # 类型定义
├── kanban-sync.ts       # 看板数据同步
└── modules/
    ├── banner.ts        # Banner 模块
    ├── kanban.ts        # 看板模块
    ├── todo.ts          # 待办模块
    ├── heatmap.ts       # 热力图模块
    ├── bookshelf.ts     # 书架模块
    ├── epub-reader.ts   # epub 阅读器
    ├── input-modal.ts   # 输入弹窗
    └── file-picker-modal.ts  # 文件选择器
```

## License

MIT
