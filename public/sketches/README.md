# Sketches

把你喜欢的 p5.js sketch 放在这个目录里，每个文件一个 sketch。

## 格式要求

- 文件名：用 kebab-case，描述风格或主题，如 `particle-flow.js` / `noise-grid.js`
- 内容：标准 p5.js 代码，包含 `setup()` 和 `draw()`

## 示例文件名

```
particle-flow.js      # 粒子流动
noise-grid.js         # 噪声网格
color-waves.js        # 色彩波浪
minimal-lines.js      # 极简线条
sky-drift.js          # 天空漂浮（蓝色背景 + 云 + 粒子）
```

## 命名记录

- **`sky-drift.js`** — 天蓝色背景，Cloud 对象 + 漂浮 Particle
  - 理由：简洁涵盖云与粒子，强调动态漂浮感
  - 备选：`cloudy-sky`（直白）、`drifting-clouds`（主体导向）、`sky-particles`（技术感）

这些文件后续会被向量化，作为 Agent 理解你风格偏好的素材。
