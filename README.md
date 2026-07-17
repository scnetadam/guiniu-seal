# 龟钮·印信 — X402 智能微支付协议

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/scnetadam/guiniu-seal)](https://github.com/scnetadam/guiniu-seal/stargazers)

> **执印行权** · 每一笔支付如印章落纸，可追溯、可验证、不可抵赖  
> **Seal of Authority** — Every payment lands like a seal on parchment: traceable, verifiable, non-repudiable.

> ⚠️ **合规声明 / Compliance Notice**  
> 本协议采用**直连模式**：资金从付款方直达收款方本人账户，协议层仅做触发、记账与哈希上链确权，**绝不触碰资金池**。  
> This protocol uses a **direct settlement model**: funds flow directly from payer to payee's own account. The protocol layer only triggers, records, and hash-anchors transactions — **it never touches the pool of funds.**  
> 任何使用本协议构建的平台，须自行确保其运营符合当地金融监管法规，包括但不限于支付牌照、反洗钱（AML）及了解你的客户（KYC）要求。  
> Any platform built on this protocol must ensure compliance with local financial regulations, including but not limited to payment licensing, AML, and KYC requirements.

---

## 📖 项目简介 / About

**龟钮·印信** 是一个开源的智能微支付协议，专为 AI Agent 时代设计。  
**Guiniu Seal** is an open-source smart micro-payment protocol built for the AI Agent era.

支持法币（支付宝/微信）和链上（USDC/ETH）双轨结算，赋能 AI Agent 微交易生态。  
Supports dual-rail settlement — fiat (Alipay/WeChat) and on-chain (USDC/ETH) — powering AI Agent micro-transaction ecosystems.

**核心定位 / Core Positioning**  
> Multi-settlement Layer: Native X402 (USDC/ETH) for Agent economy, with L1 fiat adapters (Alipay/WeChat Pay) for real-world merchants. Start with fiat, migrate to on-chain when your Agent goes global.

龟钮（Guiniu）源自汉代官印龟钮制度，象征权威与信诺。本项目将印章精神注入数字支付：  
The name "Guiniu" (tortoise-knob seal) originates from Han dynasty official seals, symbolizing authority and trust. We bring this spirit into digital payments.

---

## ✨ 核心功能 / Features

| 功能 / Feature | 说明 / Description |
|---|---|
| 💰 **个人转账** / P2P Transfer | 用户间转账，支持多支付通道 / Peer-to-peer transfer with multi-channel support |
| 🤖 **Agent 支付** / Agent Payment | AI 智能体发起微交易，授权额度管理 / AI-agent-initiated micro-transactions with quota management |
| 📱 **扫码收款** / QR Collection | 生成收款码，扫码即付 / Generate payment QR codes for instant collection |
| 📊 **交易流水** / Transaction Log | 账单查询，筛选导出 / Bill inquiry with filtering and export |
| 🪪 **数字钱包** / Digital Wallet | 余额管理，多通道聚合 / Balance management with multi-channel aggregation |
| 🧠 **AI 助手** / AI Assistant | 智能问答，语音指令（需配合龟钮·印鉴） / Smart Q&A with voice commands (requires Guiniu Deveco) |

---

## 🏗️ 架构 / Architecture

```
┌──────────────────────────┐
│  前端 Frontend (uni-app)  │  ← 支付宝/微信小程序 / Alipay/WeChat Mini App
├──────────────────────────┤
│  后端 Backend (Node.js)   │  ← Express REST API
├──────────────────────────┤
│  AI 代理层 AI Proxy       │  ← 调用龟钮·印鉴 AI 服务 / Proxies to Guiniu Deveco AI
├──────────────────────────┤
│  支付通道 Payment Rails    │  ← 支付宝 / 微信 / USDC / ETH
└──────────────────────────┘
```

### 数据流 / Data Flow

```
用户 → 小程序 → Nginx → 后端 API → AI 代理 → 龟钮·印鉴（AI 服务）
                        → 支付通道 → 结算完成
```

---

## 🚀 快速开始 / Quick Start

### 环境要求 / Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9

### 后端启动 / Backend

```bash
cd backend
cp .env.example .env   # 编辑配置 / Edit configuration
npm install
npm start              # 默认端口 3000 / Default port 3000
```

### 前端开发 / Frontend

```bash
cd frontend
npm install
npm run dev            # HBuilderX 或 uni-app CLI
```

### 环境变量 / Environment Variables

| 变量 / Variable | 默认值 / Default | 说明 / Description |
|---|---|---|
| `PORT` | `3000` | 后端端口 / Backend port |
| `AI_SERVICE_URL` | `http://localhost:80` | AI 服务内网地址 / AI service internal address |

---

## 📁 目录结构 / Directory Structure

```
guiniu-seal/
├── LICENSE                  # Apache 2.0
├── CONTRIBUTING.md          # 贡献指南 / Contribution Guide
├── CODE_OF_CONDUCT.md       # 行为准则 / Code of Conduct
├── README.md                # 本文档 / This file
├── backend/                 # 后端服务 / Backend Service
│   ├── src/
│   │   ├── index.js         # 入口 / Entry point
│   │   ├── routes/
│   │   │   ├── ai.js        # AI 代理路由 / AI proxy routes
│   │   │   ├── auth.js      # 认证 / Authentication
│   │   │   ├── payment.js   # 支付 / Payment
│   │   │   ├── wallet.js    # 钱包 / Wallet
│   │   │   └── agentPay.js  # Agent 支付 / Agent Payment
│   │   └── models/
│   │       └── dataStore.js # 文件持久化 / File-based persistence
│   └── package.json
├── frontend/                # 前端 uni-app / Frontend
│   └── src/
│       ├── api/             # API 封装 / API wrappers
│       ├── pages/
│       │   ├── home/        # 首页 / Home
│       │   ├── pay/         # 支付 / Payment
│       │   ├── wallet/      # 钱包 / Wallet
│       │   ├── bills/       # 账单 / Bills
│       │   ├── ai-chat/     # AI 助手 / AI Assistant
│       │   ├── profile/     # 我的 / Profile
│       │   └── login/       # 登录 / Login
│       └── pages.json
├── deploy/                  # 部署配置 / Deployment Config
│   ├── nginx-guiniu.conf
│   └── DEPLOY.md
└── docs/
    └── SPLIT_PLAN.md
```

---

## 🛠️ 技术栈 / Tech Stack

| 层 / Layer | 技术 / Technology |
|---|---|
| **前端 Frontend** | uni-app (Vue 3 + TypeScript) |
| **后端 Backend** | Node.js + Express |
| **AI 能力 AI** | 代理模式调用龟钮·印鉴（GLM 大模型） / Proxy mode via Guiniu Deveco (GLM LLM) |
| **支付通道 Payment** | 支付宝 Alipay / 微信 WeChat / USDC / ETH |
| **数据存储 Storage** | 文件 JSON（开发） / File JSON (dev) → PostgreSQL（生产 / production） |

---

## 📜 许可证 / License

Apache License 2.0 — 详见 / See [LICENSE](LICENSE)

---

## 🤝 贡献 / Contributing

欢迎贡献！请阅读 / Please read [CONTRIBUTING.md](CONTRIBUTING.md)  
了解分支规范和提交流程 / Learn about branch conventions and PR workflow.

---

## 🔗 相关项目 / Related Projects

- [龟钮·印证 / Guiniu Verify](https://github.com/guiniu/verify) — 数据存证集市（闭源 / Closed Source）
- [龟钮·印鉴 / Guiniu Deveco](https://github.com/guiniu/deveco) — 汽车 AI 智能体（闭源 / Closed Source）

---

**龟钮体系 / Guiniu Ecosystem**  
执印行权 · 验印存真 · 鉴真鉴价  
Authority · Authenticity · Appraisal