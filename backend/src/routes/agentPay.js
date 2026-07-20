const express = require('express');
const router = express.Router();
const { payments, wallets, idempotency } = require('../models/dataStore');

router.post('/execute', (req, res) => {
  try {
    const { agentId, payerId, payeeId, amount, subject, authCode, idempotencyKey } = req.body;
    if (!agentId || !payerId || !amount) {
      return res.status(400).json({ success: false, error: 'agentId, payerId, amount 为必填' });
    }

    if (idempotencyKey) {
      const dup = idempotency.check(idempotencyKey);
      if (dup.isDuplicate) {
        return res.json({ success: true, data: dup.result, idempotent: true });
      }
    }

    const agentPay = {
      id: `ap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      agentId,
      payerId,
      payeeId: payeeId || agentId,
      amount: Number(amount),
      subject: subject || `Agent 支付: ${agentId}`,
      authCode: authCode || 'auto',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    payments.set(agentPay.id, agentPay);

    const lockResult = wallets.withLock(payerId, (wallet) => {
      if ((wallet.balance || 0) < agentPay.amount) {
        return false;
      }
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
      return wallet;
    });

    if (!lockResult.success) {
      agentPay.status = 'failed';
      agentPay.failReason = lockResult.error === 'operation_rejected' ? '余额不足' : '扣款失败';
      payments.set(agentPay.id, agentPay);
      const errResult = { success: false, error: agentPay.failReason };
      if (idempotencyKey) idempotency.complete(idempotencyKey, errResult);
      return res.json(errResult);
    }

    if (agentPay.payeeId !== payerId) {
      wallets.withLock(agentPay.payeeId, (payeeWallet) => {
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
        return payeeWallet;
      });
    }

    agentPay.status = 'completed';
    payments.set(agentPay.id, agentPay);

    if (idempotencyKey) {
      idempotency.complete(idempotencyKey, agentPay);
    }

    res.json({ success: true, data: agentPay });
  } catch (e) {
    console.error('[agentPay] 执行错误:', e);
    if (req.body.idempotencyKey) idempotency.fail(req.body.idempotencyKey, e.message);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

router.get('/list', (req, res) => {
  try {
    const { agentId, page = 1, pageSize = 20 } = req.query;

    let list = payments.getAll().filter(p => p.agentId === agentId || p.payerId === agentId);
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
