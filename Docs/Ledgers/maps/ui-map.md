# UI Map — Frontend Dashboard

> UI 代码导航入口。修改前端代码前必读。

## 自定义 Widget 系统（Phase 7–14 完成）

| 文件 | 职责 |
|---|---|
| `web/src/App.tsx` | 根组件：TopBar + DashboardCanvas + ConfigPanel |
| `web/src/components/top-bar.tsx` | 顶栏：Argus 标题 + 胶囊 ghost controls（排版 / 设置 / Add） |
| `web/src/components/dashboard-canvas.tsx` | react-grid-layout 容器，拖拽/缩放，接受 onConfigWidget |
| `web/src/components/widget-frame.tsx` | 统一 widget 壳：status dot + title + updatedAt + hover controls；数值卡可用 contentOwnsHeader 让内容接管 title/label |
| `web/src/components/add-widget-menu.tsx` | 4-item 下拉：Treemap/Feed/TimeSeries/Embed → store.addWidget |
| `web/src/components/config-panel.tsx` | 右 slide-over：title + type-specific config + save/delete；Title 写回 widget.title，Label 进入 widget.config；Treemap 新增成员会等待后端 baseline 估值并刷新 `/data`，成员行 `AI` 按钮可触发 Pro 优先重算 baseline；Embed URL Parse 只生成可选候选源，用户选择一个后追加到已有 Sources，默认 source label 压缩为短标签 |
| `web/src/components/settings-panel.tsx` | 系统设置 slide-over：模型/Tavily 显式 Save；模型 API Key 不回显明文，仅显示 has_api_key 状态 |
| `web/src/components/detail-content-feed.tsx` | Signal / Feed 详情内容：source logo + source/category/time + 正文/原文链接 |

## Widget 实现

| 文件 | 职责 |
|---|---|
| `web/src/dashboard/widget-registry.tsx` | switch/case 分发器：type → widget 组件，unknown → degraded fallback |
| `web/src/widgets/treemap/treemap-widget.tsx` | D3 treemap：ResizeObserver + SVG + hover tooltip，INV-T1 编码；API domain 按 stable key 映射到固定 dashboard widgets；不渲染 logo，保留大号 uppercase/ticker label + 居中 quiet metric tag |
| `web/src/widgets/treemap/treemap-layout.ts` | 纯函数：TreemapItem[] + {w,h} → positioned rects（成员按 value/影响力降序后 d3.hierarchy + treemapSquarify） |
| `web/src/widgets/treemap/treemap-style.ts` | glowFilter(freshness/heat compat) / cellBorder(confidence) / cellTextVisibility / sentimentStyle |
| `web/src/widgets/feed/feed-list-widget.tsx` | signals variant（情感点+source logo+分类+标题+摘要）+ RSS variant（tab bar + source logo 列表） |
| `web/src/widgets/timeseries/time-series-widget.tsx` | watchlist（logo slot + 轻量 SVG sparkline + 固定价格列 + hidden scrollbar）+ sentiment（Title/Label 语义 + MetricDisplay + SVG sparkline） |
| `web/src/widgets/embed/embed-widget.tsx` | video/iframe + HLS playback；按源 type 分流，DASH/不可播源 fallback，当前源失败自动切换候选；source tabs 只显示短标签 |
| `web/src/widgets/embed/video-source-label.ts` | 播放源短标签与候选追加 helper：`HLS 720p` / `MP4 360p` / `YouTube` / `B站` / `DASH`；解析候选 normalize 后仅追加选中的一个且按 URL 去重 |
| `web/src/widgets/primitives/metric-display.tsx` | 轻量数值原子：ResizeObserver + 纯计算字号 + 横/竖迟滞切换 |
| `web/src/widgets/primitives/entity-logo.tsx` | 静态 entity/source logo primitive：消费后端 `logoUrl/logoKey/logoText`，无资产时 initials 兜底；用于 Watchlist/Feeds/Signals/Detail，不用于 treemap cell |
| `web/src/widgets/primitives/sparkline.tsx` | 轻量 SVG sparkline，用于非交互数值卡底部趋势线；默认灰白，不使用 Iris |
| `web/src/widgets/stat/stat-widget.tsx` | MetricDisplay 数值卡：可选 Title + 主 Label + value/unit/delta，可选 sparkline；无硬编码类别 |
| `web/src/widgets/weather/weather-widget.tsx` | MetricDisplay 天气卡：可选 Title + 主 Label/地点 + 居中温度/caption；无硬编码类别 |
| `web/src/widgets/countdown/countdown-widget.tsx` | 四段式倒计时：可选 Title + 主 Label + 天/时/分/秒单位标签 + 目标时间 caption；按容器同比放大数字 |
| `web/src/widgets/clock/clock-widget.tsx` | Apple-style 世界时钟列表：Cupertino/New York/London/Tokyo + 弱化本地行，按分钟刷新；按容器同比放大行文字 |

## 数据 & 状态

| 文件 | 职责 |
|---|---|
| `web/src/dashboard/dashboard-types.ts` | LayoutItem / WidgetType / DashboardWidget / DashboardDoc |
| `web/src/dashboard/dashboard-store.ts` | Zustand：addWidget / removeWidget / updateWidgetConfig（剥离 `_title` 写回 widget.title）/ setLayout / resetDashboard |
| `web/src/dashboard/default-dashboard.ts` | 默认 8-widget 布局 |
| `web/src/dashboard/mock-data.ts` | treemaps / signals / feeds / watchlist / sentimentTrend；entity logo 元数据字段（logoUrl/logoKey/logoText/logoAlt） |

## 共享模块

| 文件 | 职责 |
|---|---|
| `web/src/design/tokens.ts` | 颜色 / 圆角 / shadow / fontSize token |
| `web/src/design/grid.ts` | COLS / ROW_HEIGHT / MARGIN / BREAKPOINTS / WIDGET_PRESETS |
| `web/src/design/scale.ts` | 纯函数字号缩放、CJK-aware 宽度估算、fitLines |
| `web/src/design/use-measured-size.ts` | ResizeObserver + rAF 封装；消费方避免 DOM 几何回读 |
| `web/src/lib/treemap-style.ts` | sentimentStyle（fill/border/text 映射） |
| `web/src/styles/globals.css` | CSS vars + react-grid-placeholder 中性玻璃样式 |

## 截图

| 文件 | 尺寸 |
|---|---|
| `Docs/Prototypes/assets/argus-final-dashboard-1600.png` | 1600×960 |
| `Docs/Prototypes/assets/argus-final-dashboard-1440.png` | 1440×900 |
| `Docs/Prototypes/assets/argus-final-dashboard-mobile.png` | 390×844 |

## 交互规则

| 交互 | 行为 |
|---|---|
| Hover WidgetFrame | 显示 ⚙ 配置按钮 |
| Hover TopBar | 显示 + 添加和 ⚙ 设置按钮 |
| 拖拽 | react-grid-layout，placeholder 中性白灰玻璃调 |
| Config Panel | 右 slide-over，title + type-specific 字段 + save/delete；Embed Parse 生成候选源，不覆盖已有源，选中一个后才追加 |
| Settings Panel | Key/Model 配置必须显式 Save；onBlur 不作为密钥保存机制 |
| Idle Motion | 无常驻动画；仅保留 hover / 用户触发 / 播放器控件补间；treemap freshness glow 是静态滤镜 |
| Typography | 全局 Geist Variable + HarmonyOS/Source Han 中文 fallback；数字 tabular |

---
*Last Updated: 2026-06-05*
