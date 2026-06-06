# Argus Constitution — 顶层协议

本文档是 Argus 项目的最高优先级工程协议。所有 Agent 指令、代码变更、文档更新不得违反本文件中的核心约束。

## 北极星

**是什么**：一面挂在显示器上的"电影海报墙"——debt-free ambient 面板，瞥一眼就够。

**不是什么**：RSS reader、情报全景站、量化工具、冲 star 的开源产品。

**唯一用户**：我（n=1）。

### 四条北极星

1. **好看（静态构图）** — 第一优先级。好看靠构图/配色/字体/留白，**不靠动效**。海报不动也好看。
2. **debt-free** — 永不显示未读计数；不堆积库存；过期消失。扫一眼此刻状态，不清算欠债。
3. **AI 只做减法** — AI 的 KPI 是"帮我**少看**了多少"，是删除键不是高亮笔。把洪流压成几条要紧的。
4. **挂着看，不强制用** — 价值被动交付。不要求"用"，只要求"挂着"，瞥一眼零成本。

### 成功的定义

两周后从"焦虑地刷"变成"路过瞥一眼就走"；半年后还挂着、还没弃。

### 唯一的纪律

搭出 v1 → 挂上 → 停手。别让"无限自定义/调布局"变成新的折腾瘾。

> 自检：我现在是在**用**它，还是在**折腾**它？

## 静态技术铁律

- **空闲零 CPU**：无前端高频轮询、无常驻动画循环；data-driven render（数据变了才重绘）。
- **低频刷新**：30–60min poll；后台 tab 暂停拉取。
- **前端不囤数据**：只持当前快照，历史留 SQLite 按需拉。
- **动画取舍**：常驻循环动画（呼吸 glow / 粒子 / shimmer）→ 砍，或仅 hover 触发；数据更新时的一次性过渡 → 可留。
- **省损耗**：深色主题、刷新后进入静止态。外表几乎不变，数据悄悄换。

## 核心原则

### 1. 好看 > 功能多
- 构图/配色/字体/留白是第一优先级。
- 不靠动效、不靠复杂交互。静态就好看。

### 2. AI 只做减法
- AI 的输出是"keep/drop + 一句话摘要"，不是全量分析。
- 宁可多 drop，不要多 keep。把洪流压成几条要紧的。
- v1 不需要 PRO 模型、不需要交叉验证、不需要佐证契约。

### 3. SQLite 是唯一主存
- 所有业务数据进 SQLite（`data/argus.db`），JSON 只用于 API 响应体。
- Schema 变更 = 接口变更，必须同步更新所有生产者和消费者。

### 4. debt-free
- 不显示未读计数。过期消失。
- 前端只取近 N 天 / 高分条目，老数据不堆积。

### 5. 部署独立性
- `docker compose up -d` 一条命令部署，不依赖外部平台。
- Pipeline 内嵌 APScheduler，不依赖 GitHub Actions / cron。
- 数据持久化在 Docker volume，SQLite 是唯一主存。

## 模块边界（MVP）

| 模块 | 职责 | 不可做 |
|---|---|---|
| pipeline/ | 拉源 → AI 减法 → 写 events | 不可直接调用前端代码 |
| api/ | FastAPI，读 DB | 不可写 events（单写者原则） |
| web/ | 仪表盘展示、拖拽布局 | 不可直接调用管线或修改 DB |
| data/ | SQLite DB 文件 | 不可存放非 DB 文件 |

## 技术栈约束（MVP）

- **Pipeline**: Python 3.11+, openai SDK, sqlite3 (内置)
- **API**: FastAPI, uvicorn, python-dotenv
- **Frontend**: React 18, Vite, TypeScript, react-grid-layout, D3 v7
- **部署**: Docker Compose（单容器多阶段构建）

## 版本约定

- **MVP（v1）**：3 张表起步、Base 做批量召回/初筛、Pro 仅可选用于低频关键 judgement、静态渲染。详见 `Docs/Specs/M3-mvp.md`。
- **v2 蓝图**：完整 schema（11 张表）、双模型 + Tavily、趋势 drawer、面板自检。详见 `Docs/Specs/M3-backend-v2.md`。v1 验证通过后才做。

---
*Created: 2026-06-02 · Updated: 2026-06-07*
