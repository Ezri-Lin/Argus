# Pipeline Invariants

> 管线核心业务规则。修改管线逻辑前必读。

## MVP 范围说明

**MVP（v1）默认 Base 做减法**：base 模型批量拉源/初筛 → keep/drop + 摘要 → 写 events。当前允许在低频关键 judgement 上启用 Pro：member baseline 估值、`need_pro=true` 事件复判。详见 `Docs/Specs/M3-mvp.md`。

本文件中的完整管线设计（两层模型 + Tavily + PRO 休眠 + health 自检）仍是 **v2 蓝图**；v1 仅接入必要的 Pro judgement，不做全量交叉验证或无限升级。

## INV-P1: 两层模型 + 一个搜索工具

| 角色 | 职责 | 模型来源 | 约束 |
|---|---|---|---|
| **Base** | 批量搜索/召回 + 初筛 + 路由决策（是否调工具/升级） | `models` 表，经 `model_roles` 指派 | MUST `web_search=1` |
| **Pro** | 低频关键 judgement：baseline、重大事件复判、佐证契约、复杂情绪识别 | `models` 表，经 `model_roles` 指派 | 零幻觉一票否决 |
| **Tavily** | 搜索工具（不是模型） | API key 在 `.env` 或 `settings` 表 | 按 credit 计费 |

- 模型从 DB 的 `models` 表读取，不靠 env 写死。
- 保存 base 角色指派时，若该模型 `web_search=0` 则拒绝 + 告警。
- 两角色都有权调用 Tavily 搜索工具。

## INV-P1a: Base 模型能力边界

Base 模型的提示词必须明确以下决策规则：

**自己搞定（直接打分，不调工具）**：
- 能从自带联网搜索摘要判断的简单事件
- 官方公告、财报发布、常规产品更新
- 多源一致、情绪明确的新闻

**调 Tavily 搜索工具**：
- 自带搜索摘要信息不够，需要原文细节
- 需要更多来源来判断置信度
- 摘要中出现关键词但缺乏上下文（如"据报道"、"知情人士透露"）

**调 Pro 模型**：
- 情绪拿不准（中性偏利好还是利空？）
- 重要性高（融资、收购、重大产品发布）
- 单源消息且非官方
- "in talks"、"据传"类传闻
- 信源之间存在矛盾

**同时调两个**：
- 重大事件且信息不足 → 先 Tavily 补充 → 再 Pro 验证

## INV-P1b: Base 模型结构化输出契约

Base 模型输出纯 JSON，不依赖 function-calling：

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

- `need_search=true` → 代码调 Tavily 深搜，喂回证据让 Base 复判
- `need_pro=true` → `pro_enabled=true` 且 pro role 可用时，代码调 Pro 做最终 judgement 并覆盖 status/sentiment/importance/impact；不可用时保留 Base 结果并落 `watch`
- 决策阈值：`importance >= 0.6` 考虑升级 Pro，`sources < 2` 考虑调 Tavily，`kind == "预告吹水"` 强制升级 Pro

## INV-P1c: 护栏（防死循环 / 账单失控）

每事件硬性上限：
- Tavily 搜索 ≤ 1 次
- Pro 调用 ≤ 1 次
- 总 LLM 轮次设上限（含 Base 复判）
- 超限 → 按当前最佳结果兜底，不再升级

## INV-P2: 佐证契约不可省略

Pro 模型必须输出以下字段，缺一不可：

```json
{
  "n_independent_sources": int,
  "media_tier": "tier1"|"tier2"|"tier3",
  "official_primary": bool,
  "date_span_days": int,
  "contradiction": bool,
  "status": "confirmed"|"watch"|"refuted",
  "sentiment": -1..1,
  "note": "string"
}
```

- 准度 ~70% 靠这张契约，不靠模型本身。
- `date_span_days > 30` 自动降权（旧闻翻炒）。

## INV-P3: 置信档三态唯一

- `confirmed`: 多源 + 官方 + 无矛盾 → 实线
- `watch`: 单源 / 仅吹水 / date_span 过大 → 虚线
- `refuted`: 来源矛盾 / 查无实据 → 隐藏

不允许新增状态。`refuted` 事件不出现在 treemap 中。

## INV-P4: 新闻新鲜度半衰期 = 3 天

```
decay = 0.5 ** (age_days / 3.0)
```

- 这是新闻热度 / freshness / detail 排序的核心参数，改需全局评估对新闻沉底和 glow 的影响。
- 它不再决定 treemap 成员格子的存在或长期大小。
- `"in talks"` 标题额外 × 0.4 降权。

## INV-P4a: 三时钟分离

成员存在、成员影响力、新闻新鲜度是三套独立时钟：

| 层 | 控制源 | 决定什么 |
|---|---|---|
| 存在层 | `members` / `memberships` 表 | 成员格子是否渲染；只要 membership 存在就渲染 |
| 影响力层 | `members.baseline_influence` + `events.impact_weight` 慢衰减 | treemap 成员格大小 |
| 新鲜度层 | `events.last_seen/published` 3 天半衰期 | glow/freshness 与 detail 新闻排序 |

- pipeline build snapshot 必须从 `memberships` 出发，不得因为成员没有事件而跳过。
- `refuted` 事件不贡献影响力，也不进入 related/detail；但 refuted 事件不得导致成员格子消失。
- 成员格子最小值由 `MIN_MEMBER_INFLUENCE` 兜底。成员消失只能由删除 membership/member 触发。

## INV-P4b: 持续影响力模型

treemap size 使用成员影响力：

```
influence = max(MIN, (baseline_influence + Σ impact_weight * 0.5 ** (age_days / impact_persistence_days) * status_factor) * role_weight)
size = round(influence)
```

- `baseline_influence`: 0-100，成员长期基础影响力；默认 20。
- `impact_weight`: 0-100，单事件持续影响力，不等于短期热度。
- `impact_persistence_days`: 单事件影响半衰期；噪音约 1，常规约 7，重要约 30，结构性约 120+。
- `status_factor`: confirmed=1，watch=0.65，refuted=0。
- `domain.weight` 表达用户对顶层领域/组件的相对缩放，不再乘进成员 size。
- `baseline_influence` 等长期 judgement 优先由 Pro role 评分；Pro 未启用/不可用时才 fallback 到 Base 或默认值。Base 适合批量搜索/召回，不作为长期影响力评分的首选模型。

## INV-P5: 两轮搜索机制 + SQLite 去重

- **第一轮**：Base 模型自带联网搜索（免费/便宜），快速扫 watchlist 成员，做初步筛选。
- **第二轮**：Base 判断需要更多细节时（`need_search=true`），调 Tavily 搜索工具拉完整新闻。
- 大多数情况第一轮就过滤掉了，Tavily 只在真正有东西时才烧。
- 去重靠 `events` 表的 `fingerprint` UNIQUE 约束，不靠 JSON 文件。
- 首次运行：全量搜索所有 member，成本最高。
- 后续运行：查 `events` 表命中与否，无新事 → 沿用旧数据。

## INV-P6: Tavily 搜索是付费操作

- basic 搜索 = 1 credit，advanced = 2 credits。
- 只在 Base 模型输出 `need_search=true` 时触发，绝不自动定时全量搜索。
- 前端 `/news` 按钮搜索也走 Tavily，需控制调用频率。

## INV-P7: 管线主流程

```
定时触发（crontab / systemd timer）
  → Base 模型自带联网搜索扫 watchlist
    → 没新事 → 结束（DB 中旧数据不变）
    → 有新事 → Base 输出 {sentiment, importance, kind, need_search, need_pro, reason}
      → need_search? → 调 Tavily 深搜 → 喂回证据让 Base 复判
      → need_pro?    → 调 Pro 做最终 judgement（status/sentiment/importance/impact/sources）
      → 聚合 → upsert events 表（fingerprint 去重）
      → 写 snapshot 表（treemap 物化缓存）
```

## INV-P8: 单写者原则

- 只有 pipeline 写 `events` / `prices` 表。
- 用户配置 API 可写 `domains` / `members` / `memberships`，并在成员/关系变化后刷新 `snapshot`，但不可写 `events`。
- `api.py` 核心 `/data` 只读；业务写入必须放在明确的 CRUD route 中。
- 配合 WAL 模式，基本碰不到锁。

## INV-P9: 模型注册表

- 模型存在 `models` 表，角色指派在 `model_roles` 表（只剩 `base` / `pro` 两槽）。
- 取模型 SQL：`SELECT m.* FROM models m JOIN model_roles r ON r.model_id = m.id WHERE r.role = ?`
- API key 存 DB（单用户 NAS 可接受）或引用 `.env` 变量名。
- 切换模型 = 改 DB 记录，不改代码，不重启 pipeline。

## INV-P10: PRO 休眠机制

- `settings.pro_enabled = 'false'`（前期默认关闭）。
- `model_roles` 的 `pro` 行前期可不插（base 槽必须有）。
- base 照常输出 `need_pro` + `route_reason` → **照常落库**（即使 PRO 关着）。
- 实际调用 PRO 前先查 `pro_enabled`：`false` → 跳过，`status` 留 `watch`，`rumor` 用 base 估值。
- `pro_enabled` 翻 `true` 那天起，自动开始交叉验证，历史 `need_pro=1` 的事件可选择性回补。
- PRO 的 system prompt 原样存着备用（见 `Docs/Specs/M3-backend-v2.md` 第九节）。

## INV-P11: 面板自检

- pipeline 每轮对每个依赖写 `health` 表（pipeline / rss / tavily / base_model / pro_model / prices）。
- `tavily` module：`settings.tavily_enabled = false` 时 status 设为 `degraded`（不是 `failed`）。
- 前端三态：ok（正常）/ degraded（widget 灰化 + 原因提示）/ failed（全局红框警告）。
- `GET /health` 接口吐给前端。

---
*Created: 2026-06-02 · Updated: 2026-06-02*
