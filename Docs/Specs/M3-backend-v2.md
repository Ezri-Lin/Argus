# M3 · 落库与改造规格（v2）

> 来源：用户交接规格。覆盖改动清单 → 完整 DDL → 数据库位置 → 模型方案 → JSON 边界 → 安全。

## 〇、命名 & 仓库

- 项目代号 **Argus**，accent 用 Iris。
- monorepo 根目录 `argus/`，子目录：`pipeline/`（采集分析）、`api/`（FastAPI）、`web/`（前端）、`data/`（DB 文件）。

## 一、对照 M3 v1 的改动清单

| 文件 / 项 | 怎么改 |
|---|---|
| `.github/workflows/radar.yml` | **删**。换 NAS/VPS 上 `crontab` 或 systemd timer |
| commit data.json 的 git push | **删**。不靠 git 当持久化 |
| `watchlist.json` | **降级为种子文件**。新增 `seed.py` 一次性导入；运行时从 DB 读 |
| `seen.json` | **删**。去重并进 `events` 表（`fingerprint` UNIQUE） |
| `sentinel.py` | **删**。初筛改用 base 角色模型 |
| `run.py` | 结尾写 SQLite（不再 dump data.json）；旧状态从 DB 读；分析结果 upsert 进 `events` |
| **新增 `db.py`** | 连接 + WAL + 建表。全项目唯一 DB 入口 |
| **新增 `api.py`** | FastAPI：`GET /data`、`GET/PUT /layout`、`GET /news`、`GET /prices`、`GET/PUT /settings`、`GET/PUT /models` |
| `treemap.html` | `fetch('data.json')` → `fetch('/data')` |
| `requirements.txt` | 加 `fastapi`、`uvicorn[standard]`、`python-dotenv` |
| SENTINEL_* 三件套 | **删**。模型只剩 base/pro 两角色，从 DB 的 `models` 读 |
| Secrets | GitHub Secrets → `.env`（python-dotenv） |
| 部署 | Cloudflare Tunnel 指向 uvicorn 端口；cron 跑 pipeline |

## 二、完整 DDL

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE domains (
  key       TEXT PRIMARY KEY,
  label_zh  TEXT NOT NULL,
  label_en  TEXT,
  weight    REAL NOT NULL DEFAULT 1.0,
  aliases   TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE members (
  id        INTEGER PRIMARY KEY,
  name      TEXT NOT NULL UNIQUE,
  label_zh  TEXT,
  label_en  TEXT,
  aliases   TEXT NOT NULL DEFAULT '[]',
  symbol    TEXT                          -- ticker，如 "NVDA"，非上市留空
);

CREATE TABLE memberships (
  member_id   INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  domain      TEXT    NOT NULL REFERENCES domains(key) ON DELETE CASCADE,
  role        TEXT    NOT NULL DEFAULT 'Primary',
  role_weight REAL    NOT NULL DEFAULT 1.0,
  PRIMARY KEY (member_id, domain)
);

CREATE TABLE events (
  id           INTEGER PRIMARY KEY,
  fingerprint  TEXT NOT NULL UNIQUE,
  member_id    INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  url          TEXT,
  outlet       TEXT,
  published    TEXT,
  sentiment    REAL,
  importance   REAL,
  kind         TEXT,
  status       TEXT,
  note         TEXT,
  rumor        REAL NOT NULL DEFAULT 1.0,
  sources      TEXT NOT NULL DEFAULT '[]',
  need_pro     INTEGER NOT NULL DEFAULT 0,
  route_reason TEXT,
  first_seen   TEXT NOT NULL,
  last_seen    TEXT NOT NULL
);
CREATE INDEX idx_events_member    ON events(member_id);
CREATE INDEX idx_events_published ON events(published);

CREATE TABLE prices (
  symbol TEXT NOT NULL,
  ts     TEXT NOT NULL,
  open REAL, high REAL, low REAL, close REAL, volume REAL,
  market_cap REAL,                       -- 可空；或用 close×股本 推算
  PRIMARY KEY (symbol, ts)
);

CREATE TABLE dashboard (
  id         TEXT PRIMARY KEY DEFAULT 'default',
  doc        TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE models (
  id         INTEGER PRIMARY KEY,
  label      TEXT NOT NULL,
  base_url   TEXT,
  api_key    TEXT,
  model      TEXT NOT NULL,
  web_search INTEGER NOT NULL DEFAULT 0,
  extra      TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE model_roles (
  role     TEXT PRIMARY KEY CHECK (role IN ('base','pro')),
  model_id INTEGER NOT NULL REFERENCES models(id)
);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE snapshot (
  id        TEXT PRIMARY KEY DEFAULT 'latest',
  doc       TEXT NOT NULL,
  generated TEXT NOT NULL
);

CREATE TABLE health (
  module     TEXT PRIMARY KEY,   -- pipeline | rss | tavily | base_model | pro_model | prices
  status     TEXT NOT NULL,      -- ok | degraded | failed
  last_ok    TEXT,
  last_error TEXT,
  updated_at TEXT NOT NULL
);
```

## 三、数据库位置 & 文件约定

- **路径**：`data/argus.db`（WAL 附带 `argus.db-wal`、`argus.db-shm`）
- `.gitignore`：`data/*.db*`、`.env`
- **权限**：`chmod 600 data/argus.db`
- **建表入口**：只在 `db.py` 里建表 + 设 PRAGMA
- **迁移**：schema 变更走版本号（`schema_version` 表或 alembic）

## 四、模型方案（Hybrid：模型出判断，代码兑现）

**两角色，从注册表选，不写死：**

- **base**：哨兵初筛 + 基础识别。MUST `web_search=1`。
- **pro**：交叉验证 / 零幻觉佐证。

**BASE 结构化输出契约：**

```json
{
  "sentiment":   -1.0,
  "importance":  0.0,
  "kind":        "转载|官方一手|预告吹水",
  "need_search": true,
  "need_pro":    true,
  "reason":      "一句话：为什么搜 / 为什么升级"
}
```

**控制流：**

```
BASE 初判（可用自带 web 快扫）
  ├─ need_search? → 调 Tavily 深搜 → 喂回证据让 BASE 复判
  ├─ need_pro?    → 调 PRO 交叉验证
  └─ 聚合写 events（need_pro / route_reason 落库）
护栏：每事件 search ≤1、pro ≤1、总 LLM 轮次设上限
```

**取模型：**

```sql
SELECT m.* FROM models m
JOIN model_roles r ON r.model_id = m.id
WHERE r.role = ?;
```

## 五、JSON 的去留

> storage 全进 SQLite；JSON 只剩三处：(a) API 出口序列化、(b) SQLite 内灵活列、(c) mock + 种子。其余一律不准用 JSON 文件当主存。

## 六、安全提醒

- `models.api_key` 落库 = 明文风险。单用户 NAS 可接受，但 MUST：① `argus.db` 权限 `600`；② 不进 git；③ 想更稳就库里只存引用名，真值留 `.env`。
- **单写者**：只有 pipeline 写 events/prices；api 只读。配合 WAL 基本碰不到锁。

## 七、PRO 休眠机制（保留、不开放、日后一键激活）

- `settings` 加 `pro_enabled = 'false'`（前期）。
- `model_roles` 的 `pro` 行**前期可不插**（base 槽必须有）；日后配好模型再插。
- pipeline 行为：
  - base 照常输出 `need_pro` + `route_reason` → **照常落库**（即使 PRO 关着）。
  - 实际调用 PRO 前先查 `pro_enabled`：`false` → **跳过**，`status` 留 `watch`、`rumor` 用 base 估值。
  - `pro_enabled` 翻 `true` 那天起，自动开始交叉验证，历史 `need_pro=1` 的事件可选择性回补。
- PRO 的 system prompt **原样存着备用**（见第九节），前期不接线。

## 八、面板自检模块

pipeline 每轮对每个依赖写 `health` 表。`api.py` 加 `GET /health` 吐给前端。

**前端三态：**

| 状态 | 触发条件 | UI 表现 |
|---|---|---|
| **ok** | 对应 module `ok` 且数据新鲜 | 正常显示 |
| **degraded（变灰）** | 数据 stale 超阈值，或该 widget 依赖的某 module = `failed` | widget 灰化，顶部小字「⚠ {n}h 未更新」或「⚠ AI 欠费，信息已失效」 |
| **failed（红框）** | 关键 module（`pipeline`/`base_model`）= `failed`，或 ≥N 个 module 同时 `failed` | 右上角红色全局警告框：「数据全线失效，先别看，该修了」+ 最早失败时间 |

**module → widget 映射：**
- treemap / feed → 依赖 `base_model` + `rss`/搜索
- prices widget → 依赖 `prices`
- 各 widget 用**数据自身时间戳**（`events.last_seen` / `prices.ts` / `snapshot.generated`）算 staleness，用 `health.status` 标失效原因。

**`tavily` module 特殊处理**：`settings.tavily_enabled = false` 时，`health` 表中 `tavily` 的 status 设为 `degraded`（不是 `failed`），因为 base 模型自带搜索仍可用，只是深搜能力降级。

## 九、Base / Pro 提示词（存档备用）

### BASE（初筛 + 基础识别 + 路由决策）

```
你是 Argus 情报系统的「初筛分析员」(BASE)。每次只处理一条候选新闻，快速定级并决定要不要深挖/升级。

【输入】
- 监控成员：{name}（别名：{aliases}），所属领域：{domains}
- 候选新闻：标题={title}｜来源={outlet}｜发布={published}｜摘要={snippet}
- 你可调用联网搜索：判断证据不足时可主动检索补充（受外层次数限制）。

【判断项】
1. sentiment 情绪：-1(极利空)~1(极利好)，针对该成员。
2. importance 重要度：0~1。官宣/财报/重大合作/事故 > 行业转载 > 预热吹水；看影响范围与确定性。
3. kind 类型：转载 | 官方一手 | 预告吹水。
4. need_search：满足任一→true：单一来源、标题党、关键数字缺失、与成员关联存疑、疑似旧闻翻炒。
5. need_pro：满足任一→true：importance≥0.6 且单源、信息互相矛盾、疑似重大但未证实、疑似吹水/假料。
6. reason：一句话说明 need_search/need_pro 的依据（必填，用于回溯）。

【规则】
- 只依据已知信息，不编造；不确定就压低 importance 并置 need_search/need_pro=true。
- 严格只输出下面的 JSON，不要任何额外文字或 markdown。

【输出】
{"sentiment":0.0,"importance":0.0,"kind":"转载|官方一手|预告吹水","need_search":false,"need_pro":false,"reason":""}
```

### PRO（交叉验证 / 零幻觉）— 前期存档，不接线

```
你是 Argus 情报系统的「交叉验证分析员」(PRO)，原则：零幻觉、只认证据。

【输入】
- 监控成员：{name}（别名：{aliases}），所属领域：{domains}
- 事件：标题={title}｜发布={published}
- BASE 初判：{base_json}
- 多源证据(Tavily 深搜)：{evidence_list}   // 每条含 来源/标题/摘要/链接/日期

【最终判定】
1. sentiment：-1~1，综合多源后的最终情绪。
2. importance：0~1，校正 BASE 偏差。
3. kind：转载 | 官方一手 | 预告吹水。
4. n_independent_sources：去重后独立信源数。
5. media_tier：最高媒体等级 tier1/2/3。
6. official_primary：是否有一手官方源。
7. date_span_days：最早↔最晚报道跨度（天）。
8. contradiction：信源间是否互相矛盾。
9. status：confirmed(多源一致证实) | watch(证据不足/待观察) | refuted(被证伪/矛盾)。
10. rumor：0~1。多源一致且有官方→低；单源/官方未证实/互相矛盾→高。
11. note：一句话中文结论（给人看的摘要）。
12. sources：实际支撑判断的来源链接数组。

【规则】
- 只用「多源证据」里的内容判断，证据没提到的不臆测。
- 证据不足→status=watch 且 rumor 偏高；出现矛盾→status=refuted。
- 与 BASE 不一致时以证据为准，不必解释分歧。
- 严格只输出下面的 JSON，无任何额外文字。

【输出】
{"sentiment":0.0,"importance":0.0,"kind":"官方一手","n_independent_sources":0,"media_tier":"tier1","official_primary":false,"date_span_days":0,"contradiction":false,"status":"watch","rumor":0.0,"note":"","sources":[]}
```

两个 prompt 的输出字段**直接对齐 `events` 表列**，落库不用再转换。

## 十、Treemap Hover / Click 设计

**Hover（轻量速览，默认「近期」）**
- 成员名 + 双语 label + 所属领域 tags + role（Primary/Secondary）
- 综合活跃度（= cell 大小来源）+ 情绪色点（红/灰/绿）
- 最近 3 条事件：标题｜来源｜情绪｜重要度｜日期（点击跳 url）
- 状态标记：confirmed / watch / refuted
- 底部一条**迷你 sparkline**（近 30 天声量或情绪）+ 「查看趋势 →」提示

**Click → Drawer（重，长时间线「趋势」）**
顶部时间范围切换 chips：**本年 / 近 1 年 / 近 3 年 / 全部**

- **市值/股价趋势**：sparkline + 区间涨跌幅 %（来自 `prices`，仅有 `symbol` 的成员）
- **声量趋势**：events 数量/月，mini bar
- **情绪趋势**：平均 sentiment/月，sparkline
- **重要里程碑**：importance 高的事件在时间轴上打点标注
- 完整事件列表（可按领域/情绪筛）

没有 `symbol` 的成员，drawer 的市值模块自动隐藏，只显声量+情绪趋势。

> hover 回答「现在咋样」，click 回答「这一年/这几年咋变的」。

## 十一、settings 增量

| key | 默认值 | 说明 |
|---|---|---|
| `pro_enabled` | `false` | PRO 总开关（前期关） |
| `tavily_enabled` | `true` | 深搜开关，前期可关省额度 |
| `stale_threshold_min` | `90` | 超过判 degraded（变灰） |
| `global_fail_count` | `2` | 同时 failed 模块数达此 → 红框 |
| `open_mode` | `drawer` | 点击行为（drawer / modal / newtab） |
| `refresh_min` | `60` | 定时频率 |

## 十二、最终模块清单（v1 + v2 合并）

- **DDL**：domains / members（含 symbol）/ memberships / events / prices（含 market_cap）/ dashboard / models / model_roles / settings / snapshot / **health**
- **模型**：`models` 注册表 + `model_roles`（base 必填、pro 前期空）；base 必须 `web_search=1`；Hybrid 路由（base 出 `need_search`/`need_pro` flag，代码带护栏执行）
- **前期跑通的链路**：cron → base（筛选+情绪色+一句话摘要，need_pro 落库但不调 PRO）→ 写 events/snapshot/health → FastAPI → 前端（treemap/feed + tooltip 近期/趋势 + 自检变灰/红框）
- **休眠备用**：PRO prompt、交叉验证逻辑、`status/rumor/sources` 字段
- **面板自检**：health 表 + 三态 UI（ok/degraded=灰/failed=红框）

---
*Created: 2026-06-02 · Updated: 2026-06-02*
