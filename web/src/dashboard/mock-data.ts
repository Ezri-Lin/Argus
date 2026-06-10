/**
 * Mock data for all widget types.
 * Fallback when API data is unavailable. Members match watchlist.json.
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
      { name: "NVIDIA", value: 132, sentiment: 0.72, metric: "HBM +18%", heat: 0.96, confidence: "confirmed", headline: "Blackwell Ultra enters mass production, HBM3E supply stays tight into Q3",
        related: [
          { title: "Blackwell Ultra GPU enters mass production with 2x inference throughput", outlet: "Reuters", time: "2h", importance: 0.85, kind: "official" },
          { title: "Data center revenue hits new record on AI infrastructure demand", outlet: "Bloomberg", time: "6h", importance: 0.78, kind: "转载" },
          { title: "Rubin next-gen AI platform announced with 8x training throughput", outlet: "NVIDIA Blog", time: "1d", importance: 0.82, kind: "official" },
        ] },
      { name: "OpenAI", value: 96, sentiment: 0.58, metric: "GPT-5", heat: 0.88, confidence: "watch", headline: "GPT-5 with breakthrough reasoning and native tool use released",
        related: [
          { title: "GPT-5 achieves near-human performance on complex multi-step reasoning", outlet: "TechCrunch", time: "4h", importance: 0.9, kind: "official" },
          { title: "$40B funding round at $300B valuation completed", outlet: "Financial Times", time: "1d", importance: 0.75, kind: "转载" },
          { title: "Partnership renegotiation with Microsoft ahead of for-profit conversion", outlet: "The Information", time: "3d", importance: 0.65, kind: "转载" },
        ] },
      { name: "Microsoft", value: 88, sentiment: 0.28, metric: "Azure AI", heat: 0.68, confidence: "confirmed", headline: "Market cap crosses $4 trillion as Azure AI revenue grows 60% YoY",
        related: [
          { title: "Market cap crosses $4 trillion on Azure AI growth", outlet: "CNBC", time: "3h", importance: 0.75, kind: "转载" },
          { title: "Copilot Studio enables enterprise multi-agent workflows", outlet: "Microsoft Blog", time: "8h", importance: 0.7, kind: "official" },
          { title: "Azure AI revenue grows 60% YoY, Copilot exceeds 10M seats", outlet: "Bloomberg", time: "1d", importance: 0.72, kind: "转载" },
        ] },
      { name: "Google", value: 85, sentiment: 0.45, metric: "Gemini", heat: 0.82, confidence: "confirmed", headline: "Gemini 2.5 Ultra with native agentic capabilities unveiled",
        related: [
          { title: "Gemini 2.5 Ultra with agentic capabilities and native tool use", outlet: "Google Blog", time: "5h", importance: 0.8, kind: "official" },
          { title: "DeepMind research breakthroughs in protein folding and materials science", outlet: "Nature", time: "2d", importance: 0.65, kind: "转载" },
          { title: "Google Ads introduces AI-powered campaign optimization by default", outlet: "Marketing Week", time: "3d", importance: 0.55, kind: "official" },
        ] },
      { name: "Apple", value: 76, sentiment: -0.12, metric: "M5 chip", heat: 0.61, confidence: "confirmed", headline: "M5 chip with dedicated AI acceleration cores unveiled at WWDC",
        related: [
          { title: "M5 chip with dedicated AI acceleration cores at WWDC", outlet: "The Verge", time: "6h", importance: 0.75, kind: "official" },
          { title: "Services revenue hits all-time high, offsetting hardware softness", outlet: "Bloomberg", time: "1d", importance: 0.6, kind: "转载" },
          { title: "Machine learning research advances in on-device inference", outlet: "Apple ML Research", time: "4d", importance: 0.5, kind: "official" },
        ] },
      { name: "Meta", value: 68, sentiment: 0.35, metric: "Llama 4", heat: 0.72, confidence: "watch", headline: "Llama 4 400B open-source model released, AI capex raised to $40B",
        related: [
          { title: "Llama 4 400B parameter open-source model released under permissive license", outlet: "Meta AI Blog", time: "8h", importance: 0.75, kind: "official" },
          { title: "Advantage+ AI campaigns now drive 40% of total ad revenue", outlet: "Bloomberg", time: "1d", importance: 0.6, kind: "转载" },
          { title: "AI infrastructure spend raised to $40B for training and deployment", outlet: "Reuters", time: "2d", importance: 0.65, kind: "转载" },
        ] },
      { name: "Amazon", value: 82, sentiment: 0.42, metric: "AWS $110B", heat: 0.78, confidence: "confirmed", headline: "AWS revenue surpasses $110B annual run rate on AI demand",
        related: [
          { title: "AWS revenue surpasses $110B annual run rate", outlet: "CNBC", time: "4h", importance: 0.72, kind: "转载" },
          { title: "Amazon Ads launches AI-generated product video ads at scale", outlet: "TechCrunch", time: "1d", importance: 0.55, kind: "official" },
          { title: "Cloud revenue grows on surging AI model hosting demand", outlet: "Bloomberg", time: "2d", importance: 0.6, kind: "转载" },
        ] },
      { name: "TSMC", value: 75, sentiment: 0.46, metric: "2nm", heat: 0.82, confidence: "confirmed", headline: "2nm mass production ahead of schedule, Arizona fab on track for 2026",
        related: [
          { title: "2nm mass production timeline confirmed ahead of schedule", outlet: "Nikkei Asia", time: "5h", importance: 0.7, kind: "转载" },
          { title: "Arizona fab on track for 2026 production despite supply chain challenges", outlet: "Reuters", time: "1d", importance: 0.65, kind: "转载" },
          { title: "Capex guidance raised to $38B to meet advanced packaging demand", outlet: "Bloomberg", time: "3d", importance: 0.6, kind: "转载" },
        ] },
      { name: "Tesla", value: 70, sentiment: 0.38, metric: "FSD v13", heat: 0.74, confidence: "watch", headline: "FSD v13 achieves Level 4 certification, robotaxi launches in Austin",
        related: [
          { title: "FSD v13 achieves Level 4 autonomous driving certification in California", outlet: "TechCrunch", time: "7h", importance: 0.7, kind: "official" },
          { title: "Robotaxi service launches in Austin, 10,000 rides in first week", outlet: "Bloomberg", time: "1d", importance: 0.65, kind: "official" },
          { title: "BYD surpasses Tesla in global EV sales for Q1 2026", outlet: "Reuters", time: "3d", importance: 0.55, kind: "转载" },
        ] },
      { name: "Samsung", value: 62, sentiment: 0.22, metric: "2nm GAA", heat: 0.58, confidence: "confirmed", headline: "2nm GAA process node announced for 2026 volume production",
        related: [
          { title: "2nm GAA process node announced for 2026 volume production", outlet: "Samsung Newsroom", time: "1d", importance: 0.6, kind: "official" },
          { title: "HBM3E yield improvements ahead of NVIDIA qualification", outlet: "Nikkei Asia", time: "3d", importance: 0.55, kind: "转载" },
          { title: "Samsung and SK Hynix secure $15B US CHIPS Act subsidies", outlet: "Reuters", time: "5d", importance: 0.6, kind: "转载" },
        ] },
      { name: "DeepSeek", value: 58, sentiment: 0.55, metric: "V3", heat: 0.7, confidence: "watch", headline: "DeepSeek-V3 tops open-source benchmarks, narrows gap with frontier models",
        related: [
          { title: "DeepSeek-V3 tops open-source benchmarks, narrows gap with frontier models", outlet: "Hacker News", time: "2h", importance: 0.7, kind: "转载" },
          { title: "$15B valuation after Series B, largest AI startup round in China", outlet: "The Information", time: "2d", importance: 0.65, kind: "转载" },
          { title: "Open-source approach validates cost-efficient frontier model training", outlet: "arXiv", time: "4d", importance: 0.55, kind: "analysis" },
        ] },
      { name: "BYD", value: 55, sentiment: 0.32, metric: "EV sales", heat: 0.62, confidence: "confirmed", headline: "BYD surpasses Tesla in global EV sales for Q1 2026",
        related: [
          { title: "BYD surpasses Tesla in global EV sales for Q1 2026", outlet: "Reuters", time: "6h", importance: 0.65, kind: "转载" },
          { title: "Enters Japanese market with Dolphin Mini, targets 50K annual sales", outlet: "Nikkei Asia", time: "2d", importance: 0.55, kind: "official" },
          { title: "Expands into Southeast Asia with new Thailand factory", outlet: "Bloomberg", time: "5d", importance: 0.5, kind: "转载" },
        ] },
    ],
  },
  markets: {
    title: "市场 Markets",
    items: [
      { name: "S&P 500", value: 118, sentiment: 0.34, metric: "5,842", heat: 0.78, confidence: "confirmed", headline: "Hits new all-time high at 5,800 on tech earnings strength",
        related: [
          { title: "Index hits new ATH at 5,800 on tech strength", outlet: "Bloomberg", time: "1h", importance: 0.85, kind: "转载" },
          { title: "Earnings season beats lowered expectations across sectors", outlet: "CNBC", time: "4h", importance: 0.7, kind: "转载" },
          { title: "Breadth improves with 55% of constituents above 50DMA", outlet: "Financial Times", time: "8h", importance: 0.6, kind: "analysis" },
        ] },
      { name: "Nasdaq", value: 110, sentiment: 0.48, metric: "20,000", heat: 0.84, confidence: "confirmed", headline: "Crosses 20,000 for first time on AI semiconductor rally",
        related: [
          { title: "Nasdaq Composite crosses 20,000 for first time in history", outlet: "CNBC", time: "2h", importance: 0.8, kind: "转载" },
          { title: "Magnificent 7 contribute 70% of index gains", outlet: "Bloomberg", time: "5h", importance: 0.72, kind: "analysis" },
          { title: "Semiconductor rotation continues with options volume 2x average", outlet: "Financial Times", time: "1d", importance: 0.65, kind: "转载" },
        ] },
      { name: "Bitcoin", value: 92, sentiment: 0.52, metric: "$120K", heat: 0.75, confidence: "watch", headline: "Breaks above $120K on record spot ETF inflows",
        related: [
          { title: "Bitcoin breaks above $120K as spot ETF inflows accelerate", outlet: "CoinDesk", time: "3h", importance: 0.75, kind: "转载" },
          { title: "Record $2.5B weekly inflow into spot Bitcoin ETFs", outlet: "Bloomberg", time: "8h", importance: 0.7, kind: "转载" },
          { title: "Institutional adoption accelerates with corporate treasury purchases", outlet: "Financial Times", time: "1d", importance: 0.6, kind: "转载" },
        ] },
      { name: "Gold", value: 78, sentiment: 0.18, metric: "$3,200", heat: 0.62, confidence: "confirmed", headline: "Surges past $3,200 on geopolitical tensions and rate cut expectations",
        related: [
          { title: "Gold surges past $3,200 amid geopolitical tensions", outlet: "Reuters", time: "4h", importance: 0.6, kind: "转载" },
          { title: "Central bank buying at record pace supports floor", outlet: "World Gold Council", time: "1d", importance: 0.55, kind: "official" },
          { title: "Rate cut expectations provide additional tailwind", outlet: "Bloomberg", time: "2d", importance: 0.5, kind: "analysis" },
        ] },
      { name: "Ethereum", value: 65, sentiment: 0.32, metric: "Pectra", heat: 0.58, confidence: "watch", headline: "Pectra upgrade live, BlackRock tokenized fund reaches $10B AUM",
        related: [
          { title: "Pectra upgrade enables account abstraction and blob scaling", outlet: "Ethereum Blog", time: "6h", importance: 0.6, kind: "official" },
          { title: "BlackRock tokenized Treasury fund on ETH hits $10B AUM", outlet: "Bloomberg", time: "1d", importance: 0.65, kind: "转载" },
          { title: "L2 activity hits new highs with rollup adoption", outlet: "The Block", time: "3d", importance: 0.5, kind: "转载" },
        ] },
      { name: "JPMorgan", value: 72, sentiment: 0.38, metric: "Q1 beat", heat: 0.68, confidence: "confirmed", headline: "Record Q1 trading revenue driven by AI infrastructure demand",
        related: [
          { title: "Record Q1 trading revenue driven by AI infrastructure demand", outlet: "CNBC", time: "5h", importance: 0.7, kind: "official" },
          { title: "AI infrastructure demand drives growth across banking divisions", outlet: "Bloomberg", time: "1d", importance: 0.6, kind: "转载" },
          { title: "Launches $5B AI-focused venture capital fund", outlet: "Financial Times", time: "3d", importance: 0.55, kind: "official" },
        ] },
      { name: "Goldman Sachs", value: 64, sentiment: 0.3, metric: "SPX 6500", heat: 0.55, confidence: "confirmed", headline: "Raises S&P 500 year-end target to 6,500",
        related: [
          { title: "Raises S&P 500 year-end target to 6,500", outlet: "Goldman Sachs", time: "1d", importance: 0.65, kind: "official" },
          { title: "Trading revenue beats consensus on fixed-income strength", outlet: "Bloomberg", time: "3d", importance: 0.55, kind: "转载" },
          { title: "AI investment banking deals surge as tech IPO pipeline builds", outlet: "Financial Times", time: "5d", importance: 0.5, kind: "转载" },
        ] },
      { name: "BlackRock", value: 58, sentiment: 0.28, metric: "$12B fund", heat: 0.52, confidence: "confirmed", headline: "Raises $12B AI infrastructure fund, tokenized Treasury hits $10B",
        related: [
          { title: "Raises $12B new infrastructure fund targeting AI data centers", outlet: "Bloomberg", time: "1d", importance: 0.6, kind: "转载" },
          { title: "Tokenized Treasury fund on Ethereum reaches $10B AUM milestone", outlet: "Financial Times", time: "3d", importance: 0.55, kind: "official" },
          { title: "Bitcoin ETF market leader with largest AUM", outlet: "CoinDesk", time: "5d", importance: 0.5, kind: "转载" },
        ] },
      { name: "Federal Reserve", value: 80, sentiment: 0.15, metric: "rates", heat: 0.72, confidence: "confirmed", headline: "Holds rates steady, signals potential September cut",
        related: [
          { title: "Federal Reserve holds rates steady, signals September cut", outlet: "CNBC", time: "2h", importance: 0.8, kind: "official" },
          { title: "Inflation data meets expectations, labor market cooling", outlet: "Reuters", time: "6h", importance: 0.7, kind: "转载" },
          { title: "Markets rally on dovish tone, S&P 500 hits new ATH", outlet: "Bloomberg", time: "8h", importance: 0.65, kind: "转载" },
        ] },
      { name: "Oil WTI", value: 54, sentiment: -0.2, metric: "$68", heat: 0.46, confidence: "watch", headline: "Drops to $68 as OPEC+ increases production quotas",
        related: [
          { title: "Oil WTI drops to $68 as OPEC+ increases production quotas", outlet: "Reuters", time: "5h", importance: 0.55, kind: "转载" },
          { title: "US shale production plateaus as rig count stabilizes", outlet: "Bloomberg", time: "2d", importance: 0.45, kind: "analysis" },
          { title: "Red Sea premium eases as Houthi attacks decline", outlet: "Financial Times", time: "4d", importance: 0.4, kind: "转载" },
        ] },
      { name: "Solana", value: 45, sentiment: 0.35, metric: "100M tx", heat: 0.48, confidence: "watch", headline: "Processes 100M daily transactions, surpasses all L2s combined",
        related: [
          { title: "Solana processes 100M daily transactions, surpasses all L2s combined", outlet: "The Block", time: "3h", importance: 0.55, kind: "转载" },
          { title: "DeFi TVL growth accelerates with new protocol launches", outlet: "DefiLlama", time: "1d", importance: 0.45, kind: "转载" },
          { title: "Network uptime maintained through high-throughput period", outlet: "Solana Blog", time: "3d", importance: 0.4, kind: "official" },
        ] },
    ],
  },
  geo: {
    title: "地缘 Geo",
    items: [
      { name: "Taiwan Strait", value: 112, sentiment: -0.38, metric: "shipping", heat: 0.88, confidence: "watch", headline: "TSMC Arizona fab on track despite elevated cross-strait tensions",
        related: [
          { title: "TSMC Arizona fab on track for 2026 production despite tensions", outlet: "Nikkei Asia", time: "4h", importance: 0.7, kind: "转载" },
          { title: "Naval patrol frequency elevated, insurance premiums rise", outlet: "Reuters", time: "1d", importance: 0.65, kind: "转载" },
          { title: "Chip supply contingency plans activated by major OEMs", outlet: "Bloomberg", time: "3d", importance: 0.6, kind: "analysis" },
        ] },
      { name: "US-China Trade", value: 95, sentiment: -0.22, metric: "tariffs", heat: 0.78, confidence: "watch", headline: "Preliminary semiconductor export agreement reached",
        related: [
          { title: "US and China reach preliminary agreement on semiconductor export controls", outlet: "Reuters", time: "6h", importance: 0.75, kind: "转载" },
          { title: "Tech export controls tighten on leading-edge AI chips", outlet: "Financial Times", time: "1d", importance: 0.65, kind: "转载" },
          { title: "Supply chain diversification accelerates to Mexico and SE Asia", outlet: "Nikkei Asia", time: "3d", importance: 0.55, kind: "analysis" },
        ] },
      { name: "EU AI Act", value: 74, sentiment: 0.18, metric: "Phase 2", heat: 0.58, confidence: "confirmed", headline: "Phase 2 enforcement begins with mandatory compliance for high-risk AI",
        related: [
          { title: "EU AI Act Phase 2 enforcement begins for high-risk AI systems", outlet: "Reuters", time: "8h", importance: 0.65, kind: "official" },
          { title: "Foundation model rules finalized with transparency requirements", outlet: "EU Commission", time: "1d", importance: 0.6, kind: "official" },
          { title: "Compliance costs estimated at 2-4% of revenue for affected companies", outlet: "Financial Times", time: "2d", importance: 0.55, kind: "analysis" },
        ] },
      { name: "Red Sea", value: 88, sentiment: -0.3, metric: "freight", heat: 0.72, confidence: "confirmed", headline: "Houthi attacks decline 60% but shipping disruptions persist",
        related: [
          { title: "Houthi attacks decline 60% but shipping disruptions persist", outlet: "Reuters", time: "3h", importance: 0.6, kind: "转载" },
          { title: "Container rates ease but remain elevated above pre-crisis levels", outlet: "Bloomberg", time: "1d", importance: 0.55, kind: "转载" },
          { title: "Transit times still extended 5-7 days via Cape of Good Hope", outlet: "Financial Times", time: "2d", importance: 0.5, kind: "转载" },
        ] },
      { name: "India Capex", value: 62, sentiment: 0.38, metric: "$150B", heat: 0.52, confidence: "confirmed", headline: "$150B infrastructure stimulus targeting semiconductor fabs announced",
        related: [
          { title: "$150B infrastructure stimulus announced targeting semiconductor fabs", outlet: "Reuters", time: "1d", importance: 0.6, kind: "转载" },
          { title: "Semiconductor fab subsidies expand under PLI scheme", outlet: "Economic Times", time: "3d", importance: 0.5, kind: "official" },
          { title: "FDI inflows hit record in Q1 as manufacturing shifts accelerate", outlet: "Bloomberg", time: "5d", importance: 0.55, kind: "转载" },
        ] },
      { name: "Middle East Energy", value: 58, sentiment: -0.18, metric: "supply", heat: 0.57, confidence: "confirmed", headline: "Saudi Arabia accelerates Vision 2030 with $100B AI investment",
        related: [
          { title: "Saudi Arabia accelerates Vision 2030 with $100B AI and tech investment", outlet: "Reuters", time: "1d", importance: 0.6, kind: "转载" },
          { title: "OPEC+ production quotas increase as demand outlook improves", outlet: "Bloomberg", time: "3d", importance: 0.55, kind: "转载" },
          { title: "LNG shipping routes under pressure from regional tensions", outlet: "Financial Times", time: "5d", importance: 0.5, kind: "转载" },
        ] },
      { name: "Korea Chips", value: 52, sentiment: 0.28, metric: "exports", heat: 0.49, confidence: "confirmed", headline: "Samsung and SK Hynix secure $15B US CHIPS Act subsidies",
        related: [
          { title: "Samsung and SK Hynix secure $15B US CHIPS Act subsidies for advanced packaging", outlet: "Reuters", time: "1d", importance: 0.6, kind: "转载" },
          { title: "Semiconductor exports surge 45% on global AI chip demand", outlet: "Nikkei Asia", time: "3d", importance: 0.55, kind: "转载" },
          { title: "HBM production ramps at Samsung to meet NVIDIA demand", outlet: "Bloomberg", time: "5d", importance: 0.5, kind: "转载" },
        ] },
      { name: "Mexico Nearshoring", value: 48, sentiment: 0.3, metric: "$35B FDI", heat: 0.44, confidence: "confirmed", headline: "Nearshoring investment hits $35B as US firms diversify from China",
        related: [
          { title: "Mexico nearshoring investment hits $35B as US firms diversify from China", outlet: "Bloomberg", time: "1d", importance: 0.55, kind: "转载" },
          { title: "Industrial vacancy rates at historic lows in Monterrey and Juarez", outlet: "Reuters", time: "3d", importance: 0.5, kind: "转载" },
          { title: "US manufacturing shifts accelerate amid tariff uncertainty", outlet: "Financial Times", time: "5d", importance: 0.45, kind: "analysis" },
        ] },
      { name: "Federal Reserve", value: 78, sentiment: 0.2, metric: "rates", heat: 0.68, confidence: "confirmed", headline: "Signals potential September rate cut, markets rally on dovish tone",
        related: [
          { title: "Federal Reserve signals potential rate cut in September", outlet: "CNBC", time: "2h", importance: 0.8, kind: "official" },
          { title: "Holds rates steady as inflation data meets expectations", outlet: "Reuters", time: "6h", importance: 0.7, kind: "official" },
          { title: "Dovish tone drives market rally, Treasury yields fall", outlet: "Bloomberg", time: "8h", importance: 0.65, kind: "转载" },
        ] },
    ],
  },
  ai: {
    title: "AI 大模型",
    items: [
      { name: "NVIDIA", value: 130, sentiment: 0.7, metric: "Rubin", heat: 0.95, confidence: "confirmed", headline: "Rubin next-gen AI platform announced with 8x training throughput",
        related: [
          { title: "Rubin next-gen AI platform announced with 8x training throughput", outlet: "NVIDIA Blog", time: "1d", importance: 0.85, kind: "official" },
          { title: "HBM3E supply stays tight, allocation requests exceed supply by 30%", outlet: "Nikkei Asia", time: "3d", importance: 0.7, kind: "转载" },
          { title: "CoWoS advanced packaging capacity remains the gating factor", outlet: "Reuters", time: "5d", importance: 0.6, kind: "转载" },
        ] },
      { name: "OpenAI", value: 98, sentiment: 0.62, metric: "GPT-5", heat: 0.92, confidence: "watch", headline: "GPT-5 with breakthrough reasoning and native tool use released",
        related: [
          { title: "GPT-5 achieves near-human performance on complex reasoning", outlet: "TechCrunch", time: "4h", importance: 0.9, kind: "official" },
          { title: "Native tool use eliminates external function-calling wrappers", outlet: "The Verge", time: "8h", importance: 0.7, kind: "official" },
          { title: "$40B funding round at $300B valuation completed", outlet: "Financial Times", time: "1d", importance: 0.75, kind: "转载" },
        ] },
      { name: "Anthropic", value: 82, sentiment: 0.55, metric: "Opus 4.6", heat: 0.85, confidence: "watch", headline: "Claude Opus 4.6 with 1M context window pushes frontier on coding",
        related: [
          { title: "Claude Opus 4.6 with 1M token context window launched", outlet: "Anthropic Blog", time: "6h", importance: 0.85, kind: "official" },
          { title: "$60B valuation, annualized revenue hits $4B", outlet: "Bloomberg", time: "2d", importance: 0.7, kind: "转载" },
          { title: "Particular strength in multi-file code refactoring and agentic workflows", outlet: "VentureBeat", time: "3d", importance: 0.6, kind: "analysis" },
        ] },
      { name: "Google", value: 86, sentiment: 0.48, metric: "Gemini 2.5", heat: 0.82, confidence: "confirmed", headline: "Gemini 2.5 Ultra with native agentic capabilities unveiled",
        related: [
          { title: "Gemini 2.5 Ultra with agentic capabilities unveiled", outlet: "Google Blog", time: "5h", importance: 0.8, kind: "official" },
          { title: "Native tool use and multi-step reasoning in production", outlet: "VentureBeat", time: "1d", importance: 0.65, kind: "official" },
          { title: "DeepMind research breakthroughs in reasoning and planning", outlet: "Nature", time: "4d", importance: 0.55, kind: "转载" },
        ] },
      { name: "Microsoft", value: 84, sentiment: 0.35, metric: "Copilot", heat: 0.72, confidence: "confirmed", headline: "Copilot Studio enables enterprise multi-agent workflows",
        related: [
          { title: "Copilot Studio enables enterprise multi-agent workflows", outlet: "Microsoft Blog", time: "8h", importance: 0.7, kind: "official" },
          { title: "Azure AI revenue grows 60% YoY", outlet: "Bloomberg", time: "1d", importance: 0.65, kind: "转载" },
          { title: "GitHub integration deepens developer lock-in", outlet: "TechCrunch", time: "3d", importance: 0.5, kind: "analysis" },
        ] },
      { name: "Meta", value: 72, sentiment: 0.42, metric: "Llama 4", heat: 0.7, confidence: "watch", headline: "Llama 4 400B open-source model released, challenges proprietary offerings",
        related: [
          { title: "Llama 4 400B parameter open-source model released", outlet: "Meta AI Blog", time: "8h", importance: 0.75, kind: "official" },
          { title: "Permissive license enables commercial use without API costs", outlet: "The Verge", time: "1d", importance: 0.6, kind: "official" },
          { title: "AI infrastructure spend raised to $40B", outlet: "Reuters", time: "3d", importance: 0.55, kind: "转载" },
        ] },
      { name: "DeepSeek", value: 70, sentiment: 0.58, metric: "V3 top", heat: 0.75, confidence: "watch", headline: "DeepSeek-V3 tops open-source benchmarks at fraction of cost",
        related: [
          { title: "V3 tops open-source benchmarks, narrows gap with frontier", outlet: "Hacker News", time: "2h", importance: 0.7, kind: "转载" },
          { title: "Trained at fraction of cost, validates open-source approach", outlet: "arXiv", time: "1d", importance: 0.6, kind: "analysis" },
          { title: "$15B valuation after Series B, largest AI round in China", outlet: "The Information", time: "2d", importance: 0.65, kind: "转载" },
        ] },
      { name: "Baidu", value: 55, sentiment: 0.22, metric: "ERNIE 5.0", heat: 0.5, confidence: "confirmed", headline: "ERNIE 5.0 achieves GPT-4 level performance on Chinese NLP tasks",
        related: [
          { title: "ERNIE 5.0 achieves GPT-4 level performance on Chinese NLP tasks", outlet: "Baidu Blog", time: "1d", importance: 0.55, kind: "official" },
          { title: "Cloud AI hosting demand drives enterprise adoption", outlet: "Nikkei Asia", time: "3d", importance: 0.45, kind: "转载" },
          { title: "Enterprise adoption accelerates in Chinese market", outlet: "Reuters", time: "5d", importance: 0.4, kind: "转载" },
        ] },
    ],
  },
  business: {
    title: "商业",
    items: [
      { name: "Amazon", value: 90, sentiment: 0.45, metric: "AWS $110B", heat: 0.82, confidence: "confirmed", headline: "AWS surpasses $110B annual run rate on AI demand",
        related: [
          { title: "AWS revenue surpasses $110B annual run rate", outlet: "CNBC", time: "4h", importance: 0.72, kind: "转载" },
          { title: "AI-generated product video ads launched at scale", outlet: "TechCrunch", time: "1d", importance: 0.55, kind: "official" },
          { title: "Cloud revenue grows on surging AI model hosting demand", outlet: "Bloomberg", time: "2d", importance: 0.6, kind: "转载" },
        ] },
      { name: "Microsoft", value: 85, sentiment: 0.32, metric: "$4T cap", heat: 0.75, confidence: "confirmed", headline: "Market cap crosses $4 trillion on Azure AI growth",
        related: [
          { title: "Market cap crosses $4 trillion on Azure AI growth", outlet: "CNBC", time: "3h", importance: 0.75, kind: "转载" },
          { title: "Azure AI revenue grows 60% YoY", outlet: "Bloomberg", time: "1d", importance: 0.65, kind: "转载" },
          { title: "Copilot adoption exceeds 10M seats", outlet: "Microsoft Blog", time: "3d", importance: 0.55, kind: "official" },
        ] },
      { name: "Tesla", value: 72, sentiment: 0.35, metric: "robotaxi", heat: 0.68, confidence: "watch", headline: "Robotaxi launches in Austin, 10,000 rides in first week",
        related: [
          { title: "Robotaxi service launches in Austin", outlet: "TechCrunch", time: "7h", importance: 0.7, kind: "official" },
          { title: "10,000 rides completed in first week", outlet: "Bloomberg", time: "1d", importance: 0.65, kind: "official" },
          { title: "FSD v13 achieves Level 4 certification in California", outlet: "Reuters", time: "3d", importance: 0.6, kind: "official" },
        ] },
      { name: "Tencent", value: 65, sentiment: 0.28, metric: "WeChat AI", heat: 0.55, confidence: "confirmed", headline: "WeChat integrates AI assistant across all mini-programs",
        related: [
          { title: "WeChat integrates AI assistant across all mini-programs", outlet: "36氪", time: "6h", importance: 0.6, kind: "官方" },
          { title: "Mini-program ecosystem drives user engagement", outlet: "Nikkei Asia", time: "1d", importance: 0.5, kind: "转载" },
          { title: "Gaming revenue remains stable amid AI investment push", outlet: "Bloomberg", time: "3d", importance: 0.45, kind: "转载" },
        ] },
      { name: "Alibaba", value: 62, sentiment: 0.25, metric: "Cloud +18%", heat: 0.52, confidence: "confirmed", headline: "Cloud revenue grows 18% YoY driven by AI model hosting demand",
        related: [
          { title: "Alibaba Cloud revenue grows 18% YoY driven by AI model hosting", outlet: "Reuters", time: "5h", importance: 0.6, kind: "官方" },
          { title: "AI model hosting demand drives cloud growth", outlet: "Nikkei Asia", time: "1d", importance: 0.55, kind: "转载" },
          { title: "International expansion targets Southeast Asia and Middle East", outlet: "Bloomberg", time: "3d", importance: 0.45, kind: "转载" },
        ] },
      { name: "BYD", value: 58, sentiment: 0.3, metric: "Japan", heat: 0.58, confidence: "confirmed", headline: "Enters Japanese market with Dolphin Mini, targets 50K annual sales",
        related: [
          { title: "BYD enters Japanese market with Dolphin Mini", outlet: "Nikkei Asia", time: "8h", importance: 0.55, kind: "official" },
          { title: "Targets 50K annual sales in Japan", outlet: "Reuters", time: "1d", importance: 0.5, kind: "official" },
          { title: "Surpasses Tesla in global EV sales for Q1 2026", outlet: "Bloomberg", time: "3d", importance: 0.6, kind: "转载" },
        ] },
    ],
  },
  finance: {
    title: "金融",
    items: [
      { name: "JPMorgan", value: 85, sentiment: 0.4, metric: "Q1 beat", heat: 0.75, confidence: "confirmed", headline: "Record Q1 trading revenue driven by AI infrastructure demand",
        related: [
          { title: "Record Q1 trading revenue driven by AI infrastructure demand", outlet: "CNBC", time: "5h", importance: 0.7, kind: "official" },
          { title: "AI infrastructure demand drives growth across divisions", outlet: "Bloomberg", time: "1d", importance: 0.6, kind: "转载" },
          { title: "Launches $5B AI-focused venture capital fund", outlet: "Financial Times", time: "3d", importance: 0.55, kind: "official" },
        ] },
      { name: "Goldman Sachs", value: 72, sentiment: 0.32, metric: "SPX 6500", heat: 0.62, confidence: "confirmed", headline: "Raises S&P 500 year-end target to 6,500",
        related: [
          { title: "Raises S&P 500 year-end target to 6,500", outlet: "Goldman Sachs", time: "1d", importance: 0.65, kind: "official" },
          { title: "Trading revenue beats consensus on fixed-income strength", outlet: "Bloomberg", time: "3d", importance: 0.55, kind: "转载" },
          { title: "AI investment banking deals surge", outlet: "Financial Times", time: "5d", importance: 0.5, kind: "转载" },
        ] },
      { name: "BlackRock", value: 68, sentiment: 0.3, metric: "$12B fund", heat: 0.58, confidence: "confirmed", headline: "Raises $12B AI infrastructure fund, tokenized Treasury hits $10B",
        related: [
          { title: "Raises $12B new infrastructure fund targeting AI data centers", outlet: "Bloomberg", time: "1d", importance: 0.6, kind: "转载" },
          { title: "Tokenized Treasury fund on Ethereum reaches $10B AUM", outlet: "Financial Times", time: "3d", importance: 0.55, kind: "official" },
          { title: "Bitcoin ETF market leader with largest AUM", outlet: "CoinDesk", time: "5d", importance: 0.5, kind: "转载" },
        ] },
      { name: "Federal Reserve", value: 82, sentiment: 0.18, metric: "rates", heat: 0.72, confidence: "confirmed", headline: "Holds rates steady, signals potential September cut",
        related: [
          { title: "Federal Reserve holds rates steady, signals September cut", outlet: "CNBC", time: "2h", importance: 0.8, kind: "official" },
          { title: "Inflation data meets expectations", outlet: "Reuters", time: "6h", importance: 0.7, kind: "official" },
          { title: "Dovish tone drives market rally", outlet: "Bloomberg", time: "8h", importance: 0.65, kind: "转载" },
        ] },
    ],
  },
  investment: {
    title: "投资",
    items: [
      { name: "BlackRock", value: 88, sentiment: 0.35, metric: "$12B", heat: 0.72, confidence: "confirmed", headline: "Raises $12B AI infrastructure fund for data center buildout",
        related: [
          { title: "Raises $12B new infrastructure fund targeting AI data centers", outlet: "Bloomberg", time: "1d", importance: 0.6, kind: "转载" },
          { title: "Tokenized Treasury milestone at $10B AUM", outlet: "Financial Times", time: "3d", importance: 0.55, kind: "official" },
          { title: "Global alternatives push expands private market offerings", outlet: "Reuters", time: "5d", importance: 0.5, kind: "转载" },
        ] },
      { name: "JPMorgan", value: 75, sentiment: 0.3, metric: "$5B VC", heat: 0.62, confidence: "confirmed", headline: "Launches $5B AI-focused venture capital fund",
        related: [
          { title: "Launches $5B AI-focused venture capital fund", outlet: "Financial Times", time: "3d", importance: 0.55, kind: "official" },
          { title: "Infrastructure investments grow on data center demand", outlet: "Bloomberg", time: "5d", importance: 0.5, kind: "转载" },
          { title: "Private credit growth accelerates", outlet: "Reuters", time: "7d", importance: 0.45, kind: "转载" },
        ] },
      { name: "Goldman Sachs", value: 68, sentiment: 0.25, metric: "growth", heat: 0.55, confidence: "confirmed", headline: "Growth equity expansion targets AI infrastructure",
        related: [
          { title: "Growth equity expansion targets AI infrastructure", outlet: "Goldman Sachs", time: "2d", importance: 0.5, kind: "official" },
          { title: "AI portfolio allocation increases across client accounts", outlet: "Bloomberg", time: "4d", importance: 0.45, kind: "转载" },
          { title: "Alternative assets under management grows", outlet: "Financial Times", time: "6d", importance: 0.4, kind: "转载" },
        ] },
    ],
  },
  startups: {
    title: "创业",
    items: [
      { name: "DeepSeek", value: 82, sentiment: 0.6, metric: "$15B", heat: 0.85, confidence: "watch", headline: "$15B Series B valuation, largest AI startup round in China",
        related: [
          { title: "$15B valuation after Series B, largest AI round in China", outlet: "The Information", time: "2d", importance: 0.7, kind: "转载" },
          { title: "V3 open-source leader tops frontier benchmarks", outlet: "Hacker News", time: "3d", importance: 0.6, kind: "转载" },
          { title: "Cost-efficient training approach challenges big-tech spending", outlet: "arXiv", time: "5d", importance: 0.55, kind: "analysis" },
        ] },
      { name: "OpenAI", value: 95, sentiment: 0.55, metric: "$300B", heat: 0.9, confidence: "watch", headline: "$40B funding round at $300B valuation completed",
        related: [
          { title: "$40B funding round at $300B valuation", outlet: "Financial Times", time: "1d", importance: 0.75, kind: "转载" },
          { title: "For-profit conversion underway with Microsoft renegotiation", outlet: "The Information", time: "3d", importance: 0.65, kind: "转载" },
          { title: "Revenue growth accelerates on enterprise API demand", outlet: "Bloomberg", time: "5d", importance: 0.6, kind: "转载" },
        ] },
      { name: "Anthropic", value: 78, sentiment: 0.52, metric: "$60B", heat: 0.82, confidence: "watch", headline: "$60B valuation, annualized revenue hits $4B",
        related: [
          { title: "$60B valuation in latest funding round", outlet: "Bloomberg", time: "2d", importance: 0.7, kind: "转载" },
          { title: "$4B annualized revenue on enterprise demand", outlet: "The Information", time: "3d", importance: 0.65, kind: "转载" },
          { title: "Enterprise focus drives Claude adoption in Fortune 500", outlet: "TechCrunch", time: "5d", importance: 0.55, kind: "analysis" },
        ] },
    ],
  },
  crypto: {
    title: "加密",
    items: [
      { name: "Bitcoin", value: 95, sentiment: 0.55, metric: "$120K", heat: 0.82, confidence: "watch", headline: "Breaks above $120K on record spot ETF inflows",
        related: [
          { title: "ETF inflows hit record $2.5B in single week", outlet: "CoinDesk", time: "3h", importance: 0.7, kind: "转载" },
          { title: "Institutional adoption accelerates with corporate treasuries", outlet: "Bloomberg", time: "1d", importance: 0.65, kind: "转载" },
          { title: "Supply shock dynamics from halving still in play", outlet: "Bitcoin Magazine", time: "3d", importance: 0.55, kind: "analysis" },
        ] },
      { name: "Ethereum", value: 72, sentiment: 0.38, metric: "Pectra", heat: 0.65, confidence: "watch", headline: "Pectra upgrade live, enables account abstraction",
        related: [
          { title: "Pectra upgrade enables account abstraction and blob scaling", outlet: "Ethereum Blog", time: "6h", importance: 0.6, kind: "official" },
          { title: "BlackRock tokenized Treasury fund on ETH reaches $10B", outlet: "Bloomberg", time: "1d", importance: 0.65, kind: "转载" },
          { title: "L2 activity hits new highs with rollup adoption", outlet: "The Block", time: "3d", importance: 0.5, kind: "转载" },
        ] },
      { name: "Solana", value: 55, sentiment: 0.42, metric: "100M tx", heat: 0.58, confidence: "watch", headline: "100M daily transactions, surpasses all L2s combined",
        related: [
          { title: "100M daily transactions, surpasses all L2s combined", outlet: "The Block", time: "3h", importance: 0.55, kind: "转载" },
          { title: "DeFi TVL growth accelerates with new protocols", outlet: "DefiLlama", time: "1d", importance: 0.45, kind: "转载" },
          { title: "Network stability maintained through high-throughput period", outlet: "Solana Blog", time: "3d", importance: 0.4, kind: "official" },
        ] },
      { name: "Coinbase", value: 48, sentiment: 0.28, metric: "derivatives", heat: 0.45, confidence: "confirmed", headline: "Launches institutional crypto derivatives platform",
        related: [
          { title: "Launches institutional crypto derivatives platform", outlet: "CoinDesk", time: "1d", importance: 0.5, kind: "official" },
          { title: "Regulatory clarity improves with SEC guidance", outlet: "Reuters", time: "3d", importance: 0.45, kind: "转载" },
          { title: "Revenue diversification beyond spot trading", outlet: "Bloomberg", time: "5d", importance: 0.4, kind: "转载" },
        ] },
    ],
  },
  policy: {
    title: "政策",
    items: [
      { name: "EU AI Act", value: 72, sentiment: 0.12, metric: "Phase 2", heat: 0.6, confidence: "confirmed", headline: "Phase 2 enforcement begins with mandatory compliance for high-risk AI",
        related: [
          { title: "Phase 2 enforcement begins for high-risk AI systems", outlet: "Reuters", time: "8h", importance: 0.65, kind: "official" },
          { title: "High-risk AI compliance mandatory for healthcare, finance, law enforcement", outlet: "EU Commission", time: "1d", importance: 0.6, kind: "official" },
          { title: "Foundation model rules finalized with transparency requirements", outlet: "Financial Times", time: "2d", importance: 0.55, kind: "转载" },
        ] },
      { name: "Federal Reserve", value: 85, sentiment: 0.22, metric: "rates", heat: 0.72, confidence: "confirmed", headline: "Signals potential September rate cut, inflation on track",
        related: [
          { title: "September rate cut signaled as inflation meets targets", outlet: "CNBC", time: "2h", importance: 0.8, kind: "official" },
          { title: "Holds rates steady at latest meeting", outlet: "Reuters", time: "6h", importance: 0.7, kind: "official" },
          { title: "Inflation data on track, labor market cooling", outlet: "Bloomberg", time: "8h", importance: 0.65, kind: "转载" },
        ] },
    ],
  },
  marketing: {
    title: "营销",
    items: [
      { name: "Google", value: 80, sentiment: 0.3, metric: "AI ads", heat: 0.62, confidence: "confirmed", headline: "AI-powered campaign optimization introduced by default",
        related: [
          { title: "Google Ads introduces AI-powered campaign optimization by default", outlet: "Marketing Week", time: "1d", importance: 0.55, kind: "official" },
          { title: "Performance Max campaigns drive automated cross-channel bidding", outlet: "Search Engine Land", time: "3d", importance: 0.5, kind: "official" },
          { title: "Search ad evolution with AI-generated creative assets", outlet: "TechCrunch", time: "5d", importance: 0.45, kind: "转载" },
        ] },
      { name: "Meta", value: 72, sentiment: 0.32, metric: "Advantage+", heat: 0.58, confidence: "confirmed", headline: "Advantage+ AI campaigns now drive 40% of total ad revenue",
        related: [
          { title: "Advantage+ AI campaigns drive 40% of total ad revenue", outlet: "Bloomberg", time: "1d", importance: 0.6, kind: "转载" },
          { title: "AI creative tools reduce ad production costs by 60%", outlet: "Marketing Week", time: "3d", importance: 0.5, kind: "转载" },
          { title: "Reels monetization improves with AI-optimized placements", outlet: "TechCrunch", time: "5d", importance: 0.45, kind: "转载" },
        ] },
      { name: "Amazon", value: 65, sentiment: 0.28, metric: "video ads", heat: 0.52, confidence: "confirmed", headline: "AI-generated product video ads launched at scale",
        related: [
          { title: "Amazon Ads launches AI-generated product video ads at scale", outlet: "TechCrunch", time: "1d", importance: 0.5, kind: "official" },
          { title: "Sponsored products growth accelerates with AI targeting", outlet: "Bloomberg", time: "3d", importance: 0.45, kind: "转载" },
          { title: "Prime ad expansion increases streaming ad inventory", outlet: "Reuters", time: "5d", importance: 0.4, kind: "转载" },
        ] },
    ],
  },
  news: {
    title: "全球新闻",
    items: [
      { name: "NVIDIA", value: 90, sentiment: 0.45, metric: "$200B", heat: 0.78, confidence: "confirmed", headline: "Global AI chip spending projected to reach $200B in 2026",
        related: [
          { title: "Global AI chip spending projected to reach $200B in 2026", outlet: "Reuters", time: "4h", importance: 0.6, kind: "转载" },
          { title: "Supply chain constraints persist amid surging demand", outlet: "Nikkei Asia", time: "1d", importance: 0.55, kind: "转载" },
          { title: "Data center boom drives infrastructure investment wave", outlet: "Bloomberg", time: "3d", importance: 0.5, kind: "analysis" },
        ] },
      { name: "OpenAI", value: 82, sentiment: 0.3, metric: "restructure", heat: 0.72, confidence: "watch", headline: "Microsoft partnership renegotiation ahead of for-profit conversion",
        related: [
          { title: "OpenAI and Microsoft renegotiate partnership terms", outlet: "The Information", time: "1d", importance: 0.65, kind: "转载" },
          { title: "For-profit conversion restructuring underway", outlet: "Financial Times", time: "3d", importance: 0.6, kind: "转载" },
          { title: "Governance changes signal organizational maturation", outlet: "Bloomberg", time: "5d", importance: 0.5, kind: "analysis" },
        ] },
      { name: "DeepSeek", value: 65, sentiment: 0.48, metric: "open-source", heat: 0.65, confidence: "watch", headline: "Open-source AI leadership challenges proprietary model dominance",
        related: [
          { title: "Open-source AI leadership challenges proprietary dominance", outlet: "Hacker News", time: "2h", importance: 0.55, kind: "转载" },
          { title: "China AI ecosystem grows around open-source models", outlet: "Nikkei Asia", time: "1d", importance: 0.5, kind: "转载" },
          { title: "Benchmark dominance validates cost-efficient training", outlet: "arXiv", time: "3d", importance: 0.45, kind: "analysis" },
        ] },
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
  { category: "AI", source: "TechCrunch", logoKey: "techcrunch", logoText: "TC", time: "3m", headline: "OpenAI GPT-5 sets new benchmarks in reasoning and tool use", summary: "GPT-5 demonstrates breakthrough capabilities in multi-step reasoning, native function calling, and long-context understanding.", sentiment: 0.72, importance: 0.9, kind: "official", status: "confirmed", body: "OpenAI has released GPT-5, its most capable model to date. Early benchmarks show significant improvements in reasoning tasks, with the model achieving near-human performance on complex multi-step problems. The native tool use capability eliminates the need for external function-calling wrappers, and the extended context window handles up to 1M tokens. Enterprise pricing has been restructured with volume discounts." },
  { category: "AI", source: "The Verge", logoKey: "the-verge", logoText: "TV", time: "8m", headline: "Anthropic launches Claude Opus 4.6 with 1M context window", summary: "The new model pushes the frontier on coding, analysis, and agentic tasks while maintaining safety alignment.", sentiment: 0.65, importance: 0.85, kind: "official", status: "confirmed", body: "Anthropic has unveiled Claude Opus 4.6, featuring a 1M token context window and significant improvements in coding and analytical tasks. The model demonstrates particular strength in multi-file code refactoring, long document analysis, and agentic workflows. The company reports $4B in annualized revenue and a $60B valuation following its latest funding round." },
  { category: "Markets", source: "Bloomberg", logoKey: "bloomberg", logoText: "BB", time: "12m", headline: "Nasdaq crosses 20,000 for first time on AI rally", summary: "Tech-heavy index reaches milestone as semiconductor and AI names lead gains.", sentiment: 0.48, importance: 0.8, kind: "转载", status: "confirmed", body: "The Nasdaq Composite has crossed the 20,000 level for the first time in its history, driven almost entirely by strength in AI-related stocks. NVIDIA, Microsoft, and Google are contributing the most to the index's gains. Market breadth remains concentrated, with the top 10 stocks accounting for 65% of the index's year-to-date return. Options activity in semiconductor names is running 2x the 20-day average." },
  { category: "Tech", source: "Reuters", logoKey: "reuters", logoText: "R", time: "18m", headline: "TSMC 2nm mass production ahead of schedule", summary: "Advanced node yields exceed expectations, securing Apple and NVIDIA as lead customers.", sentiment: 0.46, importance: 0.7, kind: "转载", status: "confirmed", body: "TSMC has confirmed that its 2nm process node is entering mass production ahead of the original schedule. Yield rates are reported to be above initial targets, with Apple and NVIDIA secured as lead customers for the first production runs. The Arizona fab remains on track for 2026 production, and capex guidance has been raised to $38B to accommodate surging demand for advanced packaging capacity." },
  { category: "Markets", source: "Financial Times", logoKey: "financial-times", logoText: "FT", time: "24m", headline: "Bitcoin breaks above $120K as spot ETF inflows hit record", summary: "Institutional demand drives crypto benchmark to all-time high.", sentiment: 0.52, importance: 0.75, kind: "转载", status: "confirmed", body: "Bitcoin has surged past $120,000 for the first time, propelled by record institutional inflows into spot Bitcoin ETFs. Weekly inflows hit $2.5B, with BlackRock's IBIT leading the pack. The rally has been supported by growing corporate treasury adoption and favorable regulatory developments. Ethereum has also benefited, with BlackRock's tokenized Treasury fund on the network reaching $10B in AUM." },
  { category: "Geo", source: "Nikkei Asia", logoKey: "nikkei", logoText: "N", time: "32m", headline: "US and China reach preliminary semiconductor export agreement", summary: "Deal eases some restrictions while maintaining controls on leading-edge AI chips.", sentiment: 0.28, importance: 0.75, kind: "转载", status: "confirmed", body: "The US and China have reached a preliminary agreement on semiconductor export controls, easing some restrictions on mature-node chips while maintaining strict controls on leading-edge AI accelerators. The deal is expected to reduce uncertainty for companies like TSMC and Samsung that operate in both markets. Supply chain diversification efforts continue, with nearshoring to Mexico and Southeast Asia accelerating." },
  { category: "Tech", source: "Hacker News", logoKey: "hacker-news", logoText: "HN", time: "41m", headline: "DeepSeek-V3 tops open-source benchmarks, narrows gap with frontier models", summary: "Chinese AI lab's latest model demonstrates that open-source can compete with closed frontier systems.", sentiment: 0.58, importance: 0.7, kind: "转载", status: "confirmed", body: "DeepSeek's V3 model has claimed the top position across multiple open-source benchmarks, narrowing the gap with closed frontier models from OpenAI and Anthropic. The model, trained at a fraction of the cost of its competitors, demonstrates particular strength in coding and mathematical reasoning. The achievement validates the open-source approach to AI development and puts pressure on proprietary model providers to justify their pricing." },
  { category: "Geo", source: "Reuters", logoKey: "reuters", logoText: "R", time: "55m", headline: "EU AI Act Phase 2 enforcement begins with mandatory compliance", summary: "High-risk AI systems must now meet strict requirements for transparency and human oversight.", sentiment: 0.12, importance: 0.65, kind: "official", status: "confirmed", body: "The EU AI Act Phase 2 enforcement has begun, requiring mandatory compliance for high-risk AI systems. Companies deploying AI in healthcare, finance, law enforcement, and critical infrastructure must now meet strict requirements for transparency, human oversight, and risk management. Foundation model providers face additional obligations around training data disclosure and safety testing. Compliance costs are estimated at 2-4% of revenue for affected companies." },
  { category: "Markets", source: "CNBC", logoKey: "cnbc", logoText: "CN", time: "1h", headline: "Federal Reserve holds rates steady, signals September cut", summary: "Dovish tone drives market rally as inflation data meets expectations.", sentiment: 0.32, importance: 0.8, kind: "official", status: "confirmed", body: "The Federal Reserve has held interest rates steady at its latest meeting while signaling a potential rate cut in September. Chair Powell noted that inflation data has been encouraging and that the labor market is showing signs of cooling. Markets rallied on the dovish tone, with the S&P 500 hitting a new all-time high. Treasury yields fell across the curve, with the 10-year dropping below 4.2%." },
  { category: "Tech", source: "TechCrunch", logoKey: "techcrunch", logoText: "TC", time: "1h", headline: "Tesla robotaxi service launches in Austin with 10,000 rides in first week", summary: "FSD v13 achieves Level 4 certification as the autonomous service scales rapidly.", sentiment: 0.45, importance: 0.7, kind: "official", status: "watch", body: "Tesla has launched its robotaxi service in Austin, completing 10,000 rides in its first week of operation. The service uses FSD v13, which has achieved Level 4 autonomous driving certification in California. Early rider feedback has been positive, with average ride times and safety metrics meeting internal targets. The launch marks a significant milestone in Tesla's autonomous driving ambitions, though regulatory approval in additional markets remains pending." },
  { category: "AI", source: "VentureBeat", logoKey: "venturebeat", logoText: "VB", time: "2h", headline: "Meta releases Llama 4 open-source model with 400B parameters", summary: "Largest open-source model yet challenges proprietary offerings on capability and cost.", sentiment: 0.42, importance: 0.75, kind: "official", status: "confirmed", body: "Meta has released Llama 4, a 400-billion parameter open-source model that matches or exceeds the performance of many proprietary offerings. The model is available under a permissive license, enabling commercial use without API costs. Meta's AI infrastructure spend has been raised to $40B to support training and deployment at scale. The release strengthens Meta's position in the open-source AI ecosystem and puts pressure on closed-source providers." },
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
      { favicon: "HN", source: "HN", title: "DeepSeek-V3: open-source model that rivals GPT-5 on coding benchmarks", time: "6m", body: "DeepSeek's latest V3 model has topped multiple coding benchmarks, narrowing the gap with frontier models. The model was trained at a fraction of the cost, validating the open-source approach to AI development.", url: "#" },
      { favicon: "HN", source: "HN", title: "GPU memory bandwidth is the new bottleneck for LLM inference", time: "15m", body: "The shift from compute-bound to memory-bound workloads in AI inference has made GPU memory bandwidth the new currency. NVIDIA's H100 achieves 3.35 TB/s, but even that isn't enough for large models at scale.", url: "#" },
      { favicon: "HN", source: "HN", title: "SQLite on the edge: 18 months of production lessons", time: "28m", body: "Running SQLite in production at the edge taught us that the biggest surprise wasn't performance — it was operational simplicity. No connection pools, no query planners, no failover.", url: "#" },
      { favicon: "HN", source: "HN", title: "Building resilient RSS pipelines that don't break on format changes", time: "45m", body: "A production RSS pipeline needs more engineering than expected: graceful malformed XML handling, cross-feed deduplication, and backpressure management for burst publishing.", url: "#" },
      { favicon: "HN", source: "HN", title: "Why every startup is building an AI agent framework", time: "1h", body: "The agent framework space is exploding. Every YC batch now has 3-4 agent startups. The real question is whether the value is in the framework or the vertical-specific workflows.", url: "#" },
    ],
  },
  {
    id: "ai-news",
    label: "AI News",
    items: [
      { favicon: "AI", source: "MIT Tech Review", title: "Anthropic's Claude Opus 4.6 pushes the frontier on coding and analysis", time: "10m", body: "The new model demonstrates particular strength in multi-file code refactoring, long document analysis, and agentic workflows with a 1M token context window.", url: "#" },
      { favicon: "AI", source: "VentureBeat", title: "Microsoft Copilot Studio enables enterprise multi-agent workflows", time: "22m", body: "Enterprises can now build complex multi-agent systems using Copilot Studio, with built-in governance, audit trails, and human-in-the-loop handoffs.", url: "#" },
      { favicon: "AI", source: "arXiv", title: "New paper: scaling laws for reasoning in large language models", time: "38m", body: "Researchers identify predictable scaling relationships between compute, data, and reasoning capability in LLMs, suggesting continued improvement with scale.", url: "#" },
      { favicon: "AI", source: "Google Blog", title: "Gemini 2.5 Ultra with native agentic capabilities", time: "52m", body: "Google DeepMind unveils Gemini 2.5 Ultra, featuring native tool use, multi-step reasoning, and the ability to autonomously complete complex workflows.", url: "#" },
    ],
  },
  {
    id: "markets",
    label: "Markets",
    items: [
      { favicon: "BB", source: "Bloomberg", title: "S&P 500 hits new ATH at 5,842 as tech earnings beat", time: "5m", body: "The S&P 500 has reached a new all-time high, driven by strong earnings from technology companies. NVIDIA, Microsoft, and Google all beat consensus estimates.", url: "#" },
      { favicon: "FT", source: "Financial Times", title: "Bitcoin surges past $120K on record ETF inflows", time: "18m", body: "Spot Bitcoin ETFs saw $2.5B in weekly inflows, the highest on record. BlackRock's IBIT leads with $1.2B, followed by Fidelity's FBTC.", url: "#" },
      { favicon: "WSJ", source: "WSJ", title: "Federal Reserve signals September rate cut as inflation cools", time: "35m", body: "The Fed held rates steady but Chair Powell's dovish comments have markets pricing in a 90% probability of a September cut.", url: "#" },
      { favicon: "CN", source: "CNBC", title: "Gold breaks $3,200 on geopolitical tensions and rate cut bets", time: "48m", body: "Gold has surged past $3,200 per ounce, supported by central bank buying, geopolitical hedging demand, and expectations of lower interest rates.", url: "#" },
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
  { ticker: "NVDA", name: "NVIDIA", logoKey: "nvidia", logoText: "NV", price: "184.26", changePct: 3.92, sparkline: [176.8, 178.1, 179.6, 181.9, 180.8, 183.0, 184.3], prevClose: "177.30", dayRange: "178.10 – 185.40", weekRange52: "75.60 – 192.80", volume: "312.5M" },
  { ticker: "AAPL", name: "Apple", logoKey: "apple", logoText: "A", price: "212.88", changePct: -0.44, sparkline: [214.1, 213.8, 213.2, 212.7, 213.0, 212.4, 212.9], prevClose: "213.82", dayRange: "211.60 – 214.40", weekRange52: "164.08 – 237.50", volume: "42.3M" },
  { ticker: "MSFT", name: "Microsoft", logoKey: "microsoft", logoText: "MS", price: "486.70", changePct: 0.72, sparkline: [482.6, 483.8, 481.9, 484.2, 485.1, 485.7, 486.7], prevClose: "483.22", dayRange: "481.90 – 488.50", weekRange52: "388.40 – 505.80", volume: "14.6M" },
  { ticker: "TSLA", name: "Tesla", logoKey: "tesla", logoText: "T", price: "342.11", changePct: -1.38, sparkline: [349.6, 347.1, 346.4, 344.8, 345.2, 343.0, 342.1], prevClose: "346.88", dayRange: "340.20 – 349.60", weekRange52: "138.80 – 365.20", volume: "82.1M" },
  { ticker: "GOOGL", name: "Google", logoKey: "google", logoText: "G", price: "178.52", changePct: 1.85, sparkline: [174.2, 175.6, 176.1, 177.3, 176.8, 177.9, 178.5], prevClose: "175.27", dayRange: "175.60 – 179.80", weekRange52: "130.60 – 191.20", volume: "28.4M" },
  { ticker: "AMZN", name: "Amazon", logoKey: "amazon", logoText: "AM", price: "198.45", changePct: 2.12, sparkline: [193.8, 194.5, 195.2, 196.1, 195.8, 197.2, 198.5], prevClose: "194.32", dayRange: "194.80 – 199.60", weekRange52: "151.60 – 214.80", volume: "35.2M" },
  { ticker: "META", name: "Meta", logoKey: "meta", logoText: "M", price: "542.30", changePct: 0.95, sparkline: [536.2, 537.8, 538.4, 539.6, 540.1, 541.2, 542.3], prevClose: "537.17", dayRange: "537.80 – 544.60", weekRange52: "414.50 – 582.40", volume: "12.8M" },
  { ticker: "BTC", name: "Bitcoin", logoKey: "bitcoin", logoText: "₿", price: "121,450", changePct: 2.85, sparkline: [117200, 118100, 119400, 120200, 119800, 120800, 121450], prevClose: "118,080", dayRange: "119,200 – 122,100", weekRange52: "52,400 – 125,000", volume: "$48.2B" },
  { ticker: "TSM", name: "TSMC", logoKey: "tsmc", logoText: "TSM", price: "186.40", changePct: 1.65, sparkline: [182.4, 183.1, 183.8, 184.5, 184.2, 185.6, 186.4], prevClose: "183.37", dayRange: "183.80 – 187.20", weekRange52: "133.60 – 212.40", volume: "18.6M" },
  { ticker: "BABA", name: "阿里巴巴", logoKey: "alibaba", logoText: "BABA", price: "91.65", changePct: 1.58, sparkline: [89.8, 90.1, 90.6, 90.2, 91.0, 91.4, 91.7], prevClose: "90.22", dayRange: "89.80 – 92.30", weekRange52: "66.80 – 118.40", volume: "24.8M" },
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
