# Code Map — Pipeline & Backend

> 代码导航入口。修改后端 / 管线代码前必读。

## MVP 模块（v1，当前开发）

| 文件 | 职责 | 说明 |
|---|---|---|
| `pipeline/pipeline.py` | 单文件：Base 拉源/初筛 → Tavily? → Pro? → 写 events → 写 snapshot | MVP 核心，cron 每 30-60min 跑；Base 负责批量召回/路由，need_pro 事件由 Pro 覆盖 status/sentiment/importance/impact；snapshot 从 memberships 出发，成员恒显示，size=baseline + impact 慢衰减，freshness=3 天半衰期 |
| `pipeline/db.py` | SQLite 连接入口 | WAL + foreign_keys + busy_timeout；所有连接从这里创建；`init_db()` 执行 additive column migrations |
| `pipeline/sources.json` | 种子：我关注的 2-3 个源 | 含 name/type/url/weight |
| `pipeline/requirements.txt` | Python 依赖 | openai, fastapi, uvicorn, python-dotenv |
| `api/api.py` | FastAPI：GET /data, GET/PUT /layout, settings/health router registration | 读 DB，不写 events；写 dashboard layout |
| `api/routes_members.py` | Domains / members / memberships CRUD | 新增/重算成员时调用 Pro 优先的 judgement model 做 baseline influence 估值；成员/关系变化后刷新 treemap snapshot |
| `api/routes_ai.py` | AI 辅助接口：search/suggest-dates/parse-video/stat-api/stream-proxy | parse-video 只产候选源；stream-proxy 低内存分块转发，HLS manifest 才读入重写 |
| `api/routes_models.py` | 模型注册表 CRUD、角色分配、连通性测试 | GET /models 不回传 api_key，只回 `has_api_key`；模型测试会刷新 base/pro health |
| `web/` | Vite + React + D3 treemap + react-grid-layout | 静态渲染，data-driven |
| `data/argus.db` | SQLite (WAL) | 3 张表：sources / events / dashboard |

## v2 模块（验证通过后，蓝图见 `Docs/Specs/M3-backend-v2.md`）

| 文件 | 职责 |
|---|---|
| `pipeline/db.py` | 全项目唯一 DB 入口 |
| `pipeline/seed.py` | watchlist.json → DB 导入 |
| `pipeline/analyze.py` | Base + Pro 模型 |
| `pipeline/search.py` | Tavily 搜索封装 |
| `pipeline/run.py` | 主流程编排 |
| `api/routes/` | 拆分路由（/data, /layout, /news, /prices, /settings, /models, /health） |

## DB 表一览

### MVP（v1）— 3 张表

| 表 | 职责 | 写方 | 读方 |
|---|---|---|---|
| `sources` | 我关注的源 | pipeline | api |
| `events` | AI 减法后的条目 | pipeline | api |
| `dashboard` | 仪表盘布局 | api | api |

### v2 蓝图 — 完整 schema

| 表 | 职责 |
|---|---|
| `domains` / `members` / `memberships` | 全成员全领域；`members.baseline_influence` 是长期影响力锚点 |
| `models` / `model_roles` | 模型注册表 |
| `prices` | 时序价格 |
| `settings` | 全局配置 |
| `snapshot` | treemap 物化缓存 |
| `health` | 面板自检 |

## 前端模块

| 文件 | 职责 |
|---|---|
| `web/src/widgets/TreemapWidget.tsx` | D3 treemap（SVG，数据变才重画；size=影响力，glow=freshness） |
| `web/src/widgets/FeedListWidget.tsx` | 近 N 天高分条目，零未读 |
| `web/src/design/tokens.ts` | 颜色/间距/字体 token |
| `web/src/design/grid.ts` | 网格常量 |
| `web/src/stores/dashboardStore.ts` | Zustand 布局状态 |

---
*Last Updated: 2026-06-02*
