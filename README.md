# Agentic Creative Coding

一个**个性化 creative coding 伴侣 Agent**——读过你的作品，所以它的建议不是通用的，是"你的"。

---

## 项目概述

大多数 AI 代码生成工具生成的是通用代码。这个项目解决的问题是：**如何让 Agent 真正理解一个创作者的美学语言，并据此生成有个人风格的作品。**

核心思路：将用户历史 sketch 向量化为风格档案，Agent 每次响应前先检索最相关的参考作品，再结合自动提取的风格特征和用户自述，生成有针对性的输出。

---

## 技术架构

```
┌─────────────────────────────────────────────┐
│  JS Frontend (p5.js canvas + vanilla JS)    │
│  - 四种 Agent 模式切换界面                   │
│  - 实时代码预览 (iframe sandbox)             │
└─────────────────┬───────────────────────────┘
                  │ HTTP API
┌─────────────────▼───────────────────────────┐
│  Python Backend (FastAPI)                   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  LangGraph Agent                     │   │
│  │  router → muse/critic/builder/curator│   │
│  └──────────────────┬───────────────────┘   │
│                     │                       │
│  ┌──────────────────▼──────────┐            │
│  │  RAG Pipeline               │            │
│  │  ChromaDB + text-embedding  │            │
│  │  style_profile.json         │            │
│  └─────────────────────────────┘            │
│                                             │
│  LLM: 阿里通义千问 (OpenAI 兼容接口)         │
└─────────────────────────────────────────────┘
```

**技术栈**

| 层级 | 技术选型 | 选型理由 |
|------|---------|---------|
| Agent 框架 | LangGraph | 状态机管理多角色切换，比 LangChain chains 更灵活 |
| 向量数据库 | ChromaDB | 本地持久化，开发阶段无需外部服务 |
| Embedding | text-embedding-v3 (阿里) | 与 LLM 同一 provider，减少依赖 |
| LLM | 阿里通义千问 qwen-plus | Tool Use 需要 plus 以上；成本比 Claude 低 ~10x |
| 后端 | FastAPI + uvicorn | 异步支持，适合 LLM 调用的 I/O 密集型场景 |
| 前端 | Vanilla JS + p5.js | creative coding 的原生生态，无需框架 |

---

## Agent 设计

### 四种角色模式

| 模式 | 角色 | 触发场景 |
|------|------|---------|
| **Builder** | p5.js 工程师 | 生成可运行的 sketch 代码 |
| **Muse** | 创意挑衅者 | 生成创作提示，推动风格边界 |
| **Critic** | 风格分析师 | 分析作品与个人美学的一致/断裂 |
| **Curator** | 档案策展人 | 发现作品集里的隐藏模式 |

用户可手动切换模式；若未指定，Router 节点根据输入内容自动判断。

### LangGraph 状态机

```
user_input → [router] → muse     → END
                      → critic   → END
                      → builder  → END
                      → curator  → END
```

Builder 和 Curator 角色使用 **Tool Use agentic loop**：
1. 模型决定调用 `search_style` 工具检索相似 sketch
2. 获取风格 context 后调用 `generate_sketch`
3. 循环直到模型返回最终文本（无更多 tool calls）

### 个性化风格系统

风格档案由两层构成：

```
自动提取层  →  分析所有 sketch 代码，提取颜色/运动/密度/结构/情绪特征
用户自述层  →  用户用自然语言描述偏好（可选）
     ↓
风格 synthesis（LLM 合成的风格简报）→ 注入 Builder system prompt
```

---

## 关键设计决策

**1. Python 后端 + JS 前端分离**
AI agent 生态（LangGraph、ChromaDB 等）以 Python 为主；creative coding 可视化原生在浏览器。两者通过 HTTP API 连接，各自用最合适的生态。

**2. LLM Provider 抽象层**
通过工厂模式封装 LLM 调用，切换 provider 只改 `.env`，业务逻辑不动。当前用阿里通义（成本低、国内访问稳定），接口兼容 Claude / OpenAI。

**3. RAG 注入风格描述而非原始代码**
直接把 sketch 源码塞进 prompt，模型难以提取风格语义。改为先从代码中提炼 `style_notes` / `mood` / `palette` / `motion`，向量化描述而非代码——检索精度和注入效果都更好。

**4. 冷启动问题**
新用户没有历史 sketch 时系统无从参考。当前方案：允许用户从外部收藏 sketch 作为初始风格素材（待实现），同时接受"冷启动时 Agent 是通用的"作为合理初始状态。

---

## 本地运行

**环境要求**：Python 3.12+

```bash
# 1. 创建虚拟环境并安装依赖
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt

# 2. 配置环境变量
cp .env.example .env
# 填入 ALIYUN_API_KEY

# 3. 启动
.venv/bin/uvicorn main:app --port 3000 --reload
```

访问 `http://localhost:3000`

**建立索引**（添加新 sketch 后运行）：
```bash
curl -X POST http://localhost:3000/api/build-index
curl -X POST http://localhost:3000/api/build-style
```

---

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/generate` | 主入口，body: `{description, mode?, sketch_code?}` |
| POST | `/api/build-index` | 重建 RAG 向量索引 |
| POST | `/api/build-style` | 重新分析风格档案 |
| POST | `/api/style-statement` | 更新用户自述偏好 |
| GET  | `/api/style-profile` | 查看当前风格档案 |
| GET  | `/api/config` | 查看当前 LLM 配置 |

---

## 项目结构

```
.
├── main.py                  # FastAPI 入口
├── backend/
│   ├── graph.py             # LangGraph 状态机 + 四个角色节点
│   ├── rag.py               # RAG pipeline (ChromaDB)
│   ├── style_profile.py     # 个性化风格档案系统
│   ├── tools.py             # Agent 工具定义
│   └── llm.py               # LLM 调用封装
├── public/
│   ├── index.html           # 前端界面
│   └── sketches/            # 用户 sketch 库 (*.js + *.meta.json)
├── data/
│   ├── chroma/              # ChromaDB 持久化存储
│   └── style_profile.json   # 风格档案
└── requirements.txt
```
