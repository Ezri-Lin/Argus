# M3 · MVP 技术边界（第一版）

> 搭出来 → 挂上 → 停手。验证"挂一面墙能不能让我停止焦虑地刷"。

## 北极星（动手前先读一遍）

**是什么**：一面挂在显示器上的"电影海报墙"——debt-free ambient 面板，瞥一眼就够。

**不是什么**：RSS reader、情报全景站、量化工具、冲 star 的开源产品。

**四条北极星**：
1. **好看（静态构图）** — 第一优先级。靠构图/配色/字体/留白，不靠动效。
2. **debt-free** — 不显示未读计数；不堆积库存；过期消失。
3. **AI 只做减法** — AI 的 KPI 是"帮我少看了多少"，是删除键不是高亮笔。
4. **挂着看，不强制用** — 价值被动交付。瞥一眼零成本。

**成功的定义**：两周后从"焦虑地刷"变成"路过瞥一眼就走"；半年后还挂着、还没弃。

**唯一的纪律**：搭出 v1 → 挂上 → 停手。别让"无限自定义/调布局"变成新的折腾瘾。

## 范围：只留验证所必需的

| v1 留 | 砍掉（等过关再加） |
|---|---|
| treemap 状态盘（格子 = 我在乎的那几个源） | 全成员 / 全领域铺开 |
| 2–3 个小面板，盯真在乎的博主/源 | PRO 模型 + 交叉验证 |
| AI 单模型做减法（keep/drop + 一句话摘要） | 趋势 drawer + 市值时序 |
| 零未读 feed（只显近 N 天 / 高分，过期消失） | 模型注册表 UI + settings 页 |
| 拖拽布局（够搭出墙即可） | health 红框（v1 只留 last-updated + 失败变灰） |
| 静态渲染 + 30–60min 低频刷新 | 双语 label / 复杂 aliases / 公网暴露 / 无限自定义 |

## 数据模型（3 张表）

```sql
PRAGMA journal_mode = WAL;

CREATE TABLE sources (
  id     INTEGER PRIMARY KEY,
  name   TEXT NOT NULL,
  type   TEXT NOT NULL,          -- rss | twitter | site
  url    TEXT NOT NULL,
  weight REAL NOT NULL DEFAULT 1.0
);

CREATE TABLE events (
  id          INTEGER PRIMARY KEY,
  fingerprint TEXT NOT NULL UNIQUE,
  source_id   INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  url         TEXT,
  published   TEXT,
  importance  REAL,
  sentiment   REAL,
  summary     TEXT,
  first_seen  TEXT NOT NULL
);
CREATE INDEX idx_events_source ON events(source_id);

CREATE TABLE dashboard (
  id         TEXT PRIMARY KEY DEFAULT 'default',
  doc        TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

DB 文件：`argus/data/argus.db`（WAL）。`.gitignore` 掉 `data/*.db*` 和 `.env`。

## 技术选型（static-first）

- **后端**：FastAPI + 内置 `sqlite3`。Pipeline 内嵌 APScheduler，每 30–60min 自动跑。base 模型走 `.env`（一个 OpenAI 兼容端点，**必须支持联网**）。Tavily 先关。
- **前端**：Vite + React + react-grid-layout（拖拽）+ D3 v7 squarified treemap（SVG，一次性渲染，数据变才重画）。**全局关闭常驻动画。**
- **刷新**：前端 30–60min `poll GET /data`；`document.hidden` 时暂停。接近 0 CPU。
- **部署**：`docker compose up -d` 一条命令。数据持久化在 Docker volume。

## 静态技术铁律

- **空闲零 CPU**：无前端高频轮询、无常驻动画循环；data-driven render。
- **低频刷新**：30–60min poll；后台 tab 暂停拉取。
- **前端不囤数据**：只持当前快照，历史留 SQLite 按需拉。
- **动画取舍**：常驻循环动画（呼吸 glow / 粒子 / shimmer）→ 砍，或仅 hover 触发；数据更新时的一次性过渡 → 可留。
- **省损耗**：深色主题、刷新后进入静止态。

## 数据流

```
cron → pipeline.py：
  拉 sources 原始条目
  → base 模型减法(keep/drop + summary + importance + sentiment)
  → keep 的 upsert 进 events
  → 按 source 聚合算 treemap snapshot → 写库

前端 poll GET /data：
  treemap（格子=source，大小=近期活跃度，色=sentiment）
  + feed（events 取 top N，零未读，过期消失）
  + 拖拽布局存 dashboard
```

## Base 模型提示词（MVP 版）

```
你是 Argus 情报面板的内容过滤器。每次处理一个来源的原始条目列表，做减法。

【输入】
- 来源：{source_name}（{source_type}）
- 原始条目列表：[{title, url, published, snippet}, ...]

【任务】
对每条判断 keep / drop：
- keep：有实质信息、与我关注的领域相关、不是重复/水文/广告
- drop：重复、水文、广告、旧闻、无实质信息

对每条 keep 的输出：
- importance：0~1（决定进不进墙 + 排序）
- sentiment：-1~1（仅用于配色）
- summary：一句话中文摘要（给人看的）

【规则】
- AI 的 KPI 是"帮我少看了多少"——宁可多 drop，不要多 keep。
- 只保留值得瞥一眼的信息。
- 严格只输出 JSON，无额外文字。

【输出】
{"kept": [{"title":"", "url":"", "published":"", "importance":0.0, "sentiment":0.0, "summary":""}], "dropped_count": 0}
```

## API 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/data` | treemap + feed 数据（聚合 sources + events） |
| GET | `/layout` | 仪表盘布局 |
| PUT | `/layout` | 保存布局 |

## 视觉方向

- 暗色主题 + 液态玻璃 + Iris 紫点缀（`#7c83e8`）
- treemap 格子：大小=活跃度，颜色=sentiment（红/灰/绿），内部=来源名 + 一句话摘要
- feed：简洁列表，只显近 N 天/高分，过期消失
- hover：轻量浮卡（最近条目）。click：暂不实现 drawer，直接跳链接

## 验证关卡（两周自用）

- **唯一指标**：有没有从「焦虑地刷」变成「路过瞥一眼就走」。
- **过** → v2：全成员/趋势/PRO 休眠/health 红框/双语/模型注册表/公网（蓝图见 `M3-backend-v2.md`）。
- **不过** → 停在玩具阶段，只亏两个周末。

## 文件清单

```
pipeline/
  pipeline.py    # 单文件：拉源 → base 模型减法 → 写 events → 写 snapshot
  sources.json   # 种子：我关注的 2-3 个源
  requirements.txt
api/
  api.py         # FastAPI：/data, /layout
web/
  src/           # Vite + React + D3 treemap
data/
  argus.db       # SQLite WAL
```

---
*Created: 2026-06-02*
