# Checkout API 参考

## POST /api/settle/checkout

### 统一结算下单（四流合一）

**请求体**：
```json
{
  "channel": "alipay|wechat|ecny",
  "totalAmount": 5000,
  "subject": "订单标题",
  "payerId": "user_002",
  "payeeId": "user_001",
  "agentId": null,
  "splits": [{ "partyId": "user_001", "weight": 60, "memo": "主收款方" }],
  "kolTrack": "A|B|C",
  "monthlyAccumulated": 0,
  "dailyCount": 0
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "paymentId": "pay_xxx",
    "channel": "alipay",
    "totalAmount": 5000,
    "subject": "订单标题",
    "payerId": "user_002",
    "payeeId": "user_001",
    "paymentInstruction": { "orderString": "...", "tradeNo": "..." },
    "splits": [{ "partyId": "user_001", "amount": 3000 }],
    "taxResult": { "netAmount": 4000, "taxWithheld": 1000, "track": "B", "needInvoice": true },
    "evidence": {
      "evidenceId": "EV-...",
      "digest": "sha256:...",
      "status": "created"
    },
    "hash": "sha256:...",
    "status": "pending"
  }
}
```

### 四流输出

| 流 | 输出位置 | 说明 |
|----|----------|------|
| **支付流** | `paymentInstruction` | 调起支付 UI 所需信息 |
| **分账流** | `splits` | 各方分配金额 |
| **税务流** | `taxResult` | 税务计算 + 发票需求 |
| **存证流** | `evidence` | 完整性验证 Hash |

---

## POST /api/settle/tax/calculate

### 单笔税务计算

**请求体**：
```json
{ "amount": 10000, "track": "B", "monthlyAccumulated": 5000 }
```

**响应**：
```json
{
  "success": true,
  "data": {
    "netAmount": 8000,
    "taxWithheld": 2000,
    "track": "B",
    "needInvoice": true,
    "riskTags": [],
    "detail": "B轨月累超限: 应税5000元×20%=1000元"
  }
}
```

---

## GET /api/settle/tax/thresholds

### 税务阈值配置

**响应**：
```json
{
  "success": true,
  "data": {
    "singleSmall": 800,
    "singleLarge": 800,
    "monthSmall": 10000,
    "monthLarge": 10000,
    "dailyFreq": 5
  }
}
```

---

## POST /api/settle/estimate

### 分账 + 税务估算

**请求体**：
```json
{
  "totalAmount": 10000,
  "splits": [{ "partyId": "user_001", "weight": 60 }],
  "kolTrack": "B",
  "monthlyAccumulated": 5000
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "splits": [{ "partyId": "user_001", "amount": 6000 }],
    "taxEstimate": { "netAmount": 8000, "taxWithheld": 2000, "needInvoice": true }
  }
}
```