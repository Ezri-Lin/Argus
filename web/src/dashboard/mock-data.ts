/**
 * Mock data for all widget types.
 * Consolidates and extends the original data/mock.ts.
 */

// ── Entity logo metadata ──

export type EntityLogoFields = {
  logoUrl?: string;
  logoKey?: string;
  logoText?: string;
  logoAlt?: string;
};

// ── Treemap ──

export type RelatedNews = {
  title: string;
  url?: string;
  outlet?: string;
  time?: string;
  importance?: number;
  impactWeight?: number;
  impactPersistenceDays?: number;
  kind?: string;
  note?: string;
  sources?: string[];
};

export type TreemapItem = EntityLogoFields & {
  name: string;
  value: number;
  sentiment: number;
  previousSentiment?: number;
  metric: string;
  heat: number;
  freshness?: number;
  influence?: number;
  baselineInfluence?: number;
  impactWeight?: number;
  impactPersistenceDays?: number;
  confidence: "confirmed" | "watch";
  refuted?: boolean;
  headline?: string;
  related?: Array<string | RelatedNews>;
  dataState?: "hydrating" | "ready" | "stale" | "failed";
};

export type TreemapGroup = {
  title: string;
  items: TreemapItem[];
};

export const treemaps: Record<string, TreemapGroup> = {
  tech: {
    title: "科技 Tech",
    items: [
      { name: "NVIDIA", value: 132, sentiment: 0.72, metric: "HBM +18%", heat: 0.96, confidence: "confirmed", related: ["HBM3E shipments beat consensus by 12%", "Data center revenue hits new record", "Blackwell Ultra ramp accelerates into Q3"] },
      { name: "TSMC", value: 104, sentiment: 0.46, metric: "Capex up", heat: 0.82, confidence: "confirmed", related: ["Capex guidance raised to $38B", "N3 yield improvements ahead of schedule", "Arizona fab on track for 2025 production"] },
      { name: "OpenAI", value: 96, sentiment: 0.58, metric: "models", heat: 0.88, confidence: "watch", related: ["GPT-5 enterprise preview announced", "API pricing restructured for volume", "Partnership with Azure expands to 12 regions"] },
      { name: "Microsoft", value: 88, sentiment: 0.28, metric: "Azure AI", heat: 0.68, confidence: "confirmed", related: ["Azure AI revenue grows 60% YoY", "Copilot adoption exceeds 10M seats", "GitHub integration deepens developer lock-in"] },
      { name: "Apple", value: 76, sentiment: -0.18, metric: "iPhone mix", heat: 0.61, confidence: "confirmed", related: ["iPhone 16 mix shifts toward base model", "Services revenue hits all-time high", "China market share stabilizes at 15%"] },
      { name: "ASML", value: 64, sentiment: 0.22, metric: "EUV backlog", heat: 0.57, confidence: "confirmed", related: ["EUV backlog extends to 2027", "High-NA systems ship to 3 customers", "China export restrictions priced in"] },
      { name: "Anthropic", value: 58, sentiment: 0.38, metric: "enterprise", heat: 0.6, confidence: "watch", related: ["Claude 4 enterprise tier launches", "AWS Bedrock integration deepens", "Security certifications expand to FedRAMP"] },
      { name: "Broadcom", value: 54, sentiment: 0.31, metric: "ASIC flow", heat: 0.49, confidence: "confirmed", related: ["Custom ASIC pipeline grows 40%", "VMware integration on track", "AI networking revenue doubles"] },
      { name: "Samsung HBM", value: 48, sentiment: -0.22, metric: "yield watch", heat: 0.54, confidence: "watch", related: ["HBM3E yield issues persist", "Qualification with NVIDIA delayed", "Capex reallocated to packaging"] },
      { name: "Meta AI", value: 46, sentiment: 0.18, metric: "infra spend", heat: 0.44, confidence: "confirmed", related: ["Llama 3 adoption drives compute spend", "AI capex guidance raised to $40B", "Open-source strategy wins developer mindshare"] },
      { name: "Arm", value: 38, sentiment: 0.12, metric: "royalty", heat: 0.36, confidence: "confirmed", related: ["Royalty rate increases take effect", "CSS wins in mobile AI chips", "Server market share reaches 10%"] },
      { name: "Cloudflare", value: 30, sentiment: 0.2, metric: "edge AI", heat: 0.32, confidence: "watch", related: ["Workers AI inference at edge grows 3x", "Zero-trust revenue crosses $1B run-rate", "Enterprise customer count up 25%"] },
    ],
  },
  markets: {
    title: "市场 Markets",
    items: [
      { name: "S&P 500", value: 118, sentiment: 0.34, metric: "+0.8%", heat: 0.78, confidence: "confirmed", related: ["Index hits new ATH on tech strength", "Breadth improves with 55% above 50DMA", "Earnings season beats lowered expectations"] },
      { name: "Nasdaq 100", value: 110, sentiment: 0.48, metric: "+1.1%", heat: 0.84, confidence: "confirmed", related: ["Magnificent 7 contribute 70% of gains", "Semiconductor rotation continues", "Options flow skews heavily bullish"] },
      { name: "BTC", value: 92, sentiment: 0.42, metric: "risk bid", heat: 0.75, confidence: "watch", related: ["ETF inflows resume after two-week pause", "On-chain metrics show accumulation", "Halving supply shock still in play"] },
      { name: "Gold", value: 78, sentiment: -0.2, metric: "real yield", heat: 0.62, confidence: "confirmed", related: ["Real yield pressure caps upside", "Central bank buying at record pace", "Geopolitical floor remains intact"] },
      { name: "US 10Y", value: 74, sentiment: -0.34, metric: "4.21%", heat: 0.7, confidence: "confirmed", related: ["Yield pushes through 4.2% resistance", "Fed speakers signal higher-for-longer", "Duration auction demand weakens"] },
      { name: "VIX", value: 64, sentiment: 0.18, metric: "14.8", heat: 0.52, confidence: "confirmed", related: ["Compressed vol regime persists", "Skew term structure inverting", "Hedge demand remains muted"] },
      { name: "USD Index", value: 56, sentiment: -0.16, metric: "soft", heat: 0.47, confidence: "confirmed", related: ["Dollar softens on mixed data", "Carry trades unwind modestly", "EM FX relief rally continues"] },
      { name: "Oil WTI", value: 54, sentiment: 0.2, metric: "supply", heat: 0.46, confidence: "watch", related: ["OPEC+ compliance waivers in focus", "US shale production plateaus", "Red Sea premium adds $2-3/bbl"] },
      { name: "ETH", value: 50, sentiment: 0.3, metric: "flows", heat: 0.44, confidence: "watch", related: ["Staking yields compress to 3.2%", "L2 activity hits new highs", "ETF speculation builds"] },
      { name: "Copper", value: 44, sentiment: 0.24, metric: "demand", heat: 0.4, confidence: "confirmed", related: ["China restocking drives spot premium", "EV demand underpins long-term thesis", "Mine supply disruptions in Chile"] },
      { name: "Japan 10Y", value: 38, sentiment: -0.18, metric: "policy", heat: 0.39, confidence: "watch", related: ["BOJ yield curve control in flux", "Yen weakness pressures import costs", "Carry trade unwind risk elevated"] },
      { name: "China ADR", value: 34, sentiment: 0.16, metric: "rebound", heat: 0.36, confidence: "confirmed", related: ["Policy stimulus signals intensify", "Valuation discount narrows slightly", "Short covering accelerates"] },
    ],
  },
  geo: {
    title: "地缘 Geo",
    items: [
      { name: "Taiwan Strait", value: 112, sentiment: -0.42, metric: "shipping", heat: 0.9, confidence: "watch", related: ["Naval patrol frequency up 15%", "Insurance premiums double for strait transits", "Chip supply contingency plans activated"] },
      { name: "Red Sea", value: 98, sentiment: -0.36, metric: "freight", heat: 0.82, confidence: "confirmed", related: ["Container rates jump 18% on rerouting", "War-risk surcharges reimposed", "Transit times extend 7-10 days"] },
      { name: "EU AI Act", value: 74, sentiment: 0.24, metric: "rules", heat: 0.58, confidence: "confirmed", related: ["Implementation timeline clarified", "Foundation model rules finalized", "Compliance costs estimated at 2-4% of revenue"] },
      { name: "Japan Rates", value: 66, sentiment: -0.2, metric: "yen focus", heat: 0.56, confidence: "confirmed", related: ["BOJ signals gradual normalization", "Yen carry trade unwinds modestly", "JGB yields hit decade highs"] },
      { name: "India Capex", value: 62, sentiment: 0.38, metric: "infra", heat: 0.52, confidence: "confirmed", related: ["Infrastructure spending up 35% YoY", "Manufacturing PLI scheme gains traction", "FDI inflows hit record in Q1"] },
      { name: "US-China Trade", value: 60, sentiment: -0.24, metric: "tariffs", heat: 0.66, confidence: "watch", related: ["New tariff review underway", "Tech export controls tighten", "Supply chain diversification accelerates"] },
      { name: "Middle East Energy", value: 58, sentiment: -0.22, metric: "supply", heat: 0.57, confidence: "confirmed", related: ["OPEC+ compliance waivers in focus", "LNG shipping routes under pressure", "Energy security premiums elevated"] },
      { name: "Korea Chips", value: 52, sentiment: 0.28, metric: "exports", heat: 0.49, confidence: "confirmed", related: ["Semiconductor exports surge 45%", "HBM production ramps at Samsung", "China trade flows normalize"] },
      { name: "Mexico Nearshoring", value: 48, sentiment: 0.3, metric: "FDI", heat: 0.44, confidence: "confirmed", related: ["Industrial vacancy rates at historic lows", "US manufacturing shifts accelerate", "Peso strength attracts more capital"] },
      { name: "EU Industrial", value: 42, sentiment: 0.14, metric: "subsidy", heat: 0.38, confidence: "watch", related: ["Green Deal Industrial Plan launches", "Energy costs remain elevated", "Competitiveness gap with US widens"] },
      { name: "LATAM Lithium", value: 36, sentiment: 0.2, metric: "supply", heat: 0.34, confidence: "watch", related: ["Chile nationalization moves forward", "EV demand underpins long-term thesis", "Price floor forming at $15K/ton"] },
      { name: "ASEAN FX", value: 30, sentiment: -0.12, metric: "dollar", heat: 0.32, confidence: "confirmed", related: ["Dollar strength pressures regional currencies", "Central banks intervene selectively", "Tourism recovery supports current accounts"] },
    ],
  },
};

// ── Signals ──

export type SignalItem = EntityLogoFields & {
  category: "Tech" | "Markets" | "Geo" | "AI";
  source?: string;
  time: string;
  headline: string;
  summary: string;
  sentiment: number;
  body?: string;
  url?: string;
  importance?: number;
  kind?: string;
  status?: string;
};

export const signals: SignalItem[] = [
  { category: "AI", source: "The Verge", logoKey: "the-verge", logoText: "TV", time: "2m", headline: "Model platform pricing turns into the morning read", summary: "Enterprise buyers are comparing latency and governance more than token cost.", sentiment: 0.42, body: "The conversation around AI model pricing has shifted dramatically. Enterprise procurement teams are no longer just comparing per-token costs — they're building scorecards that weight latency percentiles, data residency guarantees, and governance tooling. Three major platform providers adjusted their pricing tiers this week, each trying to lock in multi-year commitments before the next generation of models lands. The real battleground is becoming the inference layer, where throughput guarantees and SLA terms matter more than raw capability benchmarks." },
  { category: "Markets", source: "Bloomberg", logoKey: "bloomberg", logoText: "BB", time: "8m", headline: "Semis pull Nasdaq futures higher before cash open", summary: "Breadth is narrower, but high-activity chip names keep the tape firm.", sentiment: 0.31, body: "Nasdaq futures are pointing higher ahead of the cash open, driven almost entirely by semiconductor strength. NVIDIA, AMD, and Broadcom are contributing 60% of the index's pre-market gains. Market breadth remains a concern — only 38% of Nasdaq constituents are trading above their 50-day moving averages. Derivatives desks note that single-stock options volume in chip names is running 2x the 20-day average, suggesting institutional positioning rather than retail speculation." },
  { category: "Geo", source: "Reuters", logoKey: "reuters", logoText: "R", time: "16m", headline: "Freight desks flag renewed Red Sea premium", summary: "Shipping risk is feeding into energy and insurance watchlists.", sentiment: -0.34, body: "Container freight rates on the Asia-Europe corridor jumped 18% this week as shipping companies reroute around the Cape of Good Hope. The Red Sea risk premium, which had been easing through May, has re-emerged after two incidents involving commercial vessels. Insurance underwriters are reassessing war-risk surcharges, and energy traders are pricing in a $2-3/barrel risk premium on crude shipments. Logistics desks expect the disruption to add 7-10 days to transit times through Q3." },
  { category: "Tech", source: "Hacker News", logoKey: "hacker-news", logoText: "HN", time: "24m", headline: "HBM supply checks stay tight into next quarter", summary: "Memory and packaging names remain the strongest upstream read-through.", sentiment: 0.48, body: "High Bandwidth Memory supply remains constrained through Q3, according to multiple channel checks. SK Hynix and Samsung are running at near-full utilization for HBM3E, with lead times extending to 16-20 weeks. The bottleneck is increasingly in advanced packaging — CoWoS capacity from TSMC is the gating factor. NVIDIA's allocation requests for HBM3E exceed current supply by roughly 30%, creating a favorable pricing environment for memory suppliers through year-end." },
  { category: "Markets", source: "Financial Times", logoKey: "financial-times", logoText: "FT", time: "31m", headline: "Gold slips as real-yield chatter firms", summary: "Macro desks are treating the move as positioning, not a risk-off break.", sentiment: -0.2, body: "Gold is down 0.8% in early London trading as real-yield commentary from Fed speakers pushes Treasury yields higher. The move is being characterized as positioning-driven rather than a fundamental shift — ETF outflows remain minimal and central bank buying continues at a steady pace. Macro desks note that gold's correlation with real yields has weakened this quarter, suggesting the metal is finding support from geopolitical hedging demand even as rate expectations fluctuate." },
  { category: "Geo", source: "Nikkei Asia", logoKey: "nikkei", logoText: "N", time: "44m", headline: "Taiwan Strait insurance mentions rise in Asia notes", summary: "No single trigger, but references are clustered across logistics notes.", sentiment: -0.45, body: "References to Taiwan Strait risk insurance have increased across sell-side Asia morning notes this week. While no single incident triggered the uptick, the clustering of mentions across logistics, shipping, and defense research is notable. Marine insurance brokers report a modest increase in inquiry volume for strait transits. The pattern resembles early 2022 buildup language, though current military activity levels remain within normal parameters. Analysts are watching for any change in naval patrol frequency as a leading indicator." },
  { category: "AI", source: "TechCrunch", logoKey: "techcrunch", logoText: "TC", time: "58m", headline: "Agent workflow demos move from novelty to procurement", summary: "The winning screenshots are now audit trails, permissions and handoffs.", sentiment: 0.36, body: "Enterprise AI agent demonstrations have evolved from flashy capability showcases to compliance-focused walkthroughs. The demos that are winning procurement decisions now feature detailed audit trails, granular permission systems, and human-in-the-loop handoff workflows. Three Fortune 500 companies announced pilot programs this week, each emphasizing governance and observability as primary selection criteria. The shift signals that agent technology is crossing the chasm from early adopter experimentation to mainstream enterprise deployment." },
  { category: "Tech", source: "The Verge", logoKey: "the-verge", logoText: "TV", time: "1h", headline: "Apple supply-chain checks remain mixed", summary: "Services strength offsets hardware tone, but device commentary is muted.", sentiment: -0.16, body: "Apple supply-chain data presents a mixed picture entering the second half. Services revenue momentum remains strong, with App Store and Apple Music metrics tracking above consensus. However, hardware commentary from component suppliers is muted — iPhone order revisions are flat to slightly down, and iPad/Mac volumes are tracking below seasonal norms. The wearables category shows the most divergence, with AirPods production cuts offset by Apple Watch Series 10 strength. Analysts are maintaining estimates but flagging downside risk to unit volumes." },
];

// ── RSS Feeds ──

export type FeedItem = EntityLogoFields & {
  title: string;
  time: string;
  source: string;
  favicon: string;
  body?: string;
  url?: string;
  sentiment?: number;
};

export type FeedGroup = {
  id: string;
  label: string;
  items: FeedItem[];
};

export const feeds: FeedGroup[] = [
  {
    id: "hn",
    label: "Hacker News",
    items: [
      { favicon: "HN", source: "HN", title: "SQLite on the edge: practical lessons from local-first tools", time: "12m", body: "After running SQLite in production at the edge for 18 months, here are the lessons that matter. The biggest surprise wasn't performance — it was the operational simplicity. No connection pools, no query planners to tune, no failover to manage. The real challenges were around schema migrations in a distributed setting and handling the 2GB file size limit when your dataset grows. We solved migrations with a custom versioning system that applies changes lazily on first access.", url: "https://news.ycombinator.com/item?id=1" },
      { favicon: "HN", source: "HN", title: "Show HN: A small browser for monitoring research feeds", time: "24m", body: "I built a lightweight browser specifically for monitoring research feeds and dashboards. It's essentially a Chromium wrapper with built-in auto-refresh, screenshot diffing, and alert rules. The key insight was that most monitoring dashboards don't need interactivity — they need reliable, low-overhead rendering. The app uses 80% less memory than a regular Chrome tab and can manage 50+ dashboard views simultaneously.", url: "https://news.ycombinator.com/item?id=2" },
      { favicon: "HN", source: "HN", title: "Why GPU memory bandwidth is the bottleneck everyone measures now", time: "41m", body: "The shift from compute-bound to memory-bound workloads in AI inference has made GPU memory bandwidth the new currency. NVIDIA's H100 achieves 3.35 TB/s of HBM3 bandwidth, but even that isn't enough for large language models at scale. The industry is responding with HBM3E (5+ TB/s), chiplet architectures, and near-memory computing. For practitioners, this means your inference optimization strategy should focus on memory access patterns first, compute second.", url: "https://news.ycombinator.com/item?id=3" },
      { favicon: "HN", source: "HN", title: "An engineer's guide to resilient RSS pipelines", time: "1h", body: "Building a production RSS pipeline that doesn't break every time a feed changes format requires more engineering than most people expect. The core challenges are: handling malformed XML gracefully, deduplicating across feeds with different update frequencies, and managing backpressure when a popular source publishes a burst. Our architecture uses a three-stage pipeline: fetch (with retry and rate limiting), normalize (to a common schema), and distribute (with dead-letter queues for failed items).", url: "https://news.ycombinator.com/item?id=4" },
      { favicon: "HN", source: "HN", title: "Parsing market-moving headlines without losing provenance", time: "2h", body: "Financial headline parsing is a unique NLP challenge because speed and accuracy are both critical. A misclassified headline can trigger incorrect trading signals. Our approach combines rule-based pattern matching for known headline structures with a fine-tuned transformer for novel formats. The key architectural decision was maintaining full provenance — every parsed entity links back to the exact character offsets in the original headline, making audit and correction straightforward.", url: "https://news.ycombinator.com/item?id=5" },
    ],
  },
  {
    id: "sspai",
    label: "少数派",
    items: [
      { favicon: "少", source: "少数派", title: "把碎片信息整理成每日可读的个人情报流", time: "18m", body: "每天早上打开 5 个 app 刷信息，不如把它们聚合成一条流。我用 RSS + 快捷指令 + Notion 搭了一套系统：RSS 订阅关键信息源，快捷指令每天定时拉取摘要，Notion 做二次筛选和归档。关键设计是每天只生成一份「情报简报」，不超过 20 条，超过的自动归档不读。" },
      { favicon: "少", source: "少数派", title: "桌面端仪表盘的密度、字号和信息层级", time: "36m", body: "仪表盘设计的核心矛盾是：信息密度 vs 可读性。我的经验法则是三级层次——一级信息（标题、核心数字）用 14-16px，二级信息（辅助指标、标签）用 11-12px，三级信息（时间戳、来源）用 10px。间距用 8px 网格，卡片间距 12-16px。暗色背景下，边框比背景更重要，用 rgba(255,255,255,0.08) 就够了。" },
      { favicon: "少", source: "少数派", title: "用快捷指令和 RSS 打造低打扰信息入口", time: "1h", body: "信息过载的解法不是减少信息源，而是改变信息到达你的方式。我用 iOS 快捷指令做了一个「信息晨检」：每天 8 点自动运行，从 12 个 RSS 源拉取过去 24 小时的内容，用 AI 做一次筛选，只推送 5 条最值得读的。推送方式是写入一个专用的 Reminders 列表，不弹通知，打开手机自然看到。" },
      { favicon: "少", source: "少数派", title: "高对比暗色界面里，边框比背景更重要", time: "2h" },
      { favicon: "少", source: "少数派", title: "从标签页到工作台：浏览器里的长期主义", time: "3h" },
    ],
  },
  {
    id: "verge",
    label: "The Verge",
    items: [
      { favicon: "TV", source: "Verge", title: "AI laptops are turning benchmark claims into a software story", time: "9m", body: "The latest wave of AI laptops from Dell, HP, and Lenovo all share one thing: their biggest selling points are software features, not hardware specs. Local AI inference for photo editing, real-time transcription, and smart summarization are the headline capabilities. But the benchmark numbers that matter most — how fast these features actually run — vary wildly depending on driver versions and software optimization. The hardware is ready; the software is still catching up." },
      { favicon: "TV", source: "Verge", title: "The next browser wars are about agents, not bookmarks", time: "27m", body: "Chrome, Arc, and a handful of startups are racing to build browsers that don't just display web pages — they act on them. The new battleground is agent integration: AI that can fill forms, navigate multi-step workflows, and extract structured data from any page. Arc's approach is to make the browser a programmable surface; Chrome is betting on Gemini integration. The stakes are high because whoever controls the agent layer controls the user's intent graph." },
      { favicon: "TV", source: "Verge", title: "How chip supply chains shape the consumer tech calendar", time: "52m" },
      { favicon: "TV", source: "Verge", title: "Streaming platforms are rethinking the live-news bundle", time: "1h" },
      { favicon: "TV", source: "Verge", title: "A quieter, denser desktop is back in fashion", time: "2h" },
    ],
  },
];

// ── Watchlist ──

export type WatchlistItem = EntityLogoFields & {
  ticker: string;
  name: string;
  price: string;
  changePct: number;
  sparkline: number[];
  prevClose?: string;
  dayRange?: string;
  weekRange52?: string;
  volume?: string;
};

export const watchlist: WatchlistItem[] = [
  { ticker: "BILI", name: "哔哩哔哩", logoKey: "bili", logoText: "B", price: "18.42", changePct: 2.84, sparkline: [17.9, 18.0, 17.86, 18.2, 18.15, 18.36, 18.42], prevClose: "17.91", dayRange: "17.86 – 18.52", weekRange52: "12.30 – 22.40", volume: "6.2M" },
  { ticker: "0700", name: "腾讯控股", logoKey: "tencent", logoText: "700", price: "392.80", changePct: 1.16, sparkline: [386, 388.2, 387.7, 390.1, 389.6, 391.8, 392.8], prevClose: "388.30", dayRange: "387.20 – 394.00", weekRange52: "298.00 – 428.00", volume: "18.4M" },
  { ticker: "TSLA", name: "Tesla", logoKey: "tesla", logoText: "T", price: "342.11", changePct: -1.38, sparkline: [349.6, 347.1, 346.4, 344.8, 345.2, 343.0, 342.1], prevClose: "346.88", dayRange: "340.20 – 349.60", weekRange52: "138.80 – 365.20", volume: "82.1M" },
  { ticker: "MSFT", name: "Microsoft", logoKey: "microsoft", logoText: "MS", price: "486.70", changePct: 0.72, sparkline: [482.6, 483.8, 481.9, 484.2, 485.1, 485.7, 486.7], prevClose: "483.22", dayRange: "481.90 – 488.50", weekRange52: "388.40 – 505.80", volume: "14.6M" },
  { ticker: "AAPL", name: "Apple", logoKey: "apple", logoText: "A", price: "212.88", changePct: -0.44, sparkline: [214.1, 213.8, 213.2, 212.7, 213.0, 212.4, 212.9], prevClose: "213.82", dayRange: "211.60 – 214.40", weekRange52: "164.08 – 237.50", volume: "42.3M" },
  { ticker: "NVDA", name: "Nvidia", logoKey: "nvidia", logoText: "NV", price: "184.26", changePct: 3.92, sparkline: [176.8, 178.1, 179.6, 181.9, 180.8, 183.0, 184.3], prevClose: "177.30", dayRange: "178.10 – 185.40", weekRange52: "75.60 – 192.80", volume: "312.5M" },
  { ticker: "9988", name: "阿里巴巴", logoKey: "alibaba", logoText: "9988", price: "91.65", changePct: 1.58, sparkline: [89.8, 90.1, 90.6, 90.2, 91.0, 91.4, 91.7], prevClose: "90.22", dayRange: "89.80 – 92.30", weekRange52: "66.80 – 118.40", volume: "24.8M" },
];

// ── Sentiment Trend ──

export type SentimentPoint = {
  time: string;
  idx: number;
};

const today = new Date().toISOString().slice(0, 10);
const dayMs = 86400000;
const baseTs = new Date().getTime();
const dayStr = (offset: number) => new Date(baseTs + dayMs * offset).toISOString().slice(0, 10);
export const sentimentTrend: SentimentPoint[] = [
  { time: today, idx: 0.38 },
  { time: dayStr(1), idx: 0.44 },
  { time: dayStr(2), idx: 0.40 },
  { time: dayStr(3), idx: 0.51 },
  { time: dayStr(4), idx: 0.55 },
  { time: dayStr(5), idx: 0.47 },
  { time: dayStr(6), idx: 0.59 },
  { time: dayStr(7), idx: 0.62 },
];
