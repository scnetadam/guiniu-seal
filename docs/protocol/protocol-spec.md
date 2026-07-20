# D:\x402\docs\protocol\protocol-spec.md — 龟钉协议规范

## 龟钉体系协议规范

### 1. 设计目标
- **可追溯**：每笔交易不可篡改的签名记录
- **可验证**：三方独立验证系统
- **可扩展**：支持后续流（非标合约、实物交付）
- **合规**：符合税务、支付监管要求

### 2. 项目含义
- **X402** = 三驾马车（手·脑·身）
- **三项目**：
  - **龟钉·印信（Seal）** – 支付网关（A2P/Clawtip/消息渠道）
  - **龟钉·印证（Verify）** – 数据存证 + 报告
  - **龟钉·自驭（Deveco）** – AI智能体枢纽

### 3. 协议核心
- **直连模式**：资金从付款方直达收款方本人账户（不通过资金池）
- **Hash 存证**：每笔交易通过 SHA256 散列存证
- **分账规则**：权重计算（weight/totalWeight）实现灵活分配
- **税务流**：A轨工资、B轨劳务、C轨经营三轨计算

### 4. 重要接口
| 接口 | 方法 | 参数 | 说明 |
|------|------|------|------|
| `/api/settle/checkout` | POST | 金额、channel、分配rules、税务轨 | 完整四流合一交易 |
| `/api/settle/notarize` | POST | orderId, notaryProvider | 创建第三方存证 |
| `/api/settle/evidence/:id` | GET | — | 通过存证ID查询完整快照 |
| `/api/settle/evidence/verify` | POST | evidenceId | 验证存证完整性 |
| `/api/settle/tax/calculate` | POST | amount, track, monthlyAccumulated | 税务计算（A/B/C轨） |
| `/api/settle/tax/thresholds` | GET | — | 税务阈值配置 |

### 5. 存证系统（第4流）
- **创建**：自动为每笔交易生成 `evidenceId`，包含资金流快照
- **验证**：SHA256 重算摘要对比存证原始摘要
- **扩展**：`attachStream`（5流/6流）可绑定非标合约/实物交付数据
- **注册表**：`evidenceRecords` 持久化，防篡改

### 6. 三轨税务处理
- **A轨**：工资薪金 – 雇主代扣代缴，`needInvoice: false`
- **B轨**：劳务报酬 – 单笔>800预扣20%，月累>1万强制扣缴，`needInvoice: true`
- **C轨**：经营所得 – 全额拨付，自行开票，存证防重

### 7. 风险标签
- **高频交易警戒**：单日 ≥5 笔触发警戒标签
- **月累超限**：累计 >1万，建议引导 C 轨  
- **大额单笔**：单笔 >800，即时预扣

---  
*此文档适用于开发者、审计人、合规审查.*