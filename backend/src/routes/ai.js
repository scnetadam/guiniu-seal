/**
 * 龟钮·印信 — AI 智能体路由
 * 代理模式：调用龟钮印鉴 AI 服务，印信不再直接连 GLM
 * 支持文字精准问答 + 语音双模
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { userStore, paymentStore, walletStore } = require('../models/dataStore');

// 印鉴 AI 服务地址
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:3000';

// ========== 项目专属系统 Prompt ==========

const SYSTEM_PROMPTS = {
  /** 龟钮·印信 — X402 支付 */
  seal: `你是「龟钮·印信」的 AI 支付助手。平台定位是 X402 智能微支付协议，支持法币（支付宝/微信）和链上（USDC/ETH）双轨结算。

核心功能：
1. 支付 — 个人/Agent 间转账支付，支持多种通道
2. Agent 支付 — AI 智能体发起的微交易，授权额度管理
3. 收款 — 生成收款码，扫码支付
4. 账单 — 查看交易流水
5. 钱包 — 余额管理
6. 商家工具 — 收款码管理、订单管理

定价规则：
- C 端个人用户：全免费
- B 端机构用户：单笔 ≤2000 免费，>2000 银行标准费率 0.38%（封顶 20 元）

回答要求：
- 简洁、准确、友好
- 涉及金额的数据给出精确数字
- 纯文本回复，不要 Markdown 格式
- 直接回答问题，不要前缀`,

  /** 龟钮·印证 — 数据存证集市 */
  verify: `你是「龟钮·印证」的 AI 数据助手。平台定位是去中心化数据存证集市。

核心功能：
1. 数据市场 — 数据商品货架，购买数据集
2. 数据存证 — 数据 Hash 上链，生成唯一"印痕"
3. 数据收益 — 查看数据贡献收益
4. 数据授权 — 管理数据贡献开关
5. 公证 — 在线公证服务（15% 服务费）
6. 数据治理 — G 端监管看板

定价规则：
- 数据购买方：按数据集定价
- 数据贡献者：50% 分佣
- G 端政府用户：数据购买方免费

回答要求：简洁、准确、友好。纯文本。`,

  /** 龟钮·印鉴 — 汽车 AI 智能体 */
  auto: `你是「龟钮·印鉴」的 AI 汽车顾问。平台定位是汽车资讯推广与 AI 智能体。

核心功能：
1. 车型对比 — 多维度参数对比
2. 汽车问答 — 续航、配置、价格咨询
3. 内容生成 — AI 生成汽车推广文案
4. 价值评估 — KOL 内容价值分析
5. 试驾预约 — 在线预约试驾
6. 智能推荐 — 活动 KOL 匹配
7. 数据洞察 — 推广趋势分析

回答要求：简洁、专业、有见地。纯文本。`,
};

// ========== 项目介绍配置 ==========

const PROJECT_INTROS = {
  seal: {
    title: '龟钮·印信',
    brief: '龟钮·印信是开源智能微支付协议，支持法币+链上双轨结算，赋能 AI Agent 微交易生态。',
    features: ['个人/Agent 间支付转账', 'AI Agent 授权额度管理', '收款码生成与扫码支付', '交易流水与账单查询', '钱包余额管理', 'B 端商家工具'],
    shortIntro: '欢迎使用龟钮·印信！我是印信 AI 支付助手，可以帮你管理支付、查账单、设置 Agent 额度。请长按语音按钮或点击下方指令开始提问。',
    welcome: '欢迎使用龟钮·印信！我是 AI 支付助手，请长按语音按钮开始提问。',
  },
  verify: {
    title: '龟钮·印证',
    brief: '龟钮·印证是去中心化数据存证集市，数据 Hash 上链确权，支持数据交易与存证。',
    features: ['数据市场浏览与购买', '数据 Hash 上链存证', '数据贡献收益管理', '数据授权开关', '在线公证服务', 'G 端数据治理看板'],
    shortIntro: '欢迎使用龟钮·印证！我是印证 AI 数据助手，可以帮你逛数据市场、查收益、做存证。请长按语音按钮或点击下方指令开始提问。',
    welcome: '欢迎使用龟钮·印证！我是 AI 数据助手，请长按语音按钮开始提问。',
  },
  auto: {
    title: '龟钮·印鉴',
    brief: '龟钮·印鉴是汽车 AI 智能体，提供车型对比、AI 内容生成、价值评估等能力。',
    features: ['车型多维度对比', 'AI 汽车问答顾问', 'AI 推广文案生成', 'KOL 内容价值评估', '在线试驾预约', '智能推荐与数据洞察'],
    shortIntro: '欢迎使用龟钮·印鉴！我是印鉴 AI 汽车顾问，可以帮你对比车型、查参数、生成评测。请长按语音按钮或点击下方指令开始提问。',
    welcome: '欢迎使用龟钮·印鉴！我是 AI 汽车顾问，请长按语音按钮开始提问。',
  },
};

// ========== 上下文记忆（内存级） ==========

const SESSION_MEMORY = new Map();

function getSession(userId) {
  if (!userId) return { messages: [], context: {} };
  if (!SESSION_MEMORY.has(userId)) {
    SESSION_MEMORY.set(userId, { messages: [], context: {} });
  }
  const session = SESSION_MEMORY.get(userId);
  // 保留最近 20 条
  if (session.messages.length > 20) {
    session.messages = session.messages.slice(-20);
  }
  return session;
}

// ========== 数据查询函数 ==========

function queryUserData(userId, project) {
  if (!userId) return '';
  const user = userStore.get(userId);
  const wallet = walletStore.get(userId);
  const payments = paymentStore.getByUser(userId);

  let data = '';
  if (project === 'seal') {
    data = `用户信息：${JSON.stringify(user || {})}\n钱包余额：${wallet ? '¥' + wallet.balance : '未开通'}\n最近交易：${JSON.stringify((payments || []).slice(-3))}`;
  }
  return data;
}

// ========== 调用印鉴 AI 服务 ==========

async function callAIService(project, message, context) {
  // 构建系统提示词
  const systemPrompt = SYSTEM_PROMPTS[project] || SYSTEM_PROMPTS.seal;
  const userData = queryUserData(context.userId, project);

  let fullPrompt = message;
  if (userData) {
    fullPrompt = `[用户数据]\n${userData}\n\n[用户问题]\n${message}`;
  }

  try {
    // 调用印鉴的 AI assistant 接口
    const res = await axios.post(`${AI_SERVICE_URL}/api/ai-proxy/assistant`, {
      contentId: 'x402-chat',
      brand: '龟钮·印信',
      model: 'X402',
      question: fullPrompt,
      chatHistory: [
        { role: 'system', content: systemPrompt },
        ...(context.history || []),
      ],
    }, { timeout: 30000 });

    if (res.data.success) {
      return res.data.data.answer;
    }
    throw new Error(res.data.error || 'AI 服务返回失败');
  } catch (err) {
    // 降级：直接返回 fallback
    console.error('[AI Proxy] 调用印鉴服务失败:', err.message);
    return fallbackReply(project, message);
  }
}

function fallbackReply(project, message) {
  const msg = message.toLowerCase();
  if (project === 'seal') {
    if (msg.includes('余额') || msg.includes('钱包')) return '您的钱包余额信息可在「我的」页面查看。如需查询余额，请先登录后重试。';
    if (msg.includes('账单') || msg.includes('交易')) return '您的交易流水可在「账单」页面查看。我们支持法币和链上双轨结算。';
    if (msg.includes('agent') || msg.includes('额度')) return 'Agent 支付功能可在「Agent支付」页面设置。支持设置单笔限额和日累计限额。';
    return '您好！我是龟钮·印信 AI 支付助手，可以为您解答支付、钱包、账单等问题。请详细描述您的需求。';
  }
  if (project === 'verify') {
    return '您好！我是龟钮·印证 AI 数据助手，可以帮您了解数据市场、存证服务、数据收益等。请告诉我您想了解什么？';
  }
  return '您好！我是龟钮·印鉴 AI 汽车顾问，可以为您解答车型对比、参数配置、试驾预约等问题。请问有什么可以帮您？';
}

// ========== 路由 ==========

/**
 * POST /api/ai/chat — 统一对话接口
 * 支持三项目：seal / verify / auto
 * voiceMode: true 时返回简短适合播报的回复
 */
router.post('/chat', async (req, res) => {
  const { project, userId, message, voiceMode } = req.body;

  if (!message) {
    return res.status(400).json({ success: false, error: 'message 为必填' });
  }

  const session = getSession(userId);
  const context = {
    userId: userId || '',
    history: session.messages.slice(-6),
  };

  try {
    const reply = await callAIService(project || 'seal', message, context);

    // 记录会话
    if (userId) {
      session.messages.push({ role: 'user', content: message });
      session.messages.push({ role: 'assistant', content: reply });
    }

    res.json({
      success: true,
      data: {
        reply,
        voiceMode: !!voiceMode,
      },
    });
  } catch (err) {
    console.error('[AI Chat Error]', err.message);
    res.json({
      success: true,
      data: {
        reply: '抱歉，服务暂时不可用，请稍后再试。',
      },
    });
  }
});

/**
 * POST /api/ai/voice-command — 语音指令解析
 * 将语音转文字后解析意图，返回结构化指令
 */
router.post('/voice-command', async (req, res) => {
  const { project, text } = req.body;

  if (!text) {
    return res.status(400).json({ success: false, error: 'text 为必填' });
  }

  // 简单关键词匹配，复杂场景可走 AI
  const intentMap = {
    '余额': { action: 'balance', page: '/pages/wallet/index' },
    '钱包': { action: 'balance', page: '/pages/wallet/index' },
    '账单': { action: 'bills', page: '/pages/bills/index' },
    '交易': { action: 'bills', page: '/pages/bills/index' },
    'agent': { action: 'agent-pay', page: '/pages/agent-pay/index' },
    '额度': { action: 'agent-pay', page: '/pages/agent-pay/index' },
    '收款': { action: 'collect', page: '/pages/collect/index' },
    '支付': { action: 'pay', page: '/pages/pay/index' },
    '介绍': { action: 'intro', page: '' },
    '数据市场': { action: 'data-market', page: '/pages/dataMarket/index' },
    '收益': { action: 'earnings', page: '/pages/dataEarnings/index' },
    '存证': { action: 'notary', page: '/pages/notary/index' },
    '车型': { action: 'compare', page: '' },
    '对比': { action: 'compare', page: '' },
    '续航': { action: 'range', page: '' },
    '试驾': { action: 'test-drive', page: '/pages/booking/index' },
  };

  let matched = null;
  for (const [keyword, intent] of Object.entries(intentMap)) {
    if (text.includes(keyword)) {
      matched = intent;
      break;
    }
  }

  res.json({
    success: true,
    data: {
      text,
      intent: matched || { action: 'chat', page: '' },
      project: project || 'seal',
    },
  });
});

/**
 * GET /api/ai/intro — 自动介绍生成
 * 返回项目的结构化介绍信息
 */
router.get('/intro', async (req, res) => {
  const project = req.query.project || 'seal';
  const intro = PROJECT_INTROS[project] || PROJECT_INTROS.seal;

  res.json({
    success: true,
    data: intro,
  });
});

/**
 * GET /api/ai/health — AI 服务健康检查
 */
router.get('/health', async (req, res) => {
  try {
    await axios.get(`${AI_SERVICE_URL}/api/ai-proxy/assistant`, { timeout: 5000 });
    res.json({ success: true, data: { status: 'connected', service: AI_SERVICE_URL } });
  } catch (e) {
    res.json({ success: true, data: { status: 'disconnected', service: AI_SERVICE_URL, error: e.message } });
  }
});

module.exports = router;