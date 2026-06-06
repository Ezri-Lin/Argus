# Data Contract Invariants

> 数据存储与契约规则。修改数据格式或存储逻辑前必读。

## MVP 范围说明

**MVP（v1）只用 3 张表**：`sources` / `events` / `dashboard`。详见 `Docs/Specs/M3-mvp.md`。

本文件中的完整 schema（11 张表：domains/members/memberships/events/models/model_roles/prices/dashboard/settings/snapshot/health）是 **v2 蓝图**，v1 验证通过后才做。详见 `Docs/Specs/M3-backend-v2.md`。

MVP 的 `events` 表结构与 v2 不同（更简单：source_id 而非 member_id，无 kind/status/rumor/sources/need_pro/route_reason）。

## INV-DC1: SQLite 是唯一主存

**storage 全进 SQLite；JSON 只剩三处：**
1. API 出口序列化（`/data` 等响应体）
2. SQLite 内的灵活列（`aliases` / `sources` / `dashboard.doc` / `models.extra`）
3. `watchlist.json` 种子文件 + `web/public/mock/*.json` 前端 mock

其余一律不准用 JSON 文件当主存。

- **DB 路径**：`data/argus.db`（WAL 模式附带 `argus.db-wal`、`argus.db-shm`）
- **PRAGMA**：`journal_mode = WAL`，`foreign_keys = ON`
- **权限**：`chmod 600 data/argus.db`
- **建表入口**：只在 `db.py` 里建表 + 设 PRAGMA；其他模块只 import 连接

## INV-DC2: 核心表结构

### domains — 领域

```sql
CREATE TABLE domains (
  key       TEXT PRIMARY KEY,           -- slug，如 "llm"
  label_zh  TEXT NOT NULL,              -- "AI 大模型"
  label_en  TEXT,
  weight    REAL NOT NULL DEFAULT 1.0,
  aliases   TEXT NOT NULL DEFAULT '[]'  -- JSON
);
```

### members — 成员

```sql
CREATE TABLE members (
  id        INTEGER PRIMARY KEY,
  name      TEXT NOT NULL UNIQUE,       -- 规范名 "OpenAI"
  label_zh  TEXT,
  label_en  TEXT,
  aliases   TEXT NOT NULL DEFAULT '[]', -- JSON
  symbol    TEXT,                        -- ticker，如 "NVDA"，非上市留空
  baseline_influence REAL NOT NULL DEFAULT 20.0,
  baseline_confidence REAL NOT NULL DEFAULT 0.0,
  baseline_rationale TEXT
);
```

### memberships — 成员 ↔ 领域（多对多带权重）

```sql
CREATE TABLE memberships (
  member_id   INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  domain      TEXT    NOT NULL REFERENCES domains(key) ON DELETE CASCADE,
  role        TEXT    NOT NULL DEFAULT 'Primary',
  role_weight REAL    NOT NULL DEFAULT 1.0,
  PRIMARY KEY (member_id, domain)
);
```

### events — 事件（替代 seen.json + 分析结果 + 历史）

```sql
CREATE TABLE events (
  id           INTEGER PRIMARY KEY,
  fingerprint  TEXT NOT NULL UNIQUE,         -- 去重靠它
  member_id    INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  url          TEXT,
  outlet       TEXT,
  published    TEXT,                          -- ISO date
  sentiment    REAL,                          -- -1..1
  importance   REAL,                          -- 0..1
  impact_weight REAL,                         -- 0..100，持续影响力
  impact_persistence_days REAL,                -- 单事件影响半衰期
  impact_confidence REAL,                      -- 0..1
  impact_rationale TEXT,
  kind         TEXT,                           -- 转载 | 官方一手 | 预告吹水
  status       TEXT,                           -- confirmed | watch | refuted
  note         TEXT,
  rumor        REAL NOT NULL DEFAULT 1.0,
  sources      TEXT NOT NULL DEFAULT '[]',     -- JSON
  need_pro     INTEGER NOT NULL DEFAULT 0,     -- 是否曾升级 PRO
  route_reason TEXT,                            -- BASE 给的路由理由
  first_seen   TEXT NOT NULL,
  last_seen    TEXT NOT NULL
);
```

### models — 模型注册表

```sql
CREATE TABLE models (
  id         INTEGER PRIMARY KEY,
  label      TEXT NOT NULL,             -- UI 显示名
  base_url   TEXT,                      -- OpenAI 兼容端点
  api_key    TEXT,
  model      TEXT NOT NULL,             -- "deepseek-chat"
  web_search INTEGER NOT NULL DEFAULT 0,
  extra      TEXT NOT NULL DEFAULT '{}' -- JSON
);
```

### model_roles — 角色指派（只剩 base / pro）

```sql
CREATE TABLE model_roles (
  role     TEXT PRIMARY KEY CHECK (role IN ('base','pro')),
  model_id INTEGER NOT NULL REFERENCES models(id)
);
```

### prices — 时序价格（M4 后期）

```sql
CREATE TABLE prices (
  symbol TEXT NOT NULL,
  ts     TEXT NOT NULL,
  open REAL, high REAL, low REAL, close REAL, volume REAL,
  market_cap REAL,                       -- 可空
  PRIMARY KEY (symbol, ts)
);
```

### dashboard — 仪表盘布局

```sql
CREATE TABLE dashboard (
  id         TEXT PRIMARY KEY DEFAULT 'default',
  doc        TEXT NOT NULL,        -- JSON
  updated_at TEXT NOT NULL
);
```

### settings — 全局配置

```sql
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### snapshot — treemap 物化缓存

```sql
CREATE TABLE snapshot (
  id        TEXT PRIMARY KEY DEFAULT 'latest',
  doc       TEXT NOT NULL,         -- 整份 treemap JSON
  generated TEXT NOT NULL
);
```

### health — 面板自检

```sql
CREATE TABLE health (
  module     TEXT PRIMARY KEY,   -- pipeline | rss | tavily | base_model | pro_model | prices
  status     TEXT NOT NULL,      -- ok | degraded | failed
  last_ok    TEXT,
  last_error TEXT,
  updated_at TEXT NOT NULL
);
```

- pipeline 每轮对每个依赖写状态。
- `tavily` module：`settings.tavily_enabled = false` 时 status 设为 `degraded`（不是 `failed`）。
- `api.py` 加 `GET /health` 吐给前端。

## INV-DC3: watchlist.json 降级为种子文件

- 运行时不读 `watchlist.json`，从 DB 的 `domains` / `members` / `memberships` 表读。
- `seed.py` 一次性导入（含别名），后续修改直接改 DB。
- `watchlist.json` 保留在 `pipeline/` 目录作为初始数据参考。

## INV-DC4: JSON 去留规矩

| 场景 | 用什么 |
|---|---|
| 业务数据持久化 | SQLite |
| API 响应体 | JSON 序列化（`/data`, `/layout`, `/prices`） |
| DB 内灵活列 | JSON 文本（`aliases`, `sources`, `dashboard.doc`, `models.extra`） |
| 前端 mock | `web/public/mock/*.json` |
| 种子数据 | `pipeline/watchlist.json` |
| 配置 | `.env`（不入库的 key）+ `settings` 表（运行时配置） |

## INV-DC5: /data API 响应格式

treemap 的数据从 `/data` API 获取（读 `snapshot` 表），格式与原 `data.json` 兼容：

```json
{
  "name": "watchlist",
  "generated": "2026-06-01",
  "children": [
    {
      "name": "领域名",
      "children": [
        {
          "name": "成员名",
          "size": 80,
          "sentiment": 0.6,
          "status": "confirmed",
          "headline": "AI 浓缩一行",
          "metric": "关键数字",
          "heat": 0.8,
          "freshness": 0.8,
          "influence": 82.4,
          "baselineInfluence": 40,
          "impactWeight": 65,
          "impactPersistenceDays": 30
        }
      ]
    }
  ]
}
```

- `size`/`influence` 来源于成员影响力，不是 3 天新闻热度。
- `heat` 保留为前端兼容字段，语义与 `freshness` 一致：最近非 refuted 事件的新鲜度。
- 无事件成员仍出现在对应 domain children 中，`metric` 可为 `quiet`，`freshness=0`。

## INV-DC6: API 接口清单

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/data` | treemap 数据（读 snapshot 表） |
| GET | `/layout` | 仪表盘布局（读 dashboard 表） |
| PUT | `/layout` | 保存布局（防抖触发） |
| GET | `/news?q=&domain=` | 按需搜索（调 Tavily） |
| GET | `/prices?symbol=&range=` | 价格数据（读 prices 表） |
| GET | `/settings` | 全局配置 |
| PUT | `/settings` | 更新配置 |
| GET | `/models` | 模型列表 |
| PUT | `/models` | 更新模型/角色 |
| GET | `/domains` | 领域列表 |
| POST | `/domains` | 新增/更新领域 |
| GET | `/members` | 成员列表 |
| POST | `/members` | 新增成员；尝试 Pro 优先的 judgement model 做 baseline influence 估值，写 members/memberships 后刷新 snapshot |
| POST | `/members/{id}/baseline` | 重算单个成员 baseline influence；Pro role 优先，成功后刷新 snapshot |
| PUT | `/members/{id}` | 更新成员；刷新 snapshot |
| DELETE | `/members/{id}` | 删除成员及其事件/关系；刷新 snapshot |
| GET | `/health` | 面板自检状态（读 health 表） |

## INV-DC7: settings 键值约定

| key | 默认值 | 说明 |
|---|---|---|
| `pro_enabled` | `false` | PRO 总开关（前期关） |
| `tavily_enabled` | `true` | 深搜开关 |
| `stale_threshold_min` | `90` | 超过判 degraded（变灰） |
| `global_fail_count` | `2` | 同时 failed 模块数达此 → 红框 |
| `open_mode` | `drawer` | 点击行为（drawer / modal / newtab） |
| `refresh_min` | `60` | 定时频率 |

## INV-DC8: 迁移策略

- schema 变更走版本号（建 `schema_version` 表或上 alembic）。
- 不手改库，不删列，只加列或加表。

---
*Created: 2026-06-02 · Updated: 2026-06-02*
