# M2 · 混合版 treemap + 算法管线

<aside>
🧩

这是「提炼层」的两块骨架:**页面样式**(可直接丢进浏览器看的混合版 treemap)+ **算法管线**(真正有长期价值的部分)。HTML 是最便宜的一次性外壳,数据契约和算法才是沉淀下来的东西。

</aside>

## 一、页面样式 · 混合版 treemap

编码方式(和我们定的一致):

- **格子大小** = 活跃度(时效衰减后,watchlist 内相对)
- **边框颜色** = 情绪(绿利好 / 灰中性 / 红利空)
- **边框线型** = 置信(实线 = 已交叉验证坐实 / 虚线 = 存疑)
- **辉光强度** = 越热越亮
- **格子内部** = 成员名 + AI 浓缩一行 + 一个关键数字;格子太小时自动只留名字,详情移到 hover

> 注:这种「透明微染 + 每格独立辉光边框 + 内部富文本」的样子超出了 Plotly 自带 treemap 的能力,所以这版用 **D3 squarified 布局 + HTML 格子**(每格是个 div,边框 / 辉光 / 文字都能精细控制)。把下面整段存成 `treemap.html` 双击打开即可。
> 

```html
<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="utf-8"/>
<title>情报站 · 提炼层 treemap</title>
<script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:radial-gradient(1200px 800px at 70% -10%,#13203a 0%,#0b0f17 60%);color:#e6edf3;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;}
  header{padding:18px 24px 6px}
  h1{font-size:18px;margin:0;font-weight:600;letter-spacing:.5px}
  .sub{color:#8b949e;font-size:12px;margin-top:4px}
  .legend{display:flex;gap:16px;padding:10px 24px;color:#8b949e;font-size:11px;flex-wrap:wrap}
  .legend b{color:#c7d2e0;font-weight:600}
  .sw{display:inline-block;width:10px;height:10px;border-radius:3px;vertical-align:middle;margin-right:4px}
  #chart{position:relative;width:100%;height:76vh;margin:6px auto 0;}
  .domain-label{position:absolute;font-size:12px;font-weight:600;color:#9fb4d6;letter-spacing:1px;opacity:.8}
  .cell{position:absolute;border-radius:10px;padding:8px 10px;overflow:hidden;transition:transform .12s ease, box-shadow .12s ease;}
  .cell:hover{transform:translateY(-2px) scale(1.01);z-index:5}
  .cell .name{font-weight:700;font-size:13px;line-height:1.1}
  .cell .headline{font-size:11px;color:#c7d2e0;margin-top:4px;line-height:1.25}
  .cell .metric{font-size:11px;margin-top:6px;font-variant-numeric:tabular-nums;opacity:.95}
  .badge{position:absolute;top:6px;right:8px;font-size:9px;padding:1px 5px;border-radius:6px;background:rgba(255,255,255,.08)}
</style>
</head>
<body>
<header>
  <h1>📡 个人情报站 · 提炼层 treemap <span style="color:#8b949e;font-weight:400">(本周快照 · mock)</span></h1>
  <div class="sub">格子大小 = 活跃度(时效衰减后) · 边框颜色 = 情绪 · 边框线型 = 置信(实线=坐实 / 虚线=存疑) · 内部 = AI 浓缩</div>
</header>
<div class="legend">
  <span><span class="sw" style="background:#46d49a"></span>利好</span>
  <span><span class="sw" style="background:#8b949e"></span>中性</span>
  <span><span class="sw" style="background:#ff6b6b"></span>利空</span>
  <span><b>实线</b> 已交叉验证</span>
  <span><b>虚线</b> 存疑/待验证</span>
  <span><b>辉光越亮</b> 越热</span>
</div>
<div id="chart"></div>
<script>
// === mock 数据:真实运行时改为 fetch('data.json').then(r=>r.json()).then(d=>{DATA=d;render()}) ===
let DATA = {
  name:"watchlist",
  children:[
    {name:"AI 大模型", children:[
      {name:"Anthropic", size:80, sentiment:0.6, status:"confirmed",
       headline:"Opus 4.8 发布 + Series H $965B 估值坐实", metric:"估值 $965B ✓多源"},
      {name:"OpenAI", size:60, sentiment:0.3, status:"confirmed",
       headline:"IPO 筹备 + $250M 基金 + Altman 表态", metric:"IPO 筹备中"},
      {name:"Perplexity", size:25, sentiment:0.1, status:"medium",
       headline:"接入 MS Office", metric:"集成消息"},
      {name:"DeepSeek", size:12, sentiment:0.0, status:"confirmed",
       headline:"本周安静(V4 为 4 月旧闻)", metric:"低活跃"},
    ]},
    {name:"AI Coding 工具", children:[
      {name:"Cursor", size:35, sentiment:0.2, status:"watch",
       headline:"v3.6 发布(本周);$50B 融资=4月 in talks 已降权", metric:"$50B 存疑"},
      {name:"OpenAI", size:30, sentiment:0.2, status:"confirmed",
       headline:"Codex 持续迭代", metric:"配角"},
      {name:"Anthropic", size:28, sentiment:0.5, status:"confirmed",
       headline:"Claude 在 coding 持续领先", metric:"配角"},
    ]},
    {name:"AI 硬件/算力", children:[
      {name:"NVIDIA", size:95, sentiment:0.8, status:"confirmed",
       headline:"Computex/GTC 台北:N1X + RTX Spark;股价近 52 周高", metric:"NVDA $220 ▲4.57%"},
    ]},
  ]
};

const sentColor = d3.scaleLinear().domain([-1,0,1]).range(["#ff6b6b","#8b949e","#46d49a"]).clamp(true);
const hexA = (hex,a)=>{const c=d3.color(hex);c.opacity=a;return c+"";};

function render(){
  const el=document.getElementById('chart');
  el.innerHTML="";
  const W=el.clientWidth, H=el.clientHeight;
  const root=d3.hierarchy(DATA).sum(d=>d.size).sort((a,b)=>b.value-a.value);
  d3.treemap().size([W,H]).paddingTop(22).paddingInner(6).round(true)(root);

  root.children.forEach(dom=>{
    const lab=document.createElement('div');
    lab.className='domain-label';
    lab.style.left=dom.x0+'px'; lab.style.top=(dom.y0+2)+'px';
    lab.textContent=dom.data.name;
    el.appendChild(lab);
  });

  const maxV=d3.max(root.leaves(),d=>d.value);
  root.leaves().forEach(n=>{
    const w=n.x1-n.x0, h=n.y1-n.y0;
    const col=sentColor(n.data.sentiment);
    const heat=n.value/maxV;
    const dashed=n.data.status==="watch";
    const div=document.createElement('div');
    div.className='cell';
    div.style.left=n.x0+'px'; div.style.top=n.y0+'px';
    div.style.width=w+'px'; div.style.height=h+'px';
    div.style.background=`linear-gradient(160deg, ${hexA(col,0.14)}, ${hexA(col,0.04)})`;
    div.style.border=`${dashed?'1.5px dashed':'2px solid'} ${col}`;
    div.style.boxShadow=`0 0 ${6+heat*22}px ${hexA(col,0.25+heat*0.5)}, inset 0 0 ${8+heat*16}px ${hexA(col,0.06)}`;
    const big = w>90 && h>62;
    div.innerHTML =
      `<div class="name">${n.data.name}</div>`+
      (big? `<div class="headline">${n.data.headline}</div><div class="metric">${n.data.metric}</div>`:``)+
      `<div class="badge">${dashed?'存疑':'✓'}</div>`;
    div.title=`${n.data.name} · ${n.parent.data.name}\n${n.data.headline}\n${n.data.metric}`;
    el.appendChild(div);
  });
}
render();
addEventListener('resize',render);
</script>
</body>
</html>
```

真实运行时,只要把 `let DATA = {...}` 换成 `fetch('data.json')`,算法每天产出的 `data.json` 就会自动驱动这张图。

## 二、数据契约 · data.json(算法 → 页面的桥)

```json
{
  "name": "watchlist",
  "generated": "2026-06-01",
  "children": [
    {
      "name": "AI 大模型",
      "children": [
        {
          "name": "Anthropic",
          "size": 80,
          "sentiment": 0.6,
          "status": "confirmed",
          "headline": "Opus 4.8 发布 + Series H $965B 估值坐实",
          "metric": "估值 $965B",
          "member_url": "<Members 行 URL>",
          "membership_url": "<Membership 行 URL>"
        }
      ]
    }
  ]
}
```

字段直接对应 Notion:`size` ← Membership.DomainScore、`sentiment` ← 情绪聚合、`status` ← 置信档(confirmed=实线 / watch=虚线 / refuted=隐藏)。

## 三、算法管线 · [pipeline.py](http://pipeline.py)

流程:**抓取 → 按事件去重 → 情绪/重要度 → 交叉验证打置信 → 时效衰减 → 聚合写回**。

```python
"""
情报站 · 提炼层算法管线  pipeline.py
抓取 → 去重(按事件) → 情绪/重要度 → 交叉验证打置信 → 时效衰减 → 写回 Notion
产出: data.json (treemap 直接读) + 写回 Member / Membership 字段
"""
from __future__ import annotations
import datetime as dt, math, json
from dataclasses import dataclass, field

# ---------- 0. 配置 ----------
SEARCH_API    = "tavily"        # 检索层: 看重覆盖/时效 (Tavily/Exa/Brave)
JUDGE_CHEAP   = "claude-haiku"  # 判断层-批量
JUDGE_STRONG  = "claude-opus"   # 判断层-升级(存疑/高重要性), 零幻觉一票否决
LOOKBACK_DAYS = 7
HALF_LIFE_DAYS = 3.0            # 时效衰减半衰期

# ---------- 1. 抓取 ----------
def fetch_news(member: str) -> list[dict]:
    # tav.search(query=f"{member} latest news", topic="news",
    #            days=LOOKBACK_DAYS, max_results=20)
    ...

# ---------- 2. 去重: 按"事件"而非"文章" ----------
@dataclass
class Event:
    title: str
    member: str
    published: dt.date
    sources: list[dict] = field(default_factory=list)  # [{outlet, tier, url, published}]
    # 判断层填充:
    sentiment: float = 0.0      # -1..1  (ABSA, 针对该 member)
    importance: float = 0.0     # 0..1
    kind: str = ""              # 转载 | 官方一手 | 预告吹水
    confidence: dict = field(default_factory=dict)
    status: str = ""           # confirmed | watch | refuted

def cluster_events(articles: list[dict]) -> list[Event]:
    # 用标题/正文 embedding 聚类; 同一事件的多篇转载 -> 一个 Event(保留所有来源)
    ...

# ---------- 3. 情绪 + 重要度 (批量, 便宜模型) ----------
def judge_basic(ev: Event) -> None:
    # JUDGE_CHEAP 输出 {sentiment, importance, kind}
    ...

# ---------- 4. 交叉验证: 强制结构化"佐证契约" ----------
# 准度 ~70% 靠这张契约(逼模型把证据摊开), 而非模型本身
CORROBORATION_CONTRACT = {
    "n_independent_sources": int,  # 去重后独立信源数
    "media_tier": str,             # 最高媒体等级 tier1/2/3
    "official_primary": bool,      # 是否有一手官方源
    "date_span_days": int,         # 最早↔最晚报道跨度 (抓 in-talks 旧闻)
    "contradiction": bool,         # 信源间是否互相矛盾
}
def cross_validate(ev: Event) -> None:
    # 高重要性 or judge_basic 标存疑 -> 扩展搜索 + JUDGE_STRONG, 按契约输出
    # 映射到置信档:
    #   多源 + 官方 + 无矛盾            -> "confirmed" (实线)
    #   单源 / 仅吹水 / date_span 过大  -> "watch"      (虚线, 存疑)
    #   信源互相矛盾 / 查无             -> "refuted"    (隐藏)
    ...

# ---------- 5. 时效衰减 + in-talks 降权 ----------
def decayed_activity(ev: Event, today: dt.date) -> float:
    age = (today - ev.published).days
    decay = 0.5 ** (age / HALF_LIFE_DAYS)
    rumor_factor = 0.4 if "in talks" in ev.title.lower() else 1.0
    return ev.importance * decay * rumor_factor

# ---------- 6. 聚合: member 全局 → 摊到每条 membership ----------
def ema(xs, alpha=0.5):
    out = 0.0
    for x in xs:
        out = alpha * x + (1 - alpha) * out
    return out

def aggregate(member: str, events: list[Event], today: dt.date) -> dict:
    activity = sum(decayed_activity(e, today) for e in events)
    sentiment = ema([e.sentiment for e in events])      # 2-3 天 EMA
    top = max(events, key=lambda e: e.importance, default=None)
    return {"activity": activity, "sentiment": sentiment, "top_event": top}

def to_membership_score(member_agg: dict, role_weight: float, domain_weight: float) -> float:
    # 同一 member 在不同领域: 按 Role/DomainWeight 加权 -> 各自的 DomainScore(格子大小)
    return member_agg["activity"] * role_weight * domain_weight

# ---------- 7. 写回 Notion + 产出 data.json ----------
def write_back(member_agg, memberships) -> None:
    # Member:     Importance / NewsConfidence / Trend / LastHit
    # Membership: DomainScore(格子大小) / sentiment / status(置信->实线/虚线)
    # 同时拼出 data.json 供 treemap 读取
    ...
```

### 关于「验证用哪家模型」

- **检索层**(搜什么)比模型更重要:用 Tavily / Exa 这类 news API,看重覆盖面和时效。
- **判断层分级**:便宜模型(Haiku / Flash / DeepSeek)跑批量;只有 **存疑 / 高重要性** 才升级到强模型(Opus / GPT-top),并给它「零幻觉一票否决」权。
- 关键认知:交叉验证的准度 ~70% 靠那张**强制契约**(逼模型输出独立源数 / 媒体等级 / 日期跨度 / 是否矛盾),而不是靠模型本身——上一轮 Cursor 那个错,就是被「日期跨度」这一栏抓出来的。

---

下一步可选:① 接真实 search API 跑一天真数据;② 把 `data.json` 写回逻辑接上 Notion 字段;③ 用 GitHub Actions 配每日 cron。