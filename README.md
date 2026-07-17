# 龟钮·印信 — X402 智能微支付协议

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/guiniu/seal)](https://github.com/guiniu/seal/stargazers)

**龟钮·印信** 是一个开源的智能微支付协议，专为 AI Agent 时代设计。支持法币（支付宝/微信）和链上（USDC/ETH）双轨结算，赋能 AI Agent 微交易生态。

> 龟钮文化：执印行权——每一笔支付如印章落纸，可追溯、可验证、不可抵赖。

---

## 核心功能

| 功能 | 说明 |
|------|------|
| 💰 **个人转账** | 用户间 P2P 转账，支持多支付通道 |
| 🤖 **Agent 支付** | AI 智能体发起微交易，授权额度管理 |
| 📱 **扫码收款** | 生成收款码，扫码即付 |
| 📊 **交易流水** | 账单查询，支持筛选和导出 |
| 🪪 **数字钱包** | 余额管理，多通道余额聚合 |
| 🧠 **AI 助手** | 智能问答，语音指令（需配合龟钮·印鉴） |

## 架构

```
┌──────────────────────┐
│   前端 (uni-app)      │  ← 支付宝/微信小程序
├──────────────────────┤
│   后端 (Node.js)      │  ← Express API
├──────────────────────┤
│   AI 代理层           │  ← 调用龟钮·印鉴 AI 服务
├──────────────────────┤
│   支付通道             │  ← 支付宝/微信/USDC/ETH
└──────────────────────┘
```

## 快速开始

### 环境要求

- Node.js ≥ 18
- npm ≥ 9

### 后端启动

```bash
cd backend
cp .env.example .env   # 编辑配置
npm install
npm start              # 默认 http://localhost:3000
```

### 前端开发

```bash
cd frontend
npm install
npm run dev            # HBuilderX 或 uni-app CLI
```

### 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3000 | 后端端口 |
| `AI_SERVICE_URL` | `http://localhost:80` | AI 服务内网地址 |

## 目录结构

```
guiniu-seal/
├── LICENSE                 # Apache 2.0 许可证
├── CONTRIBUTING.md         # 贡献指南
├── CODE_OF_CONDUCT.md      # 行为准则
├── backend/                # 后端服务
│   ├── src/
│   │   ├── index.js        # 入口
│   │   ├── routes/
│   │   │   ├── ai.js       # AI 代理路由
│   │   │   ├── auth.js     # 认证
│   │   │   ├── payment.js  # 支付
│   │   │   ├── wallet.js   # 钱包
│   │   │   └── agentPay.js # Agent 支付
│   │   └── models/
│   │       └── dataStore.js
│   └── package.json
├── frontend/               # 前端 uni-app
│   └── src/
│       ├── api/
│       ├── pages/
│       │   ├── home/       # 首页
│       │   ├── pay/        # 支付
│       │   ├── wallet/     # 钱包
│       │   ├── bills/      # 账单
│       │   ├── ai-chat/    # AI 助手
│       │   ├── profile/    # 我的
│       │   └── login/      # 登录
│       └── pages.json
├── deploy/                 # 部署配置
│   ├── nginx-guiniu.conf
│   └── DEPLOY.md
└── docs/
    └── SPLIT_PLAN.md
```

## 技术栈

- **前端**: uni-app (Vue 3 + TypeScript)
- **后端**: Node.js + Express
- **AI**: 代理模式调用龟钮·印鉴（GLM 大模型）
- **支付通道**: 支付宝、微信、USDC、ETH
- **数据库**: 文件 JSON 存储（开发环境）/ PostgreSQL（生产环境）

## 许可证

Apache License 2.0 — 详见 [LICENSE](LICENSE)

## 贡献

欢迎贡献！请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解分支规范和提交流程。

## 相关项目

- [龟钮·印证](https://github.com/guiniu/verify) — 数据存证集市（闭源）
- [龟钮·印鉴](https://github.com/guiniu/deveco) — 汽车 AI 智能体（闭源）

---

**龟钮体系** — 执印行权 · 验印存真 · 鉴真鉴价