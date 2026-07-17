# Contributing to 龟钮·印信 (X402 Protocol)

感谢您对龟钮·印信开源项目的关注！我们欢迎任何形式的贡献——代码、文档、Bug 报告、功能建议。

## 行为准则

本项目遵循[贡献者公约](CODE_OF_CONDUCT.md)。参与即表示您同意遵守该准则。

## ⚠️ 合规红线 / Compliance Red Line

本项目是**直连支付协议**，资金从付款方直达收款方，协议层不触碰资金池。

**严禁在开源代码中引入以下功能：**
- 平台代收资金再分发的资金归集逻辑
- 用户资金沉淀在平台账户的设计
- 任何形式的"二清"（二次清算）模式

如需企业级资金归集、多商户分账、T+1 清算等功能，请联系闭源商用授权版本。

Any platform built on this protocol must ensure: funds flow directly from payer to payee. The protocol must never hold, pool, or intermediate user funds. Violations of local financial regulations (including but not limited to illegal payment aggregation) are the responsibility of the deploying party.

## 如何贡献

### 1. 报告 Bug

- 使用 GitHub Issues 提交
- 标题清晰描述问题
- 包含复现步骤、预期行为、实际行为
- 附上相关日志、截图、环境信息

### 2. 功能建议

- 先搜索现有 Issues 避免重复
- 描述使用场景和期望行为
- 说明为什么这个功能对开源社区有价值

### 3. 代码贡献

#### 分支规范

| 分支 | 用途 |
|------|------|
| `main` | 稳定版本，仅通过 PR 合并 |
| `develop` | 开发分支 |
| `feature/*` | 功能分支，从 develop 切出 |
| `fix/*` | 修复分支 |
| `docs/*` | 文档变更 |

#### 提交规范

```
<type>(<scope>): <subject>

<body>

<footer>
```

**type 类型：**

- `feat` — 新功能
- `fix` — Bug 修复
- `docs` — 文档
- `style` — 代码格式（非逻辑变更）
- `refactor` — 重构
- `test` — 测试
- `chore` — 构建/工具

**示例：**

```
feat(payment): 支持 USDC 链上结算

- 新增 USDC 支付通道
- 集成以太坊合约交互
- 添加链上交易状态查询

Closes #42
```

#### PR 流程

1. Fork 本仓库
2. 从 `develop` 创建功能分支 `feature/my-feature`
3. 提交变更
4. 确保测试通过
5. 发起 Pull Request 到 `develop`
6. 等待 Code Review

### 4. 文档贡献

文档位于 `docs/` 目录，支持中英文双语。提交前请：

- 保持中英文版本同步
- 遵循现有文档风格
- 检查拼写和语法

## 开发环境

```bash
# 安装依赖
cd backend && npm install

# 配置环境变量
cp .env.example .env

# 启动开发服务器
npm run dev
```

环境变量参考 `.env.example` 文件。

## 架构说明

```
x402/
├── backend/          # Node.js Express 后端
│   ├── src/
│   │   ├── routes/   # API 路由
│   │   ├── models/   # 数据模型
│   │   └── index.js  # 入口文件
│   └── package.json
├── x402-frontend/    # uni-app 前端
│   └── src/
│       ├── pages/    # 页面
│       ├── api/      # API 封装
│       └── utils/    # 工具
└── docs/             # 文档
```

## 测试

```bash
# 运行后端测试
cd backend && npm test

# 运行前端 lint
cd x402-frontend && npm run lint
```

## 安全披露

发现安全漏洞请直接联系维护者，不要公开提交 Issue。

## 许可证

参与贡献即表示您同意您的贡献将在 [Apache 2.0](LICENSE) 许可下发布。

---

感谢您为龟钮·印信开源社区做出的贡献！🐢