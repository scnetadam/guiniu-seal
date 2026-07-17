const express = require('express');
const router = express.Router();
const { payments, wallets, users } = require('../models/dataStore');

// POST /api/payment/create — 创建支付
// ⚠️ 直连模式：付款方直付收款方，协议不代收代付，不触碰资金池
// Direct settlement: payer → payee directly, protocol never holds funds
router.post('/create', (req, res) => {
  try {
    const { payerId, payeeId, amount, subject, channel } = req.body;
    if (!payerId || !payeeId || !amount) {
      return res.status(400).json({ success: false, error: 'payerId, payeeId, amount 为必填' });
    }

    const payment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      payerId,
      payeeId,
      amount: Number(amount),
      subject: subject || '转账',
      channel: channel || 'balance',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    payments.set(payment.id, payment);

    res.json({ success: true, data: payment });
  } catch (e) {
    console.error('[payment] 创建错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// POST /api/payment/confirm — 确认支付
// ⚠️ 仅执行 payer→payee 直连转账，平台不介入资金流转
// Direct transfer only, platform never intermediates funds
router.post('/confirm', (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, error: 'id 为必填' });

    const payment = payments.get(id);
    if (!payment) return res.status(404).json({ success: false, error: '支付记录不存在' });
    if (payment.status !== 'pending') {
      return res.json({ success: false, error: `当前状态不允许确认: ${payment.status}` });
    }

    // 扣款
    const payer = users.get(payment.payerId);
    const payee = users.get(payment.payeeId);

    if (payer && payment.channel === 'balance') {
      const payerBalance = payer.balance || 0;
      if (payerBalance < payment.amount) {
        return res.json({ success: false, error: '余额不足' });
      }
      payer.balance = payerBalance - payment.amount;
      users.set(payer.id, payer);
    }

    if (payee && payment.channel === 'balance') {
      payee.balance = (payee.balance || 0) + payment.amount;
      users.set(payee.id, payee);
    }

    payment.status = 'completed';
    payment.updatedAt = new Date().toISOString();
    payments.set(payment.id, payment);

    // 记录钱包流水
    const walletTx = {
      id: `tx_${Date.now()}`,
      userId: payment.payerId,
      type: 'payment',
      amount: -payment.amount,
      subject: payment.subject,
      refId: payment.id,
      createdAt: new Date().toISOString(),
    };
    const wallet = wallets.get(payment.payerId) || { userId: payment.payerId, balance: 0, transactions: [] };
    wallet.balance = (wallet.balance || 0) - payment.amount;
    wallet.transactions.push(walletTx);
    wallets.set(payment.payerId, wallet);

    if (payment.payeeId) {
      const walletTx2 = {
        id: `tx_${Date.now()}_2`,
        userId: payment.payeeId,
        type: 'receipt',
        amount: payment.amount,
        subject: payment.subject,
        refId: payment.id,
        createdAt: new Date().toISOString(),
      };
      const wallet2 = wallets.get(payment.payeeId) || { userId: payment.payeeId, balance: 0, transactions: [] };
      wallet2.balance = (wallet2.balance || 0) + payment.amount;
      wallet2.transactions.push(walletTx2);
      wallets.set(payment.payeeId, wallet2);
    }

    res.json({ success: true, data: payment });
  } catch (e) {
    console.error('[payment] 确认错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// GET /api/payment/list — 交易列表
router.get('/list', (req, res) => {
  try {
    const { userId, page = 1, pageSize = 20 } = req.query;

    let list = payments.getAll();
    if (userId) {
      list = list.filter(p => p.payerId === userId || p.payeeId === userId);
    }

    // 按时间倒序
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = list.length;
    const paged = list.slice((page - 1) * pageSize, page * pageSize);

    res.json({
      success: true,
      data: { items: paged, total, page: Number(page), pageSize: Number(pageSize) },
    });
  } catch (e) {
    console.error('[payment] 列表错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// GET /api/payment/detail — 交易详情
router.get('/detail', (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, error: 'id 为必填' });

    const payment = payments.get(id);
    if (!payment) return res.status(404).json({ success: false, error: '交易不存在' });

    res.json({ success: true, data: payment });
  } catch (e) {
    console.error('[payment] 详情错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;