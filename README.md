# 龟钮·印信 — X402 智能微支付协议

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/scnetadam/guiniu-seal)](https://github.com/scnetadam/guiniu-seal/stargazers)
[![Open Source](https://img.shields.io/badge/Open%20Source-Free-brightgreen)](https://github.com/scnetadam/guiniu-seal)

> **执印行权** · 每笔支付如印章落纸，可追溯、可验证、不可抵赖  
> **Seal of Authority** — Every payment lands like a seal on parchment: traceable, verifiable, non-repudiable.

> ⚠️ **合规声明 / Compliance Notice**  
> 本协议采用**直连模式**：资金从付款方直达收款方本人账户，协议层仅做触发、记账与哈希上链确权，**绝不触碰资金池**。  
> This protocol uses a **direct settlement model**: funds flow directly from payer to payee's own account. The protocol layer only triggers, records, and hash-anchors transactions — **it never touches the pool of funds.**
>
> **DISCLAIMER**: CN REGION FORCES CREDIT LEDGER + PAY + JINSHUI OAUTH; INTL REGION USERS X402 NATIVE.  
> 代码国内部署需自行取得委托代征/分账税务资质。本开源版仅提供接口定义（interface），核心引擎实现不含于开源代码中。  
> Tax compliance: Users must obtain their own commissioned tax collection / split-account tax qualifications for domestic deployment.

---

## 🌐 龟钮三驾马车

```
┌─────────────────────────────────────────────────────────┐
│                    龟钮·印信 (Seal)                       │
│                    手 · 骨骼 · 支付网关                    │
│          ╱        支付宝 / 微信 / e-CNY 三通道          │
├─────────────────────────────────────────────────────────┤
│                    龟钮·印证 (Verify)                     │
│                    脑 · 基因 · 数据存证                    │
│          ╱        Hash上链 / 公证 / 数据市场             │
├─────────────────────────────────────────────────────────┤
│                    龟钮·自驭 (Deveco)                     │
│                    身 · 神经 · AI智能体                   │
│          ╱        KOL权重 / 三轨税务 / 内容生态           │
└─────────────────────────────────────────────────────────┘
```

**价值双螺旋 VDB**：信息流（内容创作↔数据存证）× 资金流（支付结算↔KOL分账）

---

## ✨ 核心功能

### 🏦 结算引擎 (Settle Engine)

| 模块 | 说明 |
|------|------|
| **💳 三通道支付** | 支付宝 · 微信支付 · 数字人民币 (e-CNY) |
| **📊 智能分账** | 权重驱动，支持自定义分账规则 (SplitContract) |
| **🧾 三轨税务** | A轨工资薪金 / B轨劳务报酬 / C轨经营所得 |
| **🔗 存证流(第四流)** | 每笔交易自动创建 SHA256 不可篡改存证快照 |
| **🔄 扩展流** | 5流(非标合同) / 6流(实物交付) 预留接口 |

### 🧠 AI 协调层 (Orchestrator)

- **权重协调**：内容访问量/停留时长/互动深度/分享传播 → 实时加权
- **支付存证联动**：印信结算 → 印证公证 → 自驭权重更新 → 回流分账
- **用户收益通知**：站内信 / 邮件 / 短信 实时提醒
- **失败重试**：协调队列持久化，最多3次自动重试

### 🤖 Agent 支付

| 通道 | 状态 | 说明 |
|------|------|------|
| 支付宝 ACT+MCP | ✅ | NFC/二维码/MCP智能路由/子商户 |
| 微信 AI 专属卡 | ✅ | 额度管理/自动扣款/授权代理 |
| 银联 AI 支付 | ✅ | 快捷支付/跨境支付/汇率查询 |
| e-CNY 伞列分账 | ✅ | 建行伞列架构，KOL权重触发自动清分 |

---

## 🏗️ 四流合一架构

```
                  ┌──────────────────────────────┐
    支付流 ──────►│  ① 结算流 (Settle)           │
                  │  ┌─ 支付宝 ─┐                 │
       分账流 ────►│  ├─ 微信   ─┤  ② 分账流       │
                  │  └─ e-CNY  ─┘                 │
       税务流 ────►│  ③ 税务流 (TaxEngine)        │
                  │  A轨/B轨/C轨 自动计算         │
       存证流 ────►│  ④ 存证流 (NotaryEngine)     │
                  │  SHA256快照·完整性验证         │
                  └──────────┬───────────────────┘
                             │
                             ▼
                  ┌──────────────────────────────┐
                  │    协调层 Orchestrator         │
                  │  印信→印证→自驭 AI联动         │
                  └──────────────────────────────┘
```

**预留扩展**：
- 5流：非标合同流（电子合同/签章关联）
- 6流：B端实物交付流（物流/签收/验收）
- N流：场景化扩展接口（`attachStream`）

---

## 🚀 快速开始

### 后端

```bash
cd backend
cp .env.example .env
npm install
npm start
# 默认端口 3000，API: /api/settle/checkout
```

### 前端

```bash
cd frontend
npm install
npm run dev
# HBuilderX 或 uni-app CLI
```

### 一键初始化

```bash
# 写入种子数据 + 创建存证测试
node src/seed-engine/cli.js --force
# 仅检测状态
node src/seed-engine/cli.js --check
```

---

## 📁 目录结构

```
guiniu-seal/
├── LICENSE                     # Apache 2.0
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── README.md
├── backend/
│   └── src/
│       ├── index.js            # 入口
│       ├── routes/
│       │   ├── settle.js       # ⭐ 四流合一结算引擎（核心）
│       │   ├── agentPay.js     # Agent 支付
│       │   ├── auth.js         # 认证
│       │   ├── payment.js      # 支付
│       │   ├── wallet.js       # 钱包
│       │   ├── ai.js           # AI 代理
│       │   ├── dataLock.js     # 数据锁定
│       │   ├── gitRepoTracker.js # GitHub追踪
│       │   └── notification.js # 通知
│       ├── orchestrator/       # 协调层
│       ├── seed-engine/        # 种子引擎
│       └── models/
├── frontend/
│   └── src/
│       ├── pages/              # 首页/付款/收款/账单/钱包 ...
│       └── api/
├── deploy/                     # Nginx / 部署
└── docs/
```

---

## 📊 三轨税务引擎

| 税务轨 | 适用场景 | 扣缴方式 | 发票 |
|--------|---------|---------|------|
| **A轨** | 工资薪金（雇主关系） | 雇主代扣代缴 | ❌ |
| **B轨** | 劳务报酬（KOL/KOC） | 单笔>800 预扣20%，月累>1万强制 | ✅ |
| **C轨** | 经营所得（个体户） | 全额拨付，自行开票 | ✅ 需自行 |

### 风险标签
- 🔴 高频交易警戒：单日≥5笔
- 🟡 月累超限：累计>1万元，建议引导C轨
- 🟢 小额暂扣：≤800元且月累≤1万，月底汇总

---

## 🔗 相关项目

| 项目 | 状态 | 定位 |
|------|------|------|
| [龟钮·印信 (Seal)](https://github.com/scnetadam/guiniu-seal) | **开源** ⭐ | 支付网关 · 四流合一结算 |
| 龟钮·印证 (Verify) | 闭源 | 数据存证 · 公证 · 数据市场 |
| 龟钮·自驭 (Deveco) | 闭源 | AI智能体 · KOL权重 · 内容生态 |

---

## 🤝 参与贡献

欢迎 Issue 和 PR！请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)

**开源路线图：**
- ✅ 三通道支付（支付宝/微信/e-CNY）
- ✅ 权重分账引擎 + 四流合一
- ✅ 三轨税务处理
- ✅ 协调层（支付→存证→权重→通知）
- ✅ 两阶段结算（prepare→confirm两次确认）
- ✅ Wallet预扣机制（check→reserve→execute→release）
- ✅ 通道差异AI评估（ChannelCapability）
- ✅ AI阀值引擎（龟钮点累计→分账触发）
- ✅ CollectorAgent（4流核心轴+熔断+死信队列）
- ✅ 税务回环状态机（pending→declared→verified→incentivized）
- ✅ 通知多渠道调度（NotifyChannel接口+SMS/Email/InApp/Login）
- ✅ SSO跨项目认证（JWT签发中心）
- ✅ 幂等键防双重扣款
- ✅ FileStore写入队列+乐观锁
- 🔲 统一收银台 UI 组件
- 🔲 数据市场 B端入口
- 🔲 开发者文档 SDK

---

**龟钮哲学** · 2000 年秦汉文化 → 硅基文明契约基石  
**数据二十条** · 三权分置落地  
**新质生产力** · AI 配电箱

**执印行权 · 验印存真 · 鉴真鉴价**  
Authority · Authenticity · Appraisal

---

[![Star History Chart](https://api.star-history.com/svg?repos=scnetadam/guiniu-seal&type=Date)](https://star-history.com/#scnetadam/guiniu-seal&Date)
