/**
 * Kanban markdown 解析器测试
 *
 * 运行方式：`npm run build` 后在 Obsidian 中打开 Nexus 插件验证，
 * 或使用 node 直接运行解析逻辑的独立副本。
 *
 * 以下测试用例可在实际 Obsidian 环境中逐一验证。
 */

// ===== 测试用例 =====

/** TC1: 基础往返——解析后序列化再解析应该是幂等的 */
export const TC1_BASIC_ROUNDTRIP = `
测试内容：一段基础看板 Markdown 经 parse → serialize → parse 后数据不变。
验证方式：
  1. 在 Nexus 看板中创建以下结构：
     - 列「待做」中有卡片「任务A」(type:task, date:2025-01-01)
     - 列「进行中」中有卡片「项目B」(type:project, tags:important,urgent)
  2. 关闭后重新打开 Nexus，确认卡片都在且内容不变
  3. 编辑 nexus-kanban.md 确认格式无漂移
`;

/** TC2: body 中的 ### 不会被误解析为新卡片 */
export const TC2_BODY_HAS_H3 = `
测试内容：卡片正文包含 "### 这是正文中的标题" 不会变成新卡片。
验证方式：
  1. 在 nexus-kanban.md 中手动添加以下内容到一张卡片 body 中：

     ### 测试卡片
     type: note
     date: 2025-06-01

     正文第一行
     ### 这是正文中的小标题（不应被解析为新卡片）
     正文第二行

  2. 在 Nexus 中打开看板，确认「测试卡片」只有一张
  3. 确认 body 中包含 "### 这是正文中的小标题"

  修复前：body 中的 ### 会触发新卡片解析，导致「测试卡片」被截断
  修复后：正文中的 ### 被保留为 body 内容
`;

/** TC3: 配置保存后刷新不丢失 */
export const TC3_CONFIG_PERSIST = `
测试内容：修改 Banner 设置后关闭重开 Nexus，设置保持。
验证方式：
  1. 打开 Nexus，点击 Banner 的齿轮图标
  2. 调整高度、缩放、水平和垂直位置
  3. 点击「保存设置」
  4. 关闭 Obsidian 标签页或重启 Obsidian
  5. 重新打开 Nexus，确认 Banner 设置保持

  修复前：Banner 设置写入 data.json，但 loadSettings 优先读 nexus/config.json
  修复后：Banner 设置统一走 plugin.saveSettings → nexus/config.json
`;

/** TC4: epub 快速双击不串页 */
export const TC4_EPUB_NO_RACE = `
测试内容：快速连续打开两本不同的 epub，每个标签页显示正确的书。
验证方式：
  1. 在 vault 中放入至少两本 .epub 文件
  2. 在 Nexus 书架中快速点击第一本，紧接着点第二本
  3. 确认两个标签页分别显示不同的书

  修复前：第二本书的 _pendingFile 覆盖第一本，导致两个标签页显示同一本书
  修复后：每本书通过 setViewState state 传递路径，互不干扰
`;

/** TC5: 热力图显示笔记创建数据 */
export const TC5_HEATMAP_NOTE_CREATE = `
测试内容：新建的 .md 文件在热力图上显示为 noteCreate 贡献。
验证方式：
  1. 在 vault 中新建一个 .md 文件
  2. 打开 Nexus，查看热力图当天的格子
  3. hover 查看贡献明细

  修复前：backfillActivityFromVault 只回填 noteEdit
  修复后：同时回填 noteEdit（基于 mtime）和 noteCreate（基于 ctime）
`;
