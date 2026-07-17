/**
 * 龟钮·印信 — 开源版后端入口
 * X402 智能微支付协议
 * 纯代理模式：AI 能力通过 API 调用龟钮·印鉴
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// ============ 中间件 ============
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ 路由 ============
const authRoutes = require('./routes/auth');
const paymentRoutes = require('./routes/payment');
const walletRoutes = require('./routes/wallet');
const agentPayRoutes = require('./routes/agentPay');
const aiRoutes = require('./routes/ai');

app.use('/api/auth', authRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/agent-pay', agentPayRoutes);
app.use('/api/ai', aiRoutes);

// ============ 健康检查 ============
app.get('/health', (req, res) => {
  res.json({ success: true, project: 'guiniu-seal', version: '1.0.0', status: 'running' });
});

// ============ 错误处理 ============
app.use((err, req, res, _next) => {
  console.error('[龟钮印信] 错误:', err);
  res.status(500).json({ success: false, error: '服务器内部错误' });
});

// ============ 启动 ============
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[龟钮印信] 后端服务启动: http://0.0.0.0:${PORT}`);
  console.log(`[龟钮印信] 健康检查: http://localhost:${PORT}/health`);
  console.log(`[龟钮印信] AI 服务代理: ${process.env.AI_SERVICE_URL || 'http://localhost:80'}`);
});

module.exports = app;