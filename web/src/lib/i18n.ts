/**
 * Argus i18n — lightweight translation map (zh/en).
 * No external dependencies. Keys are dot-separated, values are plain strings.
 */

const zh = {
  // ── Top bar ──
  "topbar.addWidget": "添加组件",
  "topbar.autoLayout": "自动排版",
  "topbar.exitEdit": "退出编辑",
  "topbar.edit": "编辑",
  "topbar.switchToLight": "切换亮色",
  "topbar.switchToDark": "切换暗色",
  "topbar.settings": "设置",

  // ── Notifications ──
  "notifications.title": "通知",
  "notifications.markAllRead": "全部已读",
  "notifications.empty": "暂无通知",

  // ── Config panel — common ──
  "config.common.edit": "编辑",
  "config.common.delete": "删除",
  "config.common.save": "保存",
  "config.common.cancel": "取消",
  "config.common.name": "名称",
  "config.common.add": "添加",
  "config.common.aliases": "别名(逗号分隔)",
  "config.common.pickFromLibrary": "从源库选择",
  "config.common.refresh": "刷新数据",
  "config.common.triggered": "已触发",
  "config.common.refreshTooltip": "触发管线并刷新数据",

  // ── Config panel — treemap ──
  "config.treemap.domains": "领域",
  "config.treemap.members": "成员",
  "config.treemap.emptyMembers": "暂无成员",
  "config.treemap.quickAdd": "快速添加",
  "config.treemap.primaryInterval": "主成员刷新 (min)",
  "config.treemap.secondaryInterval": "副成员刷新 (min)",
  "config.treemap.tierPrimary": "主力",
  "config.treemap.tierSecondary": "观察",
  "config.treemap.tierCandidate": "推荐",
  "config.treemap.candidateHint": "推荐成员不会主动获取数据，如有需要可加入主力或观察",
  "config.treemap.interval": "刷新",
  "config.treemap.recommendations": "推荐",

  // ── Config panel — feed ──
  "config.feed.mode": "模式",
  "config.feed.variant.signals": "Signals (AI 搜索)",
  "config.feed.variant.rss": "RSS (AI 过滤)",
  "config.feed.keywords": "搜索关键词（每行一个）",
  "config.feed.keywordsHelp": "AI 将根据这些关键词搜索官方公告、重要推特、行业新闻",
  "config.feed.rssSources": "RSS 订阅源",
  "config.feed.filterPrompt": "AI 过滤提示词",
  "config.feed.filterPromptHelp": "AI 将根据此提示词对 RSS 内容进行筛选",
  "config.feed.filterPromptPlaceholder": "只保留 AI、半导体、大模型相关的新闻\n忽略广告和推广内容",

  // ── Config panel — countdown ──
  "config.countdown.targets": "目标日期",
  "config.countdown.title": "标题",
  "config.countdown.emptyTargets": "无目标日期",
  "config.countdown.datePlaceholder": "日期 (ISO)",
  "config.countdown.aiSuggest": "AI 日期推荐",
  "config.countdown.keywordPlaceholder": "关键词 (如: 龙之家族 S3)",
  "config.countdown.aiRecommend": "AI 推荐",
  "config.countdown.addSelected": "添加选中",

  // ── Config panel — stat ──
  "config.stat.testApi": "测试 API",
  "config.stat.testing": "测试中...",
  "config.stat.testHelp": "测试 API 返回值是否能正确提取",

  // ── Config panel — embed ──
  "config.embed.placeholder": "粘贴视频/直播 URL 自动解析",

  // ── Settings panel ──
  "settings.title": "系统设置",
  "settings.tab.config": "配置",
  "settings.tab.features": "功能",
  "settings.tab.params": "参数",
  "settings.tab.search": "搜索",
  "settings.tab.status": "状态",
  "settings.tab.import": "导入",

  // Settings — save
  "settings.save.button": "保存",
  "settings.save.saving": "保存中...",
  "settings.save.noChanges": "无变更",
  "settings.save.success": "已保存",
  "settings.save.failed": "保存失败",
  "settings.save.unsavedSuffix": "项未保存",

  // Settings — config tab
  "settings.config.aiModels": "AI 模型",
  "settings.config.addModel": "+ 添加模型",
  "settings.config.currentPrefix": "当前:",
  "settings.config.language": "语言",

  // Settings — model
  "settings.model.new": "新模型",
  "settings.model.namePlaceholder": "模型名称",
  "settings.model.test": "测试",
  "settings.model.configured": "已配置",
  "settings.model.saved": "已保存",
  "settings.model.saveFailed": "保存失败",
  "settings.model.unassigned": "未分配",

  // Settings — features tab
  "settings.features.toggleSection": "功能开关",
  "settings.features.tavilyDeep": "Tavily 深搜",
  "settings.features.tavilyDeepDesc": "需要在配置页填写 Tavily API Key",
  "settings.features.proModel": "PRO 模型",
  "settings.features.proModelDesc": "交叉验证（需在配置页配置 pro 模型）",
  "settings.features.roleAssign": "角色分配",
  "settings.features.baseModel": "基础模型",

  // Settings — params tab
  "settings.params.refreshInterval": "刷新频率",
  "settings.params.minutes": "分钟",
  "settings.params.healthThresholds": "健康阈值",
  "settings.params.degradedThreshold": "降级阈值",
  "settings.params.degradedThresholdDesc": "模块超过此时间无更新则标记降级",
  "settings.params.failThreshold": "失败阈值",
  "settings.params.failThresholdDesc": "失败模块数达到此值则全局标红",
  "settings.params.countUnit": "个",

  // Settings — search tab
  "search.enabled": "已启用",
  "search.priority": "优先级",
  "search.dailyCap": "日限额",
  "search.timeout": "超时(秒)",
  "search.apiKey": "API Key",
  "search.test": "测试",
  "search.testing": "测试中...",
  "search.testOk": "连接成功",
  "search.testFail": "连接失败",
  "search.noProviders": "暂无搜索供应商",
  "search.logs": "搜索日志",
  "search.noLogs": "暂无日志",
  "search.provider": "供应商",
  "search.results": "结果",
  "search.latency": "延迟",
  "search.fallback": "降级",
  "search.member": "成员",
  "search.time": "时间",

  // Settings — status tab
  "settings.status.loading": "加载中...",
  "settings.status.systemHealth": "系统状态",
  "settings.status.ok": "正常",
  "settings.status.degraded": "降级",
  "settings.status.failed": "异常",
  "settings.status.modelError": "模型错误:",
  "settings.status.dataOverview": "数据概览",
  "settings.status.events": "事件",
  "settings.status.members": "成员",
  "settings.status.sources": "源",
  "settings.status.memberProgress": "成员进度",
  "settings.status.hintDisabled": "未启用 — 请在功能标签页开启",

  // Settings — module labels
  "settings.module.pipeline": "管线",
  "settings.module.rss": "RSS 源",
  "settings.module.baseModel": "基础模型",
  "settings.module.proModel": "高级模型",
  "settings.module.tavily": "Tavily 搜索",
  "settings.module.prices": "价格数据",

  // Settings — import tab
  "settings.import.libraryOverview": "源库概览",
  "settings.import.streams": "视频流",
  "settings.import.rssSources": "RSS 源",
  "settings.import.dropZone": "导入文件",
  "settings.import.importing": "导入中...",
  "settings.import.dropHint": "拖放或点击选择文件",
  "settings.import.supportedFormats": "支持 .json / .md / .txt",
  "settings.import.formatHelp": "格式说明",
  "settings.import.jsonFormat": "JSON 格式",
  "settings.import.jsonFormatDesc": "包含 streams/feeds 数组:",
  "settings.import.mdFormatDesc": "自动提取 URL，按规则分类:",
  "settings.import.defaultClassification": "其他 URL → 视频流（默认）",
  "settings.import.importedContent": "已导入内容",
  "settings.import.noValidUrl": "未找到有效 URL",
  "settings.import.failed": "导入失败",
  "settings.import.rss": "RSS",

  // ── Detail panel ──
  "detail.importance": "重要度",
  "detail.readOriginal": "阅读原文",
  "detail.relatedNews": "相关新闻",
  "detail.noRelatedNews": "暂无相关新闻",
  "detail.status.confirmed": "已证实",
  "detail.status.refuted": "已驳斥",
  "detail.status.observing": "观察中",
  "detail.treemap.confidence.watch": "观察中",
  "detail.treemap.confidence.confirmed": "已确认",
  "detail.highImpact": "高影响",
  "detail.impact": "影响",
  "detail.value": "价值",
  "detail.sentiment": "情绪",
  "detail.heat": "热度",
  "detail.currentPrice": "当前价格",
  "detail.prevClose": "昨收",
  "detail.volume": "成交量",
  "detail.dayRange": "日内区间",
  "detail.weekRange52": "52周区间",

  // ── Feed widget ──
  "feed.collapse": "收起",
  "feed.older": "更早",
  "feed.category.tech": "科技",
  "feed.category.markets": "市场",
  "feed.category.geo": "地缘",
  "feed.category.ai": "AI",

  // ── News kind tags ──
  "news.kind.official": "官方一手",
  "news.kind.secondary": "媒体报道",
  "news.kind.speculative": "传闻 / 预告",
  "news.kind.unknown": "未知",

  // ── Domain presets ──
  "preset.ai.label": "AI 大模型",
  "preset.ai.desc": "模型厂商、芯片算力、AI 基础设施",
  "preset.ai.title": "AI 大模型",
  "preset.bigtech.label": "科技巨头",
  "preset.bigtech.desc": "Apple, Google, Amazon, Meta, Microsoft 综合动态",
  "preset.bigtech.title": "科技巨头",
  "preset.chips.label": "芯片半导体",
  "preset.chips.desc": "设计、制造、封测、设备全产业链",
  "preset.chips.title": "芯片半导体",
  "preset.crypto.label": "加密货币",
  "preset.crypto.desc": "BTC, ETH, 交易所, DeFi, 监管",
  "preset.crypto.title": "加密货币",
  "preset.finance.label": "金融市场",
  "preset.finance.desc": "投行、资管、支付、宏观经济",
  "preset.finance.title": "金融市场",
  "preset.chinatech.label": "中概科技",
  "preset.chinatech.desc": "腾讯、阿里、字节、比亚迪等中国科技巨头",
  "preset.chinatech.title": "中概科技",
  "preset.evenergy.label": "新能源",
  "preset.evenergy.desc": "电动车、电池、光伏、充电基础设施",
  "preset.evenergy.title": "新能源",

  // ── Countdown widget ──
  "countdown.unit.days": "天",
  "countdown.unit.hours": "时",
  "countdown.unit.minutes": "分",
  "countdown.unit.seconds": "秒",
  "countdown.allDone": "全部完成",

  // ── Minimized bar ──
  "minimized.label": "暂存",

  // ── Widget type labels ──
  "widget.type.treemap": "树图",
  "widget.type.feed": "信息流",
  "widget.type.timeseries": "时间序列",
  "widget.type.embed": "嵌入",
  "widget.type.stat": "数据卡",
  "widget.type.clock": "时钟",
  "widget.type.weather": "天气",
  "widget.type.countdown": "倒计时",
  "widget.type.search": "AI 搜索",

  // ── Widget frame ──
  "widget.configure": "配置",
  "widget.duplicate": "复制",
  "widget.expand": "展开",
  "widget.minimize": "最小化",
  "widget.delete": "删除",
  "widget.details": "详情",
  "widget.loading.firstLoad": "首次数据加载中...",
  "widget.loading.membersProcessed": "{done}/{total} 成员已处理",

  // ── Widget menu ──
  "widget.menu.readyToUse": "开箱即用",

  // ── Config panel ──
  "config.common.configureWidget": "配置组件",
  "config.common.title": "标题",
  "config.common.enabled": "已启用",
  "config.common.disabled": "已禁用",
  "config.common.failed": "失败",
  "config.common.requestFailed": "请求失败 — 请检查模型配置",

  // ── Treemap ──
  "treemap.hydrating": "补充数据中...",
  "treemap.hydratingShort": "补充数据中",
  "treemap.value": "数值",
  "treemap.heat": "热度",

  // ── Detail panel ──
  "detail.panelTitle": "详情",
  "detail.triggered": "✓ 已触发",
  "detail.module.pipeline": "管线",
  "detail.module.rss": "RSS",
  "detail.module.baseModel": "基础模型",
  "detail.module.proModel": "高级模型",
  "detail.module.tavily": "Tavily",

  // ── Search widget ──
  "search.noQuery": "无查询",
  "search.button": "搜索",
  "search.configureHint": "请在组件设置中配置搜索关键词",
  "search.searching": "搜索中...",
  "search.failed": "搜索失败",
  "search.keyEvents": "关键事件",
  "search.sources": "来源",

  // ── Weather widget ──
  "weather.clear": "晴",
  "weather.mainlyClear": "大部晴朗",
  "weather.partlyCloudy": "多云",
  "weather.overcast": "阴",
  "weather.fog": "雾",
  "weather.rimeFog": "冻雾",
  "weather.lightDrizzle": "小毛毛雨",
  "weather.drizzle": "毛毛雨",
  "weather.denseDrizzle": "大毛毛雨",
  "weather.lightRain": "小雨",
  "weather.rain": "雨",
  "weather.heavyRain": "大雨",
  "weather.lightSnow": "小雪",
  "weather.snow": "雪",
  "weather.heavySnow": "大雪",
  "weather.lightShowers": "小阵雨",
  "weather.showers": "阵雨",
  "weather.violentShowers": "暴雨",
  "weather.thunderstorm": "雷暴",
  "weather.tstormHail": "雷暴伴冰雹",
  "weather.tstormHeavyHail": "雷暴伴大冰雹",
  "weather.fetchFailed": "获取失败",
  "weather.loadError": "无法加载天气",
  "weather.configureLocation": "请配置位置以查看天气",
  "weather.unavailable": "天气不可用",
  "weather.updating": "更新中",
  "weather.unknown": "未知",
  "weather.wind": "风",
  "weather.humidity": "湿度",

  // ── Clock widget ──
  "clock.title": "时钟",
  "clock.now": "现在",

  // ── Countdown widget (extra) ──
  "countdown.defaultLabel": "倒计时",
  "countdown.setTargetDate": "设置目标日期",
  "countdown.more": "+{count} 更多",

  // ── Stat widget ──
  "stat.defaultLabel": "数据",
  "stat.defaultUnit": "美元",

  // ── Embed widget ──
  "embed.source": "来源",
  "embed.unsupportedStream": "浏览器不支持此流",
  "embed.bilibili": "B站",
  "embed.iframeLabel": "嵌入",
  "embed.srcLabel": "源 {n}",
  "embed.sourceLabel": "来源 {n}",

  // ── Settings — config tab (extra) ──
  "settings.config.ok": "正常",
  "settings.config.failed": "失败",
  "settings.config.networkError": "网络错误",
  "settings.config.tavilyApiKey": "Tavily API Key",

  // ── Settings — search mode ──
  "settings.search.mode": "搜索模式",
  "settings.search.auto": "自动",
  "settings.search.fallback": "降级",
  "settings.search.fixed": "固定",
  "settings.search.modeAutoDesc": "RSS 本地缓存优先，SearXNG 补漏，Tavily 仅在 Budget Guard 内付费补证。",
  "settings.search.modeFallbackDesc": "按优先级依次尝试，失败时降级到下一个 provider。",
  "settings.search.modeFixedDesc": "只使用指定的 provider，不降级。",
  "settings.search.discoveryDesc": "SearXNG / Serper / Bocha — 低成本扫描，每成员每轮",
  "settings.search.deepSearchDesc": "Tavily — 高质量佐证，按需由升级策略触发",
  "settings.search.profile": "配置",
  "settings.search.off": "关闭",

  // ── Settings — status tab (extra) ──
  "settings.status.providerHealth": "供应商状态",
  "settings.status.unknown": "未知",
  "settings.status.budgetToday": "今日预算",
  "settings.status.lastPipelineRun": "上次管线运行",
  "settings.status.time": "时间：",
  "settings.status.module": "模块：",
  "settings.status.error": "错误：",

  // ── Settings — budget ──
  "settings.budget.aiCalls": "AI 调用",
  "settings.budget.llmTokens": "LLM tokens",
  "settings.budget.tavilySpend": "Tavily 花费",
  "settings.budget.deepSearch": "深度搜索",

  // ── Settings — import (extra) ──
  "settings.import.streamClassifyHint": "含 <code>.m3u8</code> / <code>.mpd</code> / <code>.mp4</code> — 视频流",
  "settings.import.rssClassifyHint": "含 <code>.xml</code> / <code>.rss</code> / <code>/feed</code> — RSS 源",

  // ── Settings — module labels (extra) ──
  "settings.module.search": "搜索",

  // ── Freshness ──
  "freshness.noData": "无数据",
  "freshness.updating": "更新中...",
  "freshness.failures": "连续失败",

  // ── Detail overlay ──
  "detail.pipelineRunning": "数据更新中…",
  "detail.pipelineIdle": "Pipeline 空闲",
  "detail.fetchingRss": "正在抓取 RSS 源…",
  "detail.buildingSnapshot": "正在生成快照…",
  "detail.eventsFound": "已发现事件:",
  "detail.systemHealth": "系统状态",
  "detail.systemFailed": "多个模块失败，数据可能不可靠",
  "detail.systemDegraded": "部分模块降级，数据可能滞后",
  "detail.data": "数据概览",
  "detail.refreshNow": "立即刷新",
  "detail.events": "事件",
  "detail.lastRun": "上次运行",
  "detail.waiting": "等待中",
} as const;

const en: Record<keyof typeof zh, string> = {
  // ── Top bar ──
  "topbar.addWidget": "Add Widget",
  "topbar.autoLayout": "Auto Layout",
  "topbar.exitEdit": "Exit Edit",
  "topbar.edit": "Edit",
  "topbar.switchToLight": "Switch to Light",
  "topbar.switchToDark": "Switch to Dark",
  "topbar.settings": "Settings",

  // ── Notifications ──
  "notifications.title": "Notifications",
  "notifications.markAllRead": "Mark all read",
  "notifications.empty": "No notifications",

  // ── Config panel — common ──
  "config.common.edit": "Edit",
  "config.common.delete": "Delete",
  "config.common.save": "Save",
  "config.common.cancel": "Cancel",
  "config.common.name": "Name",
  "config.common.add": "Add",
  "config.common.aliases": "Aliases (comma-separated)",
  "config.common.pickFromLibrary": "Pick from Library",
  "config.common.refresh": "Refresh Data",
  "config.common.triggered": "Triggered",
  "config.common.refreshTooltip": "Trigger pipeline and refresh data",

  // ── Config panel — treemap ──
  "config.treemap.domains": "Domains",
  "config.treemap.members": "Members",
  "config.treemap.emptyMembers": "No members",
  "config.treemap.quickAdd": "Quick add",
  "config.treemap.primaryInterval": "Primary interval (min)",
  "config.treemap.secondaryInterval": "Secondary interval (min)",
  "config.treemap.tierPrimary": "Primary",
  "config.treemap.tierSecondary": "Secondary",
  "config.treemap.tierCandidate": "Recommended",
  "config.treemap.candidateHint": "Recommended members won't be fetched. Move to Primary or Secondary to enable.",
  "config.treemap.interval": "Interval",
  "config.treemap.recommendations": "Recommendations",

  // ── Config panel — feed ──
  "config.feed.mode": "Mode",
  "config.feed.variant.signals": "Signals (AI Search)",
  "config.feed.variant.rss": "RSS (AI Filter)",
  "config.feed.keywords": "Search Keywords (one per line)",
  "config.feed.keywordsHelp": "AI will search for official announcements, tweets, and industry news based on these keywords",
  "config.feed.rssSources": "RSS Sources",
  "config.feed.filterPrompt": "AI Filter Prompt",
  "config.feed.filterPromptHelp": "AI will filter RSS content based on this prompt",
  "config.feed.filterPromptPlaceholder": "Keep only AI, semiconductor, LLM related news\nIgnore ads and promotional content",

  // ── Config panel — countdown ──
  "config.countdown.targets": "Target Dates",
  "config.countdown.title": "Title",
  "config.countdown.emptyTargets": "No target dates",
  "config.countdown.datePlaceholder": "Date (ISO)",
  "config.countdown.aiSuggest": "AI Date Suggestions",
  "config.countdown.keywordPlaceholder": "Keyword (e.g. House of the Dragon S3)",
  "config.countdown.aiRecommend": "AI Suggest",
  "config.countdown.addSelected": "Add selected",

  // ── Config panel — stat ──
  "config.stat.testApi": "Test API",
  "config.stat.testing": "Testing...",
  "config.stat.testHelp": "Test whether the API response can be correctly extracted",

  // ── Config panel — embed ──
  "config.embed.placeholder": "Paste video/livestream URL to auto-parse",

  // ── Settings panel ──
  "settings.title": "System Settings",
  "settings.tab.config": "Config",
  "settings.tab.features": "Features",
  "settings.tab.params": "Params",
  "settings.tab.search": "Search",
  "settings.tab.status": "Status",
  "settings.tab.import": "Import",

  // Settings — save
  "settings.save.button": "Save",
  "settings.save.saving": "Saving...",
  "settings.save.noChanges": "No changes",
  "settings.save.success": "Saved",
  "settings.save.failed": "Save failed",
  "settings.save.unsavedSuffix": "unsaved",

  // Settings — config tab
  "settings.config.aiModels": "AI Models",
  "settings.config.addModel": "+ Add Model",
  "settings.config.currentPrefix": "Current:",
  "settings.config.language": "Language",

  // Settings — model
  "settings.model.new": "New Model",
  "settings.model.namePlaceholder": "Model name",
  "settings.model.test": "Test",
  "settings.model.configured": "Configured",
  "settings.model.saved": "Saved",
  "settings.model.saveFailed": "Save failed",
  "settings.model.unassigned": "Unassigned",

  // Settings — features tab
  "settings.features.toggleSection": "Feature Toggles",
  "settings.features.tavilyDeep": "Tavily Deep Search",
  "settings.features.tavilyDeepDesc": "Requires Tavily API Key in Config tab",
  "settings.features.proModel": "PRO Model",
  "settings.features.proModelDesc": "Cross-validation (requires pro model in Config)",
  "settings.features.roleAssign": "Role Assignment",
  "settings.features.baseModel": "Base Model",

  // Settings — params tab
  "settings.params.refreshInterval": "Refresh Interval",
  "settings.params.minutes": "min",
  "settings.params.healthThresholds": "Health Thresholds",
  "settings.params.degradedThreshold": "Degraded Threshold",
  "settings.params.degradedThresholdDesc": "Mark module as degraded after this many minutes without update",
  "settings.params.failThreshold": "Fail Threshold",
  "settings.params.failThresholdDesc": "Mark global as failed when this many modules are failed",
  "settings.params.countUnit": "",

  // Settings — search tab
  "search.enabled": "Enabled",
  "search.priority": "Priority",
  "search.dailyCap": "Daily Cap",
  "search.timeout": "Timeout (s)",
  "search.apiKey": "API Key",
  "search.test": "Test",
  "search.testing": "Testing...",
  "search.testOk": "Connected",
  "search.testFail": "Failed",
  "search.noProviders": "No search providers",
  "search.logs": "Search Logs",
  "search.noLogs": "No logs yet",
  "search.provider": "Provider",
  "search.results": "Results",
  "search.latency": "Latency",
  "search.fallback": "Fallback",
  "search.member": "Member",
  "search.time": "Time",

  // Settings — status tab
  "settings.status.loading": "Loading...",
  "settings.status.systemHealth": "System Health",
  "settings.status.ok": "OK",
  "settings.status.degraded": "Degraded",
  "settings.status.failed": "Failed",
  "settings.status.modelError": "Model error:",
  "settings.status.dataOverview": "Data Overview",
  "settings.status.events": "Events",
  "settings.status.members": "Members",
  "settings.status.sources": "Sources",
  "settings.status.memberProgress": "Member Progress",
  "settings.status.hintDisabled": "Not enabled — enable in Features tab",

  // Settings — module labels
  "settings.module.pipeline": "Pipeline",
  "settings.module.rss": "RSS",
  "settings.module.baseModel": "Base Model",
  "settings.module.proModel": "Pro Model",
  "settings.module.tavily": "Tavily Search",
  "settings.module.prices": "Price Data",

  // Settings — import tab
  "settings.import.libraryOverview": "Library Overview",
  "settings.import.streams": "Streams",
  "settings.import.rssSources": "RSS Sources",
  "settings.import.dropZone": "Import File",
  "settings.import.importing": "Importing...",
  "settings.import.dropHint": "Drop or click to select file",
  "settings.import.supportedFormats": "Supports .json / .md / .txt",
  "settings.import.formatHelp": "Format Guide",
  "settings.import.jsonFormat": "JSON Format",
  "settings.import.jsonFormatDesc": "Contains streams/feeds arrays:",
  "settings.import.mdFormatDesc": "Auto-extract URLs, classified by rules:",
  "settings.import.defaultClassification": "Other URLs → Streams (default)",
  "settings.import.importedContent": "Imported Content",
  "settings.import.noValidUrl": "No valid URLs found",
  "settings.import.failed": "Import failed",
  "settings.import.rss": "RSS",

  // ── Detail panel ──
  "detail.importance": "Importance",
  "detail.readOriginal": "Read Original",
  "detail.relatedNews": "Related News",
  "detail.noRelatedNews": "No related news",
  "detail.status.confirmed": "Confirmed",
  "detail.status.refuted": "Refuted",
  "detail.status.observing": "Watching",
  "detail.treemap.confidence.watch": "Watching",
  "detail.treemap.confidence.confirmed": "Confirmed",
  "detail.highImpact": "HIGH IMPACT",
  "detail.impact": "IMPACT",
  "detail.value": "Value",
  "detail.sentiment": "Sentiment",
  "detail.heat": "Heat",
  "detail.currentPrice": "Current Price",
  "detail.prevClose": "Prev Close",
  "detail.volume": "Volume",
  "detail.dayRange": "Day Range",
  "detail.weekRange52": "52 Week Range",

  // ── Feed widget ──
  "feed.collapse": "Collapse",
  "feed.older": "Older",
  "feed.category.tech": "Tech",
  "feed.category.markets": "Markets",
  "feed.category.geo": "Geo",
  "feed.category.ai": "AI",

  // ── News kind tags ──
  "news.kind.official": "Official",
  "news.kind.secondary": "Coverage",
  "news.kind.speculative": "Speculative",
  "news.kind.unknown": "Unknown",

  // ── Domain presets ──
  "preset.ai.label": "AI / LLM",
  "preset.ai.desc": "Model makers, GPU compute, AI infrastructure",
  "preset.ai.title": "AI / LLM",
  "preset.bigtech.label": "Big Tech",
  "preset.bigtech.desc": "Apple, Google, Amazon, Meta, Microsoft",
  "preset.bigtech.title": "Big Tech",
  "preset.chips.label": "Semiconductors",
  "preset.chips.desc": "Design, fab, packaging, equipment — full chain",
  "preset.chips.title": "Semiconductors",
  "preset.crypto.label": "Crypto",
  "preset.crypto.desc": "BTC, ETH, exchanges, DeFi, regulation",
  "preset.crypto.title": "Crypto",
  "preset.finance.label": "Finance",
  "preset.finance.desc": "Investment banking, asset mgmt, payments, macro",
  "preset.finance.title": "Finance",
  "preset.chinatech.label": "China Tech",
  "preset.chinatech.desc": "Tencent, Alibaba, ByteDance, BYD and more",
  "preset.chinatech.title": "China Tech",
  "preset.evenergy.label": "EV & Energy",
  "preset.evenergy.desc": "Electric vehicles, batteries, solar, charging",
  "preset.evenergy.title": "EV & Energy",

  // ── Countdown widget ──
  "countdown.unit.days": "d",
  "countdown.unit.hours": "h",
  "countdown.unit.minutes": "m",
  "countdown.unit.seconds": "s",
  "countdown.allDone": "All Done",

  // ── Minimized bar ──
  "minimized.label": "Stashed",

  // ── Widget type labels ──
  "widget.type.treemap": "Treemap",
  "widget.type.feed": "Feed",
  "widget.type.timeseries": "Time Series",
  "widget.type.embed": "Embed",
  "widget.type.stat": "Stat Card",
  "widget.type.clock": "Clock",
  "widget.type.weather": "Weather",
  "widget.type.countdown": "Countdown",
  "widget.type.search": "AI Search",

  // ── Widget frame ──
  "widget.configure": "Configure",
  "widget.duplicate": "Duplicate",
  "widget.expand": "Expand",
  "widget.minimize": "Minimize",
  "widget.delete": "Delete",
  "widget.details": "Details",
  "widget.loading.firstLoad": "Loading initial data...",
  "widget.loading.membersProcessed": "{done}/{total} members processed",

  // ── Widget menu ──
  "widget.menu.readyToUse": "Ready to Use",

  // ── Config panel ──
  "config.common.configureWidget": "Configure Widget",
  "config.common.title": "Title",
  "config.common.enabled": "Enabled",
  "config.common.disabled": "Disabled",
  "config.common.failed": "Failed",
  "config.common.requestFailed": "Request failed — check model config",

  // ── Treemap ──
  "treemap.hydrating": "Loading data...",
  "treemap.hydratingShort": "Loading",
  "treemap.value": "value",
  "treemap.heat": "heat",

  // ── Detail panel ──
  "detail.panelTitle": "Detail",
  "detail.triggered": "✓ Triggered",
  "detail.module.pipeline": "Pipeline",
  "detail.module.rss": "RSS",
  "detail.module.baseModel": "Base Model",
  "detail.module.proModel": "Pro Model",
  "detail.module.tavily": "Tavily",

  // ── Search widget ──
  "search.noQuery": "No query",
  "search.button": "Search",
  "search.configureHint": "Configure a search query in widget settings",
  "search.searching": "Searching...",
  "search.failed": "Search failed",
  "search.keyEvents": "Key Events",
  "search.sources": "Sources",

  // ── Weather widget ──
  "weather.clear": "Clear",
  "weather.mainlyClear": "Mainly clear",
  "weather.partlyCloudy": "Partly cloudy",
  "weather.overcast": "Overcast",
  "weather.fog": "Fog",
  "weather.rimeFog": "Rime fog",
  "weather.lightDrizzle": "Light drizzle",
  "weather.drizzle": "Drizzle",
  "weather.denseDrizzle": "Dense drizzle",
  "weather.lightRain": "Light rain",
  "weather.rain": "Rain",
  "weather.heavyRain": "Heavy rain",
  "weather.lightSnow": "Light snow",
  "weather.snow": "Snow",
  "weather.heavySnow": "Heavy snow",
  "weather.lightShowers": "Light showers",
  "weather.showers": "Showers",
  "weather.violentShowers": "Violent showers",
  "weather.thunderstorm": "Thunderstorm",
  "weather.tstormHail": "T-storm w/ hail",
  "weather.tstormHeavyHail": "T-storm w/ heavy hail",
  "weather.fetchFailed": "Failed to fetch",
  "weather.loadError": "Could not load weather",
  "weather.configureLocation": "Configure location to see weather",
  "weather.unavailable": "Weather unavailable",
  "weather.updating": "Updating",
  "weather.unknown": "Unknown",
  "weather.wind": "Wind",
  "weather.humidity": "Humidity",

  // ── Clock widget ──
  "clock.title": "Clock",
  "clock.now": "now",

  // ── Countdown widget (extra) ──
  "countdown.defaultLabel": "Countdown",
  "countdown.setTargetDate": "Set a target date",
  "countdown.more": "+{count} more",

  // ── Stat widget ──
  "stat.defaultLabel": "Stat",
  "stat.defaultUnit": "USD",

  // ── Embed widget ──
  "embed.source": "Source",
  "embed.unsupportedStream": "Unsupported in-browser stream",
  "embed.bilibili": "Bilibili",
  "embed.iframeLabel": "Embed",
  "embed.srcLabel": "Src {n}",
  "embed.sourceLabel": "Source {n}",

  // ── Settings — config tab (extra) ──
  "settings.config.ok": "OK",
  "settings.config.failed": "Failed",
  "settings.config.networkError": "Network error",
  "settings.config.tavilyApiKey": "Tavily API Key",

  // ── Settings — search mode ──
  "settings.search.mode": "Search Mode",
  "settings.search.auto": "Auto",
  "settings.search.fallback": "Fallback",
  "settings.search.fixed": "Fixed",
  "settings.search.modeAutoDesc": "RSS local cache first, SearXNG fills gaps, Tavily only within Budget Guard.",
  "settings.search.modeFallbackDesc": "Try providers in priority order, fall back to next on failure.",
  "settings.search.modeFixedDesc": "Use only the specified provider, no fallback.",
  "settings.search.discoveryDesc": "SearXNG / Serper / Bocha — low-cost scanning, per member per round",
  "settings.search.deepSearchDesc": "Tavily — high-quality corroboration, triggered on-demand by EscalationPolicy",
  "settings.search.profile": "Profile",
  "settings.search.off": "OFF",

  // ── Settings — status tab (extra) ──
  "settings.status.providerHealth": "Provider Health",
  "settings.status.unknown": "unknown",
  "settings.status.budgetToday": "Budget Today",
  "settings.status.lastPipelineRun": "Last Pipeline Run",
  "settings.status.time": "Time: ",
  "settings.status.module": "Module: ",
  "settings.status.error": "Error: ",

  // ── Settings — budget ──
  "settings.budget.aiCalls": "AI calls",
  "settings.budget.llmTokens": "LLM tokens",
  "settings.budget.tavilySpend": "Tavily spend",
  "settings.budget.deepSearch": "Deep search",

  // ── Settings — import (extra) ──
  "settings.import.streamClassifyHint": "Contains <code>.m3u8</code> / <code>.mpd</code> / <code>.mp4</code> — video stream",
  "settings.import.rssClassifyHint": "Contains <code>.xml</code> / <code>.rss</code> / <code>/feed</code> — RSS source",

  // ── Settings — module labels (extra) ──
  "settings.module.search": "Search",

  // ── Freshness ──
  "freshness.noData": "No data",
  "freshness.updating": "Updating...",
  "freshness.failures": "consecutive failures",

  // ── Detail overlay ──
  "detail.pipelineRunning": "Updating data…",
  "detail.pipelineIdle": "Pipeline idle",
  "detail.fetchingRss": "Fetching RSS sources…",
  "detail.buildingSnapshot": "Building snapshot…",
  "detail.eventsFound": "Events found:",
  "detail.systemHealth": "System Health",
  "detail.systemFailed": "Multiple modules failed — data may be unreliable",
  "detail.systemDegraded": "Some modules degraded — data may be stale",
  "detail.data": "Data Overview",
  "detail.refreshNow": "Refresh Now",
  "detail.events": "events",
  "detail.lastRun": "Last Run",
  "detail.waiting": "waiting",
};

export type Lang = "zh" | "en";
export type I18nKey = keyof typeof zh;

const translations = { zh, en };

export function t(key: I18nKey, lang: Lang): string {
  return translations[lang]?.[key] ?? zh[key] ?? key;
}
