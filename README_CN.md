<p align="center">
  <img src="argus_logo.png" alt="Argus" width="180" />
</p>

<h1 align="center">Argus</h1>

<p align="center">
  <strong>为科技情报工作者打造的环境信息雷达</strong><br/>
  <em>AI 驱动的新闻过滤，将海量科技资讯压缩为最重要的条目。</em><br/>
  每天扫 5-10 次，每次 30 秒，即可掌握全局。
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README_CN.md">中文</a>
</p>

---

## 功能特性

- **AI 减法** — 保留/丢弃决策 + 一句话摘要，不做长篇分析
- **Treemap 仪表盘** — 情绪着色、热度加权的监视列表可视化
- **实时 Feed** — RSS + AI 过滤的新闻流，带重要性评分
- **领域预设** — 一键添加 AI、芯片、加密、金融等领域预设
- **视频播放器** — HLS/MP4 播放，自动检测字幕轨，支持 LLM 翻译字幕
- **倒计时** — 浏览器本地时区，AI 推荐关键日期节点
- **天气 / 时钟 / 搜索** — 多种实用组件
- **中英双语** — 全界面中英文切换
- **环境设计** — 适合壁挂，可扫视，零动画空闲态
- **自托管** — 数据留在你自己的机器上

## 快速开始

### 前置条件

- **Docker**（推荐，无需安装 Python/Node.js）
- 或 Python 3.12+ & Node.js 18+（本地开发）
- 一个 OpenAI 兼容的 API key（OpenAI / Mimo / DeepSeek 等）

### Docker 部署（推荐）

```bash
git clone https://github.com/Ezri-Lin/Argus.git && cd Argus
cp .env.example .env
# 编辑 .env，填入 ARGUS_MODEL_API_KEY（可选，也可启动后在设置面板配置）
docker compose up -d
```

打开 http://localhost:8000 — 前端由后端（FastAPI）直接 serve `web/dist/`，无需单独端口。

首次启动会自动初始化数据库和示例监视列表。

### 本地开发

```bash
git clone https://github.com/Ezri-Lin/Argus.git && cd Argus
pip install -r pipeline/requirements.txt
cd web && npm install && cd ..
cp .env.example .env  # 可选
./dev.sh
```

- 后端: `http://localhost:8000`
- 前端: `http://localhost:5173`

## 组件

| 组件 | 说明 |
|------|------|
| **Treemap** | 热力图式监视列表，情绪着色，点击查看详情 |
| **Feed** | 实时新闻流，AI 评分，支持信号/时间线视图 |
| **Stat** | 数值指标卡片，支持趋势显示 |
| **Countdown** | 倒计时组件，浏览器本地时区，AI 推荐日期 |
| **Weather** | 天气显示 |
| **Clock** | 多时区时钟 |
| **Search** | 搜索组件 |
| **Embed** | 视频/直播播放器，HLS/MP4/iframe，自动字幕检测 + 翻译 |

## 领域预设

一键添加预配置的监视列表，包含领域语义上下文和推荐成员：

- **AI 大模型** — NVIDIA, OpenAI, Anthropic, DeepMind, Meta AI ...
- **科技巨头** — Apple, Microsoft, Google, Amazon, Meta ...
- **芯片半导体** — TSMC, ASML, Samsung, Intel, AMD ...
- **加密货币** — Bitcoin, Ethereum, Solana, Coinbase ...
- **金融市场** — JPMorgan, Goldman Sachs, BlackRock ...
- **中概科技** — Tencent, Alibaba, BYD, ByteDance ...
- **新能源** — Tesla, BYD, CATL, Rivian ...

每个预设包含 primary/secondary 成员分层和领域搜索意图。

## 架构

```
pipeline/              # RSS → AI 过滤 → 事件提取 → 快照
  pipeline.py          # 核心 pipeline 调度
  db.py                # SQLite schema + migrations
  models.py            # AI 模型调用 + system prompts
  processing.py        # 新闻处理 + 去重
  scheduling.py        # 成员扫描调度
  snapshot.py          # Treemap 快照构建
  search/              # 搜索路由 + SearXNG 集成

api/                   # FastAPI 服务
  api.py               # 核心端点 + 路由注册
  routes_ai.py         # AI 模型管理
  routes_members.py    # 监视列表 CRUD + 领域管理
  routes_sources.py    # RSS 源管理
  routes_dates.py      # AI 日期推荐
  routes_video.py      # 视频解析 + 流代理
  routes_subtitles.py  # 字幕翻译
  routes_widgets.py    # Widget 配置持久化
  scheduler.py         # 后台任务调度

web/                   # React + Vite + D3 treemap
  src/
    widgets/           # Treemap, Feed, Countdown, Embed 等组件
    components/        # 配置面板、详情面板、设置
    dashboard/         # Zustand store, API client, 类型定义
    design/            # 设计 token、网格、排版
    lib/               # i18n, 主题, 工具函数
```

## 自托管搜索

Argus 可选运行 SearXNG 作为本地元搜索 sidecar：

```bash
docker compose --profile search up -d
```

已有 SearXNG 实例？设置环境变量：
```bash
SEARXNG_BASE_URL=https://your-search.example.com
```

## 更新

```bash
docker compose down
git pull
docker compose build --no-cache
docker compose up -d
```

## 数据持久化

SQLite 数据库和配置存储在 Docker volume `argus-data` 中。如需使用本地目录（方便备份），编辑 `docker-compose.yml`：

```yaml
volumes:
  - ./data:/app/data
```

## 技术栈

| 层级 | 技术 |
|------|------|
| Frontend | React, Vite, D3, Zustand, Tailwind CSS |
| Backend | Python, FastAPI, SQLite (WAL) |
| AI | OpenAI-compatible API（可配置） |
| Pipeline | RSS → AI 过滤 → 事件提取 → 快照 |
| Search | SearXNG（可选）+ Web search APIs |

## 协议

MIT
