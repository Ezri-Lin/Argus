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

  // ── Config panel — feed ──
  "config.feed.mode": "模式",
  "config.feed.variant.signals": "Signals (AI 搜索)",
  "config.feed.variant.rss": "RSS (AI 过滤)",
  "config.feed.keywords": "搜索关键词（每行一个）",
  "config.feed.keywordsHelp": "AI 将根据这些关键词搜索官方公告、重要推特、行业新闻",
  "config.feed.rssSources": "RSS 订阅源",
  "config.feed.filterPrompt": "AI 过滤提示词",
  "config.feed.filterPromptHelp": "AI 将根据此提示词对 RSS 内容进行筛选",

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

  // ── Feed widget ──
  "feed.collapse": "收起",
  "feed.older": "更早",

  // ── Countdown widget ──
  "countdown.unit.days": "天",
  "countdown.unit.hours": "时",
  "countdown.unit.minutes": "分",
  "countdown.unit.seconds": "秒",
  "countdown.allDone": "全部完成",

  // ── Minimized bar ──
  "minimized.label": "暂存",

  // ── Freshness ──
  "freshness.noData": "无数据",

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

  // ── Config panel — feed ──
  "config.feed.mode": "Mode",
  "config.feed.variant.signals": "Signals (AI Search)",
  "config.feed.variant.rss": "RSS (AI Filter)",
  "config.feed.keywords": "Search Keywords (one per line)",
  "config.feed.keywordsHelp": "AI will search for official announcements, tweets, and industry news based on these keywords",
  "config.feed.rssSources": "RSS Sources",
  "config.feed.filterPrompt": "AI Filter Prompt",
  "config.feed.filterPromptHelp": "AI will filter RSS content based on this prompt",

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

  // ── Feed widget ──
  "feed.collapse": "Collapse",
  "feed.older": "Older",

  // ── Countdown widget ──
  "countdown.unit.days": "d",
  "countdown.unit.hours": "h",
  "countdown.unit.minutes": "m",
  "countdown.unit.seconds": "s",
  "countdown.allDone": "All Done",

  // ── Minimized bar ──
  "minimized.label": "Stashed",

  // ── Freshness ──
  "freshness.noData": "No data",

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
