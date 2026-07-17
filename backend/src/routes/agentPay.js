const express = require('express');
const router = express.Router();
const { payments, wallets } = require('../models/dataStore');

// POST /api/agent-pay/execute — Agent 发起支付
// ⚠️ Agent 仅代为触发支付指令，资金仍从 payer 直付 payee
// Agent only triggers payment instruction; funds still flow directly from payer to payee
router.post('/execute', (req, res) => {
  try {
    const { agentId, payerId, payeeId, amount, subject, authCode } = req.body;
    if (!agentId || !payerId || !amount) {
      return res.status(400).json({ success: false, error: 'agentId, payerId, amount 为必填' });
    }

    // Agent 支付记录
    const agentPay = {
      id: `ap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      agentId,
      payerId,
      payeeId: payeeId || agentId,
      amount: Number(amount),
      subject: subject || `Agent 支付: ${agentId}`,
      authCode: authCode || 'auto',
      status: 'completed',
      createdAt: new Date().toISOString(),
    };

    payments.set(agentPay.id, agentPay);

    // 扣款
    const wallet = wallets.get(payerId) || { userId: payerId, balance: 0, transactions: [] };
    wallet.balance = (wallet.balance || 0) - agentPay.amount;
    wallet.transactions.push({
      id: `tx_${Date.now()}`,
      userId: payerId,
      type: 'agent_pay',
      amount: -agentPay.amount,
      subject: agentPay.subject,
      refId: agentPay.id,
      createdAt: new Date().toISOString(),
    });
    wallets.set(payerId, wallet);

    // 收款方入账
    if (agentPay.payeeId && agentPay.payeeId !== payerId) {
      const payeeWallet = wallets.get(agentPay.payeeId) || { userId: agentPay.payeeId, balance: 0, transactions: [] };
      payeeWallet.balance = (payeeWallet.balance || 0) + agentPay.amount;
      payeeWallet.transactions.push({
        id: `tx_${Date.now()}_2`,
        userId: agentPay.payeeId,
        type: 'agent_receipt',
        amount: agentPay.amount,
        subject: agentPay.subject,
        refId: agentPay.id,
        createdAt: new Date().toISOString(),
      });
      wallets.set(agentPay.payeeId, payeeWallet);
    }

    res.json({ success: true, data: agentPay });
  } catch (e) {
    console.error('[agentPay] 执行错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// GET /api/agent-pay/list — Agent 支付记录
router.get('/list', (req, res) => {
  try {
    const { agentId, page = 1, pageSize = 20 } = req.query;

    let list = payments.find(p => p.agentId === agentId || p.payerId === agentId);
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = list.length;
    const paged = list.slice((page - 1) * pageSize, page * pageSize);

    res.json({
      success: true,
      data: { items: paged, total, page: Number(page), pageSize: Number(pageSize) },
    });
  } catch (e) {
    console.error('[agentPay] 列表错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;