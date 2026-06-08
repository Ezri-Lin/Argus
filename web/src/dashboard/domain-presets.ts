/** Pre-built domain preset packs for one-click dashboard setup.
 *
 *  Each preset includes:
 *  - Domain semantic context (searchIntent, includeTerms, excludeTerms)
 *  - 8-12 members with tier assignments (primary / secondary)
 *  - Members chosen for domain-specific relevance
 */

import type { I18nKey } from "@/lib/i18n";

export type DomainPreset = {
  id: string;
  labelKey: I18nKey;
  descKey: I18nKey;
  titleKey: I18nKey;
  domain: {
    key: string;
    label: string;
    weight: number;
    description?: string;
    search_intent?: string;
    include_terms?: string[];
    exclude_terms?: string[];
  };
  members: Array<{
    name: string;
    label?: string;
    symbol?: string;
    aliases?: string[];
    tier?: "primary" | "secondary";
  }>;
  widget: { type: "treemap" | "feed"; config: Record<string, unknown> };
};

export const DOMAIN_PRESETS: DomainPreset[] = [
  // ── AI / LLM ──
  {
    id: "ai-leaders",
    labelKey: "preset.ai.label",
    descKey: "preset.ai.desc",
    titleKey: "preset.ai.title",
    domain: {
      key: "ai",
      label: "AI 大模型",
      weight: 1.0,
      description: "大语言模型、AI 芯片、算力基础设施、模型训练与推理",
      search_intent: "AI model release, training infrastructure, GPU compute, benchmark, funding",
      include_terms: ["LLM", "GPT", "Claude", "Gemini", "GPU", "training", "inference", "benchmark"],
      exclude_terms: ["gaming", "graphics card review", "photo filter"],
    },
    members: [
      { name: "NVIDIA", label: "英伟达", symbol: "NVDA", aliases: ["nvda", "英伟达", "黄仁勋"], tier: "primary" },
      { name: "OpenAI", label: "OpenAI", symbol: "OAI", aliases: ["openai", "chatgpt", "gpt"], tier: "primary" },
      { name: "Anthropic", label: "Anthropic", symbol: "ANTH", aliases: ["anthropic", "claude"], tier: "primary" },
      { name: "Google DeepMind", label: "DeepMind", aliases: ["deepmind", "gemini", "谷歌AI"], tier: "primary" },
      { name: "Meta AI", label: "Meta AI", symbol: "META", aliases: ["meta ai", "llama", "fair"], tier: "primary" },
      { name: "Microsoft AI", label: "微软 AI", symbol: "MSFT", aliases: ["copilot", "azure ai", "微软AI"], tier: "secondary" },
      { name: "AMD", label: "AMD", symbol: "AMD", aliases: ["amd", "instinct", "mi300"], tier: "secondary" },
      { name: "Broadcom", label: "博通", symbol: "AVGO", aliases: ["broadcom", "博通", "custom asic"], tier: "secondary" },
      { name: "TSMC", label: "台积电", symbol: "TSM", aliases: ["tsmc", "台积电"], tier: "secondary" },
      { name: "DeepSeek", label: "深度求索", aliases: ["deepseek", "深度求索"], tier: "secondary" },
      { name: "xAI", label: "xAI", aliases: ["xai", "grok", "马斯克AI"], tier: "secondary" },
    ],
    widget: { type: "treemap", config: { group: "ai" } },
  },

  // ── Big Tech ──
  {
    id: "big-tech",
    labelKey: "preset.bigtech.label",
    descKey: "preset.bigtech.desc",
    titleKey: "preset.bigtech.title",
    domain: {
      key: "tech",
      label: "科技巨头",
      weight: 1.0,
      description: "大型科技公司综合业务：云计算、消费硬件、广告、平台生态",
      search_intent: "earnings, product launch, antitrust, cloud revenue, user growth, acquisition",
      include_terms: ["earnings", "revenue", "cloud", "antitrust", "acquisition", "layoff", "product launch"],
      exclude_terms: ["crypto", "memecoin", "meme stock"],
    },
    members: [
      { name: "Apple", label: "苹果", symbol: "AAPL", aliases: ["aapl", "苹果", "iphone"], tier: "primary" },
      { name: "Microsoft", label: "微软", symbol: "MSFT", aliases: ["msft", "微软", "azure"], tier: "primary" },
      { name: "Google", label: "谷歌", symbol: "GOOGL", aliases: ["googl", "谷歌", "alphabet", "youtube"], tier: "primary" },
      { name: "Amazon", label: "亚马逊", symbol: "AMZN", aliases: ["amzn", "亚马逊", "aws"], tier: "primary" },
      { name: "Meta", label: "Meta", symbol: "META", aliases: ["meta", "facebook", "fb", "instagram"], tier: "primary" },
      { name: "Tesla", label: "特斯拉", symbol: "TSLA", aliases: ["tsla", "特斯拉", "elon"], tier: "secondary" },
      { name: "Netflix", label: "Netflix", symbol: "NFLX", aliases: ["netflix", "奈飞"], tier: "secondary" },
      { name: "Adobe", label: "Adobe", symbol: "ADBE", aliases: ["adobe", "photoshop"], tier: "secondary" },
      { name: "Salesforce", label: "Salesforce", symbol: "CRM", aliases: ["salesforce", "crm"], tier: "secondary" },
      { name: "Uber", label: "Uber", symbol: "UBER", aliases: ["uber", "优步"], tier: "secondary" },
    ],
    widget: { type: "treemap", config: { group: "tech" } },
  },

  // ── Semiconductors ──
  {
    id: "semiconductors",
    labelKey: "preset.chips.label",
    descKey: "preset.chips.desc",
    titleKey: "preset.chips.title",
    domain: {
      key: "chips",
      label: "芯片半导体",
      weight: 0.9,
      description: "芯片设计、晶圆制造、封装测试、半导体设备、EDA工具",
      search_intent: "wafer, fab, yield, chip shortage, export control, ASML, packaging, HBM",
      include_terms: ["semiconductor", "wafer", "fab", "chip", "HBM", "EUV", "packaging", "export control"],
      exclude_terms: ["gaming benchmark", "phone review"],
    },
    members: [
      { name: "NVIDIA", label: "英伟达", symbol: "NVDA", aliases: ["nvda", "英伟达"], tier: "primary" },
      { name: "TSMC", label: "台积电", symbol: "TSM", aliases: ["tsmc", "台积电"], tier: "primary" },
      { name: "ASML", label: "ASML", symbol: "ASML", aliases: ["asml"], tier: "primary" },
      { name: "Samsung Foundry", label: "三星晶圆", symbol: "005930", aliases: ["samsung", "三星"], tier: "primary" },
      { name: "Intel", label: "英特尔", symbol: "INTC", aliases: ["intel", "英特尔"], tier: "primary" },
      { name: "AMD", label: "AMD", symbol: "AMD", aliases: ["amd", "ryzen", "epyc"], tier: "secondary" },
      { name: "Broadcom", label: "博通", symbol: "AVGO", aliases: ["broadcom", "博通"], tier: "secondary" },
      { name: "Qualcomm", label: "高通", symbol: "QCOM", aliases: ["qualcomm", "高通", "snapdragon"], tier: "secondary" },
      { name: "SK Hynix", label: "SK 海力士", symbol: "000660", aliases: ["hynix", "海力士"], tier: "secondary" },
      { name: "Micron", label: "美光", symbol: "MU", aliases: ["micron", "美光"], tier: "secondary" },
      { name: "Arm", label: "Arm", symbol: "ARM", aliases: ["arm holdings"], tier: "secondary" },
      { name: "Applied Materials", label: "应用材料", symbol: "AMAT", aliases: ["amat", "应用材料"], tier: "secondary" },
    ],
    widget: { type: "treemap", config: { group: "chips" } },
  },

  // ── Crypto ──
  {
    id: "crypto",
    labelKey: "preset.crypto.label",
    descKey: "preset.crypto.desc",
    titleKey: "preset.crypto.title",
    domain: {
      key: "crypto",
      label: "加密货币",
      weight: 0.8,
      description: "加密货币、区块链、DeFi、交易所、稳定币、监管政策",
      search_intent: "crypto price, bitcoin ETF, DeFi, exchange, regulation, halving, stablecoin",
      include_terms: ["bitcoin", "ethereum", "crypto", "ETF", "DeFi", "stablecoin", "halving", "SEC"],
      exclude_terms: ["stock market", "AI model"],
    },
    members: [
      { name: "Bitcoin", label: "比特币", symbol: "BTC", aliases: ["btc", "比特币", "bitcoin"], tier: "primary" },
      { name: "Ethereum", label: "以太坊", symbol: "ETH", aliases: ["eth", "以太坊", "ethereum"], tier: "primary" },
      { name: "Solana", label: "Solana", symbol: "SOL", aliases: ["sol", "solana"], tier: "primary" },
      { name: "Coinbase", label: "Coinbase", symbol: "COIN", aliases: ["coinbase"], tier: "primary" },
      { name: "Binance", label: "币安", aliases: ["binance", "币安", "cz"], tier: "primary" },
      { name: "Tether", label: "Tether", symbol: "USDT", aliases: ["tether", "usdt"], tier: "secondary" },
      { name: "Ripple", label: "Ripple", symbol: "XRP", aliases: ["ripple", "xrp"], tier: "secondary" },
      { name: "Cardano", label: "Cardano", symbol: "ADA", aliases: ["cardano", "ada"], tier: "secondary" },
      { name: "MicroStrategy", label: "MicroStrategy", symbol: "MSTR", aliases: ["microstrategy", "mstr"], tier: "secondary" },
      { name: "Grayscale", label: "Grayscale", aliases: ["grayscale", "gbtc"], tier: "secondary" },
    ],
    widget: { type: "treemap", config: { group: "crypto" } },
  },

  // ── Finance ──
  {
    id: "finance",
    labelKey: "preset.finance.label",
    descKey: "preset.finance.desc",
    titleKey: "preset.finance.title",
    domain: {
      key: "finance",
      label: "金融市场",
      weight: 0.9,
      description: "投资银行、资产管理、支付网络、宏观经济、央行政策",
      search_intent: "earnings, interest rate, Fed, IPO, acquisition, trading, wealth management",
      include_terms: ["earnings", "revenue", "Fed", "interest rate", "IPO", "acquisition", "bank"],
      exclude_terms: ["crypto pump", "memecoin"],
    },
    members: [
      { name: "JPMorgan", label: "摩根大通", symbol: "JPM", aliases: ["jpm", "摩根大通", "jp morgan"], tier: "primary" },
      { name: "Goldman Sachs", label: "高盛", symbol: "GS", aliases: ["gs", "高盛"], tier: "primary" },
      { name: "BlackRock", label: "贝莱德", symbol: "BLK", aliases: ["blk", "贝莱德", "ishares"], tier: "primary" },
      { name: "Visa", label: "Visa", symbol: "V", aliases: ["visa"], tier: "primary" },
      { name: "Berkshire Hathaway", label: "伯克希尔", symbol: "BRK", aliases: ["berkshire", "buffett", "巴菲特"], tier: "primary" },
      { name: "Morgan Stanley", label: "摩根士丹利", symbol: "MS", aliases: ["morgan stanley", "大摩"], tier: "secondary" },
      { name: "Mastercard", label: "万事达", symbol: "MA", aliases: ["mastercard", "万事达"], tier: "secondary" },
      { name: "PayPal", label: "PayPal", symbol: "PYPL", aliases: ["paypal", "venmo"], tier: "secondary" },
      { name: "Citigroup", label: "花旗", symbol: "C", aliases: ["citigroup", "citi", "花旗"], tier: "secondary" },
      { name: "HSBC", label: "汇丰", symbol: "HSBC", aliases: ["hsbc", "汇丰"], tier: "secondary" },
    ],
    widget: { type: "treemap", config: { group: "finance" } },
  },

  // ── China Tech ──
  {
    id: "china-tech",
    labelKey: "preset.chinatech.label",
    descKey: "preset.chinatech.desc",
    titleKey: "preset.chinatech.title",
    domain: {
      key: "china-tech",
      label: "中概科技",
      weight: 0.8,
      description: "中国科技公司、中概股、电动车、互联网平台、半导体国产化",
      search_intent: "China tech earnings, ADR, delisting, regulation, EV, chip self-sufficiency",
      include_terms: ["China", "中概", "ADR", "港股", "regulation", "EV", "电动车"],
      exclude_terms: ["US stock market"],
    },
    members: [
      { name: "Tencent", label: "腾讯", symbol: "0700", aliases: ["tencent", "腾讯", "微信"], tier: "primary" },
      { name: "Alibaba", label: "阿里巴巴", symbol: "9988", aliases: ["alibaba", "阿里巴巴", "淘宝"], tier: "primary" },
      { name: "BYD", label: "比亚迪", symbol: "002594", aliases: ["byd", "比亚迪"], tier: "primary" },
      { name: "ByteDance", label: "字节跳动", aliases: ["bytedance", "字节", "tiktok", "抖音"], tier: "primary" },
      { name: "Bilibili", label: "哔哩哔哩", symbol: "BILI", aliases: ["bilibili", "b站", "哔哩哔哩"], tier: "secondary" },
      { name: "JD.com", label: "京东", symbol: "9618", aliases: ["jd", "京东"], tier: "secondary" },
      { name: "NetEase", label: "网易", symbol: "9999", aliases: ["netease", "网易"], tier: "secondary" },
      { name: "Xiaomi", label: "小米", symbol: "1810", aliases: ["xiaomi", "小米"], tier: "secondary" },
      { name: "NIO", label: "蔚来", symbol: "NIO", aliases: ["nio", "蔚来"], tier: "secondary" },
      { name: "SMIC", label: "中芯国际", symbol: "0981", aliases: ["smic", "中芯"], tier: "secondary" },
    ],
    widget: { type: "treemap", config: { group: "china-tech" } },
  },

  // ── EV & Energy ──
  {
    id: "ev-energy",
    labelKey: "preset.evenergy.label",
    descKey: "preset.evenergy.desc",
    titleKey: "preset.evenergy.title",
    domain: {
      key: "ev-energy",
      label: "新能源",
      weight: 0.8,
      description: "电动汽车、动力电池、光伏、储能、充电桩、碳中和",
      search_intent: "EV sales, battery technology, charging infrastructure, solar, carbon neutral",
      include_terms: ["electric vehicle", "EV", "battery", "锂电池", "充电", "光伏", "solar", "储能"],
      exclude_terms: ["oil price", "gasoline"],
    },
    members: [
      { name: "Tesla", label: "特斯拉", symbol: "TSLA", aliases: ["tsla", "特斯拉"], tier: "primary" },
      { name: "BYD", label: "比亚迪", symbol: "002594", aliases: ["byd", "比亚迪"], tier: "primary" },
      { name: "CATL", label: "宁德时代", symbol: "300750", aliases: ["catl", "宁德"], tier: "primary" },
      { name: "Rivian", label: "Rivian", symbol: "RIVN", aliases: ["rivian"], tier: "secondary" },
      { name: "Lucid", label: "Lucid", symbol: "LCID", aliases: ["lucid"], tier: "secondary" },
      { name: "NIO", label: "蔚来", symbol: "NIO", aliases: ["nio", "蔚来"], tier: "secondary" },
      { name: "Li Auto", label: "理想汽车", symbol: "LI", aliases: ["li auto", "理想"], tier: "secondary" },
      { name: "XPeng", label: "小鹏汽车", symbol: "XPEV", aliases: ["xpeng", "小鹏"], tier: "secondary" },
      { name: "Enphase", label: "Enphase", symbol: "ENPH", aliases: ["enphase"], tier: "secondary" },
      { name: "ChargePoint", label: "ChargePoint", symbol: "CHPT", aliases: ["chargepoint"], tier: "secondary" },
    ],
    widget: { type: "treemap", config: { group: "ev-energy" } },
  },
];
