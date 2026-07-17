const express = require('express');
const router = express.Router();
const { users } = require('../models/dataStore');

// POST /api/auth/login — 登录/注册
router.post('/login', (req, res) => {
  try {
    const { code, nickName, avatarUrl, platform } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'code required' });
    }

    const openId = code.startsWith('demo_') ? code : `open_${code.slice(0, 12)}`;

    let user = users.find(u => u.openId === openId);
    if (!user) {
      const newUser = {
        id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        openId,
        nickName: nickName || '用户',
        avatarUrl: avatarUrl || '',
        platform: platform || 'alipay',
        role: 'user',
        balance: 0,
        createdAt: new Date().toISOString(),
      };
      users.set(newUser.id, newUser);
      user = newUser;
    }

    const token = `gn_${user.id}_${Date.now()}`;

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          nickName: user.nickName,
          avatarUrl: user.avatarUrl,
          role: user.role,
        },
      },
    });
  } catch (e) {
    console.error('[auth] 登录错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// GET /api/auth/user — 获取用户信息
router.get('/user', (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ success: false, error: 'userId required' });

    const user = users.get(userId);
    if (!user) return res.status(404).json({ success: false, error: '用户不存在' });

    res.json({
      success: true,
      data: {
        id: user.id,
        nickName: user.nickName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        balance: user.balance || 0,
      },
    });
  } catch (e) {
    console.error('[auth] 查询用户错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

module.exports = router;