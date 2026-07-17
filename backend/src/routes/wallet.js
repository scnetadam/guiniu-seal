const express = require('express');
const router = express.Router();
const { wallets } = require('../models/dataStore');

// GET /api/wallet/balance — 查询余额
router.get('/balance', (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });

    const wallet = wallets.get(userId) || { userId, balance: 0, transactions: [] };

    res.json({
      success: true,
      data: { balance: wallet.balance, userId },
    });
  } catch (e) {
    console.error('[wallet] 余额查询错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// GET /api/wallet/transactions — 交易明细
router.get('/transactions', (req, res) => {
  try {
    const { userId, page = 1, pageSize = 20 } = req.query;
    if (!userId) return res.status(400).json({ success: false, error: 'userId 为必填' });

    const wallet = wallets.get(userId) || { userId, balance: 0, transactions: [] };
    const txs = (wallet.transactions || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const total = txs.length;
    const paged = txs.slice((page - 1) * pageSize, page * pageSize);

    res.json({
      success: true,
      data: { items: paged, total, page: Number(page), pageSize: Number(pageSize) },
    });
  } catch (e) {
    console.error('[wallet] 交易明细错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;