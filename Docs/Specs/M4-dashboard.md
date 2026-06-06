# M4 · 前端仪表盘 · 规格

<aside>
🎯

**目标**：一个可拖拽 / 缩放 / 自定义内容的个人情报仪表盘。提炼层（treemap）为主件，外加标题流、时序折线、嵌入三类原语，组合出私人作战室。本页是设计与技术决策的唯一事实来源（SSOT）。

</aside>

## 一、组件模型：四原语

把最初列的 7 类需求收敛成 **4 个可复用原语 + 配置**，避免组件爆炸。

### 1. Treemap（主件 · 提炼层）

- **数据**：`data.json`
- **配置项**：维度（领域 / 成员）· watchlist 范围 · AI 搜索扩展深度 · 重要度阈值
- **视觉编码**：
    - 格子**大小** = 活跃度（相对基线 + 时效衰减）
    - **边框颜色** = 新闻情绪（红/灰/绿）
    - **边框样式** = 置信度（实线 = confirmed / 虚线 = watch）
    - **辉光** = 热度；refuted 直接隐藏
- 内部按面积分级显示：名称 → 头条 → 指标

### 2. 标题流 FeedList

- **数据源**：RSS / Tavily 新闻搜索
- **配置项**：来源列表 · 领域关键词 · AI 情绪 / 重要度阈值（多一层展示过滤）· 卡内多源 tab 切换
- **新闻搜索 = 按钮触发**，不自动刷新，省 Tavily 额度
- **数据**：`rss.json`（定时）+ `/news?q=&domain=`（按需）

### 3. 时序折线 TimeSeries

- **数据源**：股票（yfinance / Finnhub）· 加密币（CoinGecko）
- **配置项**：标的列表 · 时间窗
- **数据**：`prices.json` / `crypto.json`
- **库**：Recharts（开发快、好看）

### 4. 嵌入 Embed

- **模式**：网页 / 视频 / 直播
- **配置项**：URL 列表 + 标题 tab 格子切换
- ⚠️ **限制**：`X-Frame-Options` 会挡掉大多数新闻站的 iframe；YouTube / 哔哩哔哩 / 直播官方 embed 可用

<aside>
📥

**Backlog（v1 后）**：指标卡 / 大数字 · 事件日历（财报 / 发布会）

</aside>

## 二、技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | React 18 + Vite + TypeScript |
| 布局 / 拖拽缩放 | react-grid-layout（拖动、缩放、保存布局） |
| Treemap | D3 v7（复用 M2 实现） |
| 折线图 | Recharts（点数极多时再换 uPlot） |
| 状态 | Zustand |
| 数据请求 | TanStack Query |
| 样式 | Tailwind + CSS 变量（双主题 token） |
| 图标 / 动效 | lucide-react · Framer Motion（克制使用） |

## 三、架构与部署

```
monorepo/
	pipeline/   # Python：哨兵 + Tavily + 双模型（M3）+ feeds.py + prices.py
	api/        # FastAPI：/news（按需搜）、后期 /layout
	web/        # React 前端
	data/       # JSON 契约文件
```

- **重活放自有服务器**：流水线 cron + FastAPI +（后期）数据库；不放 Cloudflare Workers（有时间/CPU 限制，且要重写成 JS）
- **Cloudflare Tunnel**：免费 HTTPS、不开端口、手机可访问
- **前端**：服务器 nginx 静态托管 或 Cloudflare Pages
- **布局持久化（落库）**：服务器常驻，直接上 **SQLite** 存布局，前端经 `/layout` 读写；`localStorage` 仅作首屏快取 / 离线兜底。多设备（含手机经 Tunnel）天然同步，后期可迁 D1。

### 数据契约

- 定时产出文件：`data.json` · `rss.json` · `prices.json` · `crypto.json`
- 接口：`/news?q=&domain=`（按需搜）· `GET/PUT /layout`（布局落库，拖拽结束防抖保存）
- 前后端只通过这些 JSON 文件 + 接口对话，解耦

### 布局落库（SQLite）

- 单用户极简：`dashboard.db` 一张表 `dashboard(id TEXT PK, doc JSON, updated_at)`，默认一行 `id='default'`
- `doc` 存整份仪表盘：`{ widgets:[{id,type,config}], layout:{lg:[...],md:[...]} }`
- 拖拽/缩放结束 → 防抖 `PUT`；首屏 `GET`（localStorage 先垫一帧）
- 后期要多套仪表盘 / 历史，再加行或加 `profiles` 表

### 数据源

| 类型 | 源 | 备注 |
| --- | --- | --- |
| 新闻搜索 | Tavily | 按钮触发，basic=1 / advanced=2 credit |
| RSS | feedparser | 须服务器端抓（CORS） |
| 股票 | yfinance / Finnhub | Finnhub 60 req/min；避开 Alpha Vantage（25/天） |
| 加密币 | CoinGecko | 免费无 key，约 10–30 req/min |

## 四、视觉语言（2026 · 反 SaaS · 液态玻璃）

### 主题 token（暗 + 亮 切换）

| token | 暗色 | 亮色 |
| --- | --- | --- |
| 背景 bg | #0a0b0f（带极淡雾） | #f4f5f7 |
| 玻璃外壳/边框 | rgba(255,255,255,.06) + blur | rgba(255,255,255,.55) + blur |
| 内容区 surface（不透） | #12141a | #ffffff |
| 文本 / 次级 | #e6e8ee / #9aa3b2 | #1a1d24 / #5b6472 |
| 强调 accent | #7c83e8（带辉光） | #5a62d6（实色） |

### 强调色：雾霭鸢尾 Iris

<aside>
💜

`#7c83e8`（亮 `#5a62d6`）。**纪律**：保持低饱和、永远单色零渐变（躲开烂大街的 AI 紫渐变）；出现面积 < 5%，只点缀 active tab / focus 环 / hover 高光扫过 / 关键数字高亮。质感交给玻璃高光，不靠渐变。

</aside>

### 语义色（数据专用，两主题通用）

- 情绪：红 `#ff6b6b` · 灰 `#8b949e` · 绿 `#46d49a`
- 置信：实线 / 虚线边框
- ⚠️ 强调色**绝不**用红/绿系，避免与情绪语义打架

### 玻璃模型

- **外壳 / 边框 / 标题栏 = 毛玻璃**：`backdrop-filter: blur(18px) saturate(140%)` + 顶部 1px 高光描边 + 柔阴影
- **内容区（treemap 画布 / 列表 / 图表）= 不透明实底**，保证数据高对比、不糊、不掉帧
- 限制叠加的模糊层数（性能）；文字下垫 scrim（可读性）

### 字体

- 英数：Geist / General Sans（数字等宽）
- 中文：思源黑体 / HarmonyOS Sans
- 避免 Inter

### 动效

- 拖拽：整卡轻微果冻回弹、阴影加深
- hover：外框扫过一道 accent 高光
- 数据更新：微过渡，不喧宾夺主

## 五、配置与交互

### 配置分两层

**⚙️ 全局设置页**（管「系统怎么跑」）

- **初阶/哨兵搜索模型**：下拉自选（MiniMax / MiMo / 其它支持联网的便宜模型），可填 base_url / model / key。每半小时跑的就是这层。
- **Tavily ＝ 高级补充搜索**：不是常驻层，是强力外挂。开关 + 触发条件（升级阈值自动触发 / 组件内手动按钮）+ 额度提醒。仅在初阶模型发现疑点、需 grounded 核实时才烧。
- **刷新频率**：30 分钟 / 1 小时 / 手动
- **API keys**：Finnhub 等
- **点击打开方式**：右侧抽屉（默认）/ 居中弹窗 / 新标签页，改一处全场生效

**🧩 组件配置弹窗**（管「这张卡显示什么」）

- 添加 widget 时弹出，填的是各原语的「配置项」（维度 / watchlist / 阈值 / 来源 / 标的 / URL……）
- ⚠️ 哨兵模型属于全局，**不**在组件级

### 交互：全场统一一套语言

**Hover ＝ 轻量预览（组件锚定浮卡，离开即关）**

- 浮卡贴在当前组件旁（按空间自动选左/右弹出，大小与组件相近），鼠标移开即关闭
- Treemap → 该领域/成员**缩略总结** + 最近 3–5 条重点关联新闻（标题 + 来源 + 情绪点）
- 标题流 → 阅读预览卡（摘要 / 首图）
- 折线 → 数值/涨跌 tooltip + 一句迷你摘要

**Click ＝ 打开详情（右侧抽屉 · 默认）**

- 保持上下文不跳走；可在全局设置改为弹窗 / 新标签页
- ⚠️ **外链硬约束**：外部网页因 `X-Frame-Options` 常无法嵌入抽屉/弹窗，**外链详情一律新标签打开**，不强塞 iframe

### 网格与拖拽（Mac 桌面式吸附）

react-grid-layout 原生支持，关键配置：

- `compactType={null}`：自由摆放，无自动重力吸顶
- `preventCollision={true}`：**只能放进空闲区，不挤占已有组件**
- 拖动时显示**吸附占位框**（`react-grid-placeholder`）：贴网格、近白/Iris 描边 + 极淡玻璃填充，即松手后的最终落点
- 占位框始终对齐格子（snap 内建）

**所有间距 / 边距 / 网格常量进一个通用文件，写死统一：**

- `src/design/grid.ts` → `COLS`（各断点列数）· `ROW_HEIGHT` · `MARGIN`（组件间距）· `CONTAINER_PADDING`（组件到画布边距）· `BREAKPOINTS`
- `src/design/tokens.ts`（或 `:root` CSS 变量）→ 颜色 / 圆角 / blur / 间距阶 / 字体，全场唯一来源，组件不许写魔法值

## 六、建议构建顺序

1. 脚手架：Vite + React + TS + Tailwind + react-grid-layout，跑通拖拽/缩放（`preventCollision` 防挤占 + 吸附占位框）；布局先 `localStorage`，再接 `GET/PUT /layout` 落 SQLite
2. **Treemap** widget（接 `data.json`，复用 M2 算法与样式）
3. **标题流** widget（接 `rss.json` + `/news` 按钮搜）
4. **时序折线** widget（Recharts + `prices.json`/`crypto.json`）
5. **嵌入** widget（YouTube/B站/直播官方 embed）
6. 双主题切换 + 视觉打磨（玻璃外壳、Iris 点缀、字体）