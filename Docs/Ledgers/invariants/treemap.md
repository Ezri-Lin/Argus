# Treemap Visual Encoding Invariants

> Treemap 视觉编码规则。修改 treemap 样式或渲染逻辑前必读。

## INV-T1: 视觉编码四维度

| 维度 | 编码方式 | 值域 |
|---|---|---|
| 格子大小 | 成员影响力（baseline + 持续事件影响慢衰减，领域内相对） | 0..+∞（相对，有 MIN 兜底） |
| 边框颜色 | 情绪 | 绿 `#46d49a` / 灰 `#8b949e` / 红 `#ff6b6b` |
| 边框线型 | 置信度 | 实线 = confirmed / 虚线 = watch |
| 辉光强度 | 新闻新鲜度（越新越亮，3 天半衰期） | 0..1 映射到 box-shadow |

- 成员只要存在于 `memberships` 就渲染；无新闻成员用 MIN/baseline 兜底，metric 可为 `quiet`。
- `refuted` 事件不贡献影响力、不进入 related/detail；但不能让成员格子消失。
- 四维度缺一不可，不可用其他方式替代。

## INV-T1a: 领域固定，成员排序

- 顶层领域面积由 dashboard/widget 布局或用户配置控制，保持稳定，不由领域内总影响力自动重排。
- 领域内成员必须按影响力 `size/value` 降序交给 treemap 布局。
- D3 squarify 可以重新切分像素位置；v1 不要求成员绝对坐标稳定。

## INV-T2: 情绪色不可挪用

- 语义色（红/灰/绿）专用于数据表达。
- 强调色 Iris `#7c83e8`（亮 `#5a62d6`）**绝不**用于情绪表达。
- 强调色出现面积 < 5%，只点缀 active tab / focus 环 / hover 高光。

## INV-T3: 格子内部分级显示

按面积自动降级：
- **大格子**: 名称 + AI 浓缩一行 + 关键数字
- **小格子**: 只留名称，详情移到 hover

## INV-T4: 玻璃外壳模型

- **外壳 / 边框 / 标题栏** = 毛玻璃：`backdrop-filter: blur(18px) saturate(140%)`
- **内容区（treemap 画布 / 列表 / 图表）** = 不透明实底
- 限制叠加模糊层数（性能）

## INV-T5: 双主题 token

| token | 暗色 | 亮色 |
|---|---|---|
| 背景 bg | `#0a0b0f` | `#f4f5f7` |
| 玻璃外壳 | `rgba(255,255,255,.06)` + blur | `rgba(255,255,255,.55)` + blur |
| 内容区 surface | `#12141a` | `#ffffff` |
| 文本 / 次级 | `#e6e8ee` / `#9aa3b2` | `#1a1d24` / `#5b6472` |
| 强调 accent | `#7c83e8` | `#5a62d6` |

## INV-T6: 字体

- 英数：Geist / General Sans（数字等宽）
- 中文：思源黑体 / HarmonyOS Sans
- 避免 Inter

---
*Created: 2026-06-02*
