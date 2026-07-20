/**
 * 龟钮·印信开源版 — 锁定数据收集与存证路由
 * 数据锁定：关键数据快照锁定防篡改，生成锁定凭证
 * 锁定存证：对锁定数据 Hash 存证 + 公证
 * 支持数据源：GIT仓库、支付交易、钱包、Agent支付等
 */
const express = require('express');
const router = express.Router();
const { dataLock, gitRepoTracker, payments, wallets, agentPayments } = require('../models/dataStore');
const crypto = require('crypto');
const axios = require('axios');

const SELF_BASE = process.env.SELF_BASE || 'http://127.0.0.1:3000';

const LOCK_SOURCES = {
  'git_repo': { label: 'GIT仓库数据', description: '开源项目仓库 Stars/Forks/Commits 等快照' },
  'payment': { label: '支付交易数据', description: '支付交易流水快照' },
  'wallet': { label: '钱包数据', description: '钱包余额与交易快照' },
  'agent_payment': { label: 'Agent支付数据', description: 'AI Agent 支付记录快照' },
  'custom': { label: '自定义数据', description: '用户自定义数据锁定' },
};

const LOCK_LEVELS = {
  snapshot: { label: '快照锁定', hashAlgo: 'sha256', expiryDays: 0, description: '数据快照锁定，生成指纹' },
  sealed: { label: '密封存证', hashAlgo: 'sha256', expiryDays: 365, description: '密封存证，对接公证' },
  permanent: { label: '永久存证', hashAlgo: 'sha512', expiryDays: 0, description: '永久链上存证，不可篡改' },
};

function collectGitRepoData() {
  return gitRepoTracker.getAll().map(repo => ({
    id: repo.id, name: repo.name, stars: repo.stars, forks: repo.forks,
    watchers: repo.watchers, openIssues: repo.openIssues, pullRequests: repo.pullRequests,
    commits: repo.commits, contributors: repo.contributors, releaseCount: repo.releaseCount,
    weightedScore: repo.weightedScore, lastSyncAt: repo.lastSyncAt,
  }));
}

function collectPaymentData() {
  return payments.getAll().slice(-100).map(p => ({
    id: p.id, amount: p.amount, subject: p.subject, userId: p.userId,
    status: p.status, x402: p.x402, createdAt: p.createdAt,
  }));
}

function collectWalletData() {
  return wallets.getAll().slice(-100).map(w => ({
    userId: w.userId, balance: w.balance, txCount: (w.transactions || []).length,
  }));
}

function collectAgentPaymentData() {
  return agentPayments.getAll().slice(-50).map(a => ({
    id: a.id, agentId: a.agentId, amount: a.amount, status: a.status, createdAt: a.createdAt,
  }));
}

const DATA_COLLECTORS = {
  'git_repo': collectGitRepoData,
  'payment': collectPaymentData,
  'wallet': collectWalletData,
  'agent_payment': collectAgentPaymentData,
};

router.post('/lock', async (req, res) => {
  const { source, lockLevel, customData, customDescription, userId } = req.body;
  if (!source) return res.status(400).json({ success: false, error: 'source 为必填' });
  const validSources = Object.keys(LOCK_SOURCES);
  if (!validSources.includes(source)) return res.status(400).json({ success: false, error: `source 必须为: ${validSources.join(', ')}` });

  const level = lockLevel || 'snapshot';
  const levelConfig = LOCK_LEVELS[level];
  if (!levelConfig) return res.status(400).json({ success: false, error: `lockLevel 必须为: ${Object.keys(LOCK_LEVELS).join(', ')}` });

  let data;
  if (source === 'custom') {
    if (!customData) return res.status(400).json({ success: false, error: 'custom 源类型需要提供 customData' });
    data = customData;
  } else {
    const collector = DATA_COLLECTORS[source];
    data = collector ? collector() : [];
  }

  if (!data || (Array.isArray(data) && data.length === 0 && source !== 'custom')) {
    return res.json({ success: false, error: '当前数据源无数据可锁定' });
  }

  const timestamp = new Date().toISOString();
  const dataHash = crypto.createHash(levelConfig.hashAlgo).update(JSON.stringify(data)).digest('hex');
  const lockId = `DL-${Date.now()}-${source.slice(0, 4).toUpperCase()}`;

  const lock = {
    id: lockId, source, sourceLabel: LOCK_SOURCES[source]?.label || source,
    lockLevel: level, lockLevelLabel: levelConfig.label,
    customDescription: customDescription || LOCK_SOURCES[source]?.description || '',
    userId: userId || 'system', dataHash, dataCount: Array.isArray(data) ? data.length : 1,
    dataPreview: Array.isArray(data) ? data.slice(0, 3) : data,
    hashAlgo: levelConfig.hashAlgo, timestamp,
    expiryDate: levelConfig.expiryDays > 0 ? new Date(Date.now() + levelConfig.expiryDays * 86400000).toISOString() : null,
    notarized: false, notaryId: null, notaryHash: null, notarizedAt: null,
    status: 'locked', createdAt: timestamp,
  };

  if (level === 'sealed' || level === 'permanent') {
    try {
      const notaryRes = await axios.post(`${SELF_BASE}/api/notary/apply`, {
        txId: lockId, providerId: level === 'permanent' ? 'p003' : 'p001',
        userId: lock.userId, amount: 0,
        documentType: 'data_lock_certification', documentHash: dataHash,
      }, { timeout: 5000 });
      if (notaryRes.data?.success) {
        lock.notarized = true;
        lock.notaryId = notaryRes.data.data?.id;
        lock.notarizedAt = new Date().toISOString();
        lock.notaryHash = crypto.createHash('sha256').update(JSON.stringify({ lockId, dataHash, notaryId: lock.notaryId, timestamp })).digest('hex');
        lock.status = level === 'permanent' ? 'permanent_sealed' : 'sealed';
      }
    } catch (e) { lock.status = 'locked_local'; }
  }

  dataLock.set(lockId, lock);
  res.json({ success: true, data: lock });
});

router.post('/batch-lock', async (req, res) => {
  const { sources, lockLevel, userId } = req.body;
  if (!Array.isArray(sources) || sources.length === 0) return res.status(400).json({ success: false, error: 'sources 数组为必填' });
  const level = lockLevel || 'snapshot';
  const levelConfig = LOCK_LEVELS[level] || LOCK_LEVELS.snapshot;
  const results = [];

  for (const source of sources) {
    const collector = DATA_COLLECTORS[source];
    if (!collector) continue;
    const data = collector();
    if (!data || (Array.isArray(data) && data.length === 0)) continue;
    const timestamp = new Date().toISOString();
    const dataHash = crypto.createHash(levelConfig.hashAlgo).update(JSON.stringify(data)).digest('hex');
    const lockId = `DL-${Date.now()}-${source.slice(0, 4).toUpperCase()}-${results.length}`;
    const lock = {
      id: lockId, source, sourceLabel: LOCK_SOURCES[source]?.label || source,
      lockLevel: level, lockLevelLabel: levelConfig.label,
      userId: userId || 'system', dataHash, dataCount: Array.isArray(data) ? data.length : 1,
      hashAlgo: levelConfig.hashAlgo, timestamp,
      expiryDate: levelConfig.expiryDays > 0 ? new Date(Date.now() + levelConfig.expiryDays * 86400000).toISOString() : null,
      notarized: false, status: 'locked', createdAt: timestamp,
    };
    dataLock.set(lockId, lock);
    results.push(lock);
  }

  res.json({ success: true, data: { count: results.length, locks: results } });
});

router.get('/records', (req, res) => {
  const { userId, source, lockLevel, page = 1, pageSize = 20 } = req.query;
  let records = dataLock.getAll();
  if (userId) records = records.filter(r => r.userId === userId);
  if (source) records = records.filter(r => r.source === source);
  if (lockLevel) records = records.filter(r => r.lockLevel === lockLevel);
  records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const total = records.length;
  const paged = records.slice((Number(page) - 1) * Number(pageSize), Number(page) * Number(pageSize));
  res.json({ success: true, data: { items: paged, total, page: Number(page), pageSize: Number(pageSize) } });
});

router.get('/detail', (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'id 为必填' });
  const lock = dataLock.get(id);
  if (!lock) return res.status(404).json({ success: false, error: '锁定记录不存在' });
  res.json({ success: true, data: lock });
});

router.post('/verify', (req, res) => {
  const { id, currentData } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id 为必填' });
  const lock = dataLock.get(id);
  if (!lock) return res.status(404).json({ success: false, error: '锁定记录不存在' });
  const dataToVerify = currentData || (() => { const c = DATA_COLLECTORS[lock.source]; return c ? c() : null; })();
  if (!dataToVerify) return res.json({ success: false, error: '无法获取当前数据进行比对' });
  const currentHash = crypto.createHash(lock.hashAlgo).update(JSON.stringify(dataToVerify)).digest('hex');
  const match = currentHash === lock.dataHash;
  res.json({ success: true, data: { lockId: id, originalHash: lock.dataHash, currentHash, match, status: match ? 'intact' : 'changed', lockedAt: lock.timestamp, verifiedAt: new Date().toISOString(), source: lock.source } });
});

router.post('/upgrade', async (req, res) => {
  const { id, targetLevel } = req.body;
  if (!id || !targetLevel) return res.status(400).json({ success: false, error: 'id 和 targetLevel 为必填' });
  const lock = dataLock.get(id);
  if (!lock) return res.status(404).json({ success: false, error: '锁定记录不存在' });
  const levelOrder = ['snapshot', 'sealed', 'permanent'];
  if (levelOrder.indexOf(targetLevel) <= levelOrder.indexOf(lock.lockLevel)) return res.json({ success: false, error: '只能向上升级' });
  const levelConfig = LOCK_LEVELS[targetLevel];
  lock.lockLevel = targetLevel;
  lock.lockLevelLabel = levelConfig.label;
  if (targetLevel === 'sealed' || targetLevel === 'permanent') {
    try {
      const notaryRes = await axios.post(`${SELF_BASE}/api/notary/apply`, {
        txId: lock.id, providerId: targetLevel === 'permanent' ? 'p003' : 'p001',
        userId: lock.userId, amount: 0, documentType: 'data_lock_upgrade', documentHash: lock.dataHash,
      }, { timeout: 5000 });
      if (notaryRes.data?.success) {
        lock.notarized = true; lock.notaryId = notaryRes.data.data?.id;
        lock.notarizedAt = new Date().toISOString();
        lock.notaryHash = crypto.createHash('sha256').update(JSON.stringify({ lockId: lock.id, dataHash: lock.dataHash, notaryId: lock.notaryId })).digest('hex');
        lock.status = targetLevel === 'permanent' ? 'permanent_sealed' : 'sealed';
      }
    } catch (e) { lock.status = 'locked_local'; }
  }
  lock.updatedAt = new Date().toISOString();
  dataLock.set(id, lock);
  res.json({ success: true, data: lock });
});

router.get('/stats', (req, res) => {
  const records = dataLock.getAll();
  const stats = { totalLocks: records.length, bySource: {}, byLevel: {}, notarizedCount: records.filter(r => r.notarized).length, totalDataPoints: records.reduce((s, r) => s + (r.dataCount || 0), 0) };
  records.forEach(r => { stats.bySource[r.source] = (stats.bySource[r.source] || 0) + 1; stats.byLevel[r.lockLevel] = (stats.byLevel[r.lockLevel] || 0) + 1; });
  res.json({ success: true, data: stats });
});

router.get('/sources', (req, res) => {
  res.json({ success: true, data: {
    sources: Object.entries(LOCK_SOURCES).map(([key, val]) => ({ key, ...val })),
    levels: Object.entries(LOCK_LEVELS).map(([key, val]) => ({ key, ...val })),
  }});
});

module.exports = router;
