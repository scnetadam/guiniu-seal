# 龟钮体系 · 项目拆分规划

> 日期：2026-07-18
> 决策：将原有 `D:/X402` 项目拆分为三个独立项目，各司其职。

---

## 一、拆分总览

| 项目 | 目录 | 定位 | 开源/闭源 | 核心产品 |
|------|------|------|-----------|---------|
| **龟钮·印信** | `D:/X402` | X402 智能微支付协议 | **开源** | X402 SDK + Agent Pay 小程序 |
| **龟钮·印证** | `D:/X402-GUINIU` | Hash 去中心化数据存证集市 | **闭源** | 数据市场 + 存证平台 |
| **龟钮·印鉴** | `D:/X402-DEVECO` | 汽车 AI 智能体 | **闭源** | 汽车资讯/KOC/商家 SaaS |

---

## 二、各项目范围与边界

### 1. 龟钮·印信 `D:/X402` — 开源项目

**核心寓意**："执印行权"。古代官员手握龟钮印信才能调兵、发文、批银。对应现代，用户（Agent/人）手握私钥（印信）才能进行支付、授权扣款。

**Slogan**：执信购万物 · Pay with Seal

**范围划定**：
- ✅ X402 协议核心层（SDK/合约）
- ✅ 聚合支付（支付宝/微信/链上 L1 适配器）
- ✅ Agent 支付授权与管理（额度、单次/每日上限）
- ✅ 收款码、订单流水、结算面板
- ✅ 数据贡献开关（用户授权匿名化数据送入数据集市）
- ✅ 开源 README（中英双语）、CONTRIBUTING、LICENSE
- ✅ 小程序前端：`x402-frontend`（精简为支付核心页）
- ✅ 后端：`backend`（支付结算逻辑）
- ✅ 支付后端：`payment_backends`
- ✅ Worker 云函数：`worker`

**剥离出**：
- ❌ 数据市场相关页面（dataMarket, dataEarnings, dataConsent）
- ❌ AI 客服（ai-chat）
- ❌ 汽车资讯相关（activity, aivideo, koltask 等）
- ❌ HarmonyOS 构建配置

**执行动作**：
1. 将 `D:/X402` 作为开源仓库根目录
2. 清理前端 pages：只保留 home, bills, pay, wallet, login, agent-pay, booking, biz, collect, promotion, notary, governance, profile
3. 移除 dataMarket, dataEarnings, dataConsent 页面（移到龟钮印证）
4. 移除 ai-chat 页面（移到龟钮印鉴）
5. 重写 README 为中英双语开源版本

---

### 2. 龟钮·印证 `D:/X402-GUINIU` — 数据市场

**核心寓意**："验印存真"。古代文书往来需要核对印证来辨真去伪。对应现代，数据通过 Hash 算法生成唯一"印痕"，永久存证，不可篡改。

**Slogan**：落证存万载 · Hash the Truth

**范围划定**：
- ✅ 数据商品货架（汽车口碑、消费倾向等数据集）
- ✅ 数据清洗工具（脱敏、标注）
- ✅ API 接口调用统计
- ✅ 数据确权证书查看（Hash 浏览器）
- ✅ 数据存证上链（公证云）
- ✅ 数据贡献者收益面板
- ✅ 数据市场交易撮合

**新建目录**：`D:/X402-GUINIU`

**初始构建**：
1. 从 `D:/X402` 复制基础项目脚手架
2. 引入 dataMarket, dataEarnings, dataConsent 页面
3. 新建后端存证服务模块
4. 独立部署，独立域名/小程序

**与印信的关系**：
- 印信（支付端）负责"造血"和"养鱼"——产生支付流水数据
- 印证（数据端）负责"捕鱼"和"卖鱼"——数据确权与变现
- 数据流双向打通：支付 Hash → 数据市场确权 → 数据变现 → 分账回支付端

---

### 3. 龟钮·印鉴 `D:/X402-DEVECO` — 汽车 AI 智能体

**核心寓意**：印鉴为信，鉴真鉴价。汽车行业的决策工具与 AI 引擎。

**定位**：闭源商业化核心产品，不对外开源。

**范围**：
- ✅ KOL/KOC 影响力算法（核心商业秘密）
- ✅ 实时舆情分析引擎（NLP 微调模型）
- ✅ 汽车资讯/视频/活动推广
- ✅ AI 智能助手（AI 客服）
- ✅ AI 视频生成
- ✅ KOL 任务管理
- ✅ 商家工作台
- ✅ OPC 创业广场
- ✅ 内容发布与结算
- ✅ HarmonyOS 原生应用

**注意**：`D:/X402-DEVECO` 目前已有完整的全栈结构，包含 HarmonyOS 构建配置，**保持独立发展**，不参与拆分合并。

---

## 三、命名体系

| 项目 | 正式名 | 品牌名 | 英文名 | 品牌色 |
|------|--------|--------|--------|--------|
| 支付 | 龟钮·印信 | 印信 | X402 Pay | 朱红/金石 |
| 数据 | 龟钮·印证 | 印证 | HashData Market | 科技蓝/碳灰 |
| 汽车 | 龟钮·印鉴 | 印鉴 | AutoAI Agent | 古铜金 |

---

## 四、执行步骤

### Step 1：清理 `D:/X402`（龟钮印信）

1. 移除前端 dataMarket, dataEarnings, dataConsent 页面
2. 移除 ai-chat 页面
3. 重写 README 为中英双语开源版
4. 补充 LICENSE（Apache 2.0）
5. 补充 CONTRIBUTING.md
6. 补充 CODE_OF_CONDUCT.md

### Step 2：新建 `D:/X402-GUINIU`（龟钮印证）

1. 复制 `D:/X402` 项目脚手架
2. 引入 dataMarket, dataEarnings, dataConsent 页面
3. 新建后端存证服务模块
4. 配置独立部署
5. 编写 README

### Step 3：完善 `D:/X402-DEVECO`（龟钮印鉴）

1. 保持现有结构不动
2. 确认品牌名改为"龟钮·印鉴"
3. 更新 README 和品牌文档

---

## 五、开源策略（龟钮印信）

### 开源内容
- X402 SDK（JS/Python/Go，支持一行代码接入微支付）
- 支付结算模块（透明分账逻辑）
- 基础智能合约（支付池、权益证明）
- L1 法币适配器（支付宝/微信）

### 不开源内容
- 企业级分账、多商户资金归集
- T+1 清算、税务对接
- 数据市场算法

### 引流定位
> "Multi-settlement Layer: Native X402 (USDC/ETH) for Agent economy, with L1 fiat adapters (Alipay/WeChat Pay) for real-world merchants. Start with fiat, migrate to on-chain when your Agent goes global."

### 合规红线
- 代码层设计为"直连模式"——钱从付款方 → 商家本人账户
- 协议只做触发 + 记账 + 哈希上链确权，不碰资金池
- 开源 README 中明确说明合规边界

---

## 六、阶段路线图

| 阶段 | 时间 | 重点 |
|------|------|------|
| 第一阶段 | 现在 | 拆分完成，龟钮印信开源上线 |
| 第二阶段 | Q3 2026 | 龟钮印证 MVP，数据市场起步 |
| 第三阶段 | Q4 2026 | 龟钮印鉴商业化 + 数据闭环跑通 |
| 第四阶段 | 2027 | AI 大模型微调 + 数据变现 |

---

## 七、附录：原项目文件映射

| 原路径 | 归属项目 | 说明 |
|--------|----------|------|
| `D:/X402/x402-frontend/src/pages/home` | 印信 | 首页 |
| `D:/X402/x402-frontend/src/pages/bills` | 印信 | 账单 |
| `D:/X402/x402-frontend/src/pages/pay` | 印信 | 支付 |
| `D:/X402/x402-frontend/src/pages/wallet` | 印信 | 钱包 |
| `D:/X402/x402-frontend/src/pages/agent-pay` | 印信 | Agent 支付 |
| `D:/X402/x402-frontend/src/pages/booking` | 印信 | 预约 |
| `D:/X402/x402-frontend/src/pages/collect` | 印信 | 收款 |
| `D:/X402/x402-frontend/src/pages/login` | 印信 | 登录 |
| `D:/X402/x402-frontend/src/pages/promotion` | 印信 | 推广 |
| `D:/X402/x402-frontend/src/pages/notary` | 印信 | 公证 |
| `D:/X402/x402-frontend/src/pages/governance` | 印信 | 治理 |
| `D:/X402/x402-frontend/src/pages/profile` | 印信 | 个人中心 |
| `D:/X402/x402-frontend/src/pages/biz` | 印信 | 商家 |
| `D:/X402/x402-frontend/src/pages/dataMarket` | **印证** | 数据市场 → 移出 |
| `D:/X402/x402-frontend/src/pages/dataEarnings` | **印证** | 数据收益 → 移出 |
| `D:/X402/x402-frontend/src/pages/dataConsent` | **印证** | 数据授权 → 移出 |
| `D:/X402/x402-frontend/src/pages/ai-chat` | **印鉴** | AI 客服 → 移出 |
| `D:/X402/x402-frontend/src/pages/activity` | 印鉴 | 活动 |
| `D:/X402/x402-frontend/src/pages/aivideo` | 印鉴 | AI 视频 |
| `D:/X402/x402-frontend/src/pages/koltask` | 印鉴 | KOL 任务 |
| `D:/X402/x402-frontend/src/pages/opc` | 印鉴 | OPC 创业广场 |
| `D:/X402/x402-frontend/src/pages/publish` | 印鉴 | 内容发布 |
| `D:/X402/x402-frontend/src/pages/settlement` | 印鉴 | 结算 |
| `D:/X402/x402-frontend/src/pages/share` | 印鉴 | 分享 |
| `D:/X402/x402-frontend/src/pages/video` | 印鉴 | 视频 |
| `D:/X402/backend/backend` | 印信 | 后端 |
| `D:/X402/payment_backends` | 印信 | 支付后端 |
| `D:/X402/worker` | 印信 | Worker |
| `D:/X402-DEVECO/frontend` | 印鉴 | 前端 |
| `D:/X402-DEVECO/payment_backends` | 印鉴 | 支付后端 |
| `D:/X402-DEVECO/worker` | 印鉴 | Worker |
| `D:/X402-DEVECO/entry` | 印鉴 | HarmonyOS 原生 |
| `D:/X402-DEVECO/AppScope` | 印鉴 | HarmonyOS 配置 |