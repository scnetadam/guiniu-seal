/**
 * 龟钮·印信开源版 — GIT 仓库数据追踪路由
 * 追踪 guiniu-seal GitHub 仓库：加权维度、开发者贡献、数据返回、用户增长、存证
 * PAY需求：账户13616007538@139.com，项目guiniu-seal，加权维度，数据返回，用户增加，数据存证
 */
const express = require('express');
const router = express.Router();
const { gitRepoTracker, gitContributor, gitWeightedSettle } = require('../models/dataStore');
const crypto = require('crypto');
const axios = require('axios');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_API = 'https://api.github.com';
const GITHUB_OWNER = 'scnetadam';
const GITHUB_REPO = 'guiniu-seal';
const SELF_BASE = process.env.SELF_BASE || 'http://127.0.0.1:3000';

const REPO_WEIGHT_CONFIG = {
  stars: { weight: 0.15, valuePerUnit: 0.005, maxValue: 1.0 },
  forks: { weight: 0.12, valuePerUnit: 0.008, maxValue: 0.8 },
  issues: { weight: 0.10, valuePerUnit: 0.003, maxValue: 0.5 },
  pullRequests: { weight: 0.12, valuePerUnit: 0.004, maxValue: 0.6 },
  commits: { weight: 0.15, valuePerUnit: 0.002, maxValue: 1.0 },
  contributors: { weight: 0.10, valuePerUnit: 0.01, maxValue: 0.5 },
  watchers: { weight: 0.08, valuePerUnit: 0.006, maxValue: 0.4 },
  traffic: { weight: 0.10, valuePerUnit: 0.0001, maxValue: 0.8 },
  releaseFreq: { weight: 0.05, valuePerUnit: 0.02, maxValue: 0.3 },
  codeQuality: { weight: 0.03, baseValue: 0.5, maxValue: 1.0 },
};

const CONTRIBUTOR_WEIGHT_CONFIG = {
  commitCount: { weight: 0.30, valuePerUnit: 0.01, maxValue: 1.0 },
  prCount: { weight: 0.25, valuePerUnit: 0.02, maxValue: 0.8 },
  issueResolved: { weight: 0.15, valuePerUnit: 0.015, maxValue: 0.5 },
  codeReviewCount: { weight: 0.10, valuePerUnit: 0.01, maxValue: 0.4 },
  activeDays: { weight: 0.10, valuePerUnit: 0.005, maxValue: 0.5 },
  docContribution: { weight: 0.05, valuePerUnit: 0.02, maxValue: 0.3 },
  communityImpact: { weight: 0.05, baseValue: 0.3, maxValue: 0.5 },
};

const SPLIT_CONFIG = {
  platformRate: 0.15,
  contributorRate: 0.55,
  notaryRate: 0.10,
  repoReserveRate: 0.10,
  ecosystemRate: 0.10,
};

function calcRepoWeightedScore(repoData) {
  const scores = {};
  let totalScore = 0;
  Object.keys(REPO_WEIGHT_CONFIG).forEach(key => {
    const cfg = REPO_WEIGHT_CONFIG[key];
    const val = repoData[key] || 0;
    const unitVal = cfg.valuePerUnit ? Math.min(val * cfg.valuePerUnit, cfg.maxValue) : Math.min(cfg.baseValue || 0.5, cfg.maxValue);
    scores[key] = unitVal * cfg.weight;
    totalScore += scores[key];
  });
  return { scores, totalScore: Math.min(totalScore, 5.0) };
}

function calcContributorWeightedScore(cData) {
  const scores = {};
  let totalScore = 0;
  Object.keys(CONTRIBUTOR_WEIGHT_CONFIG).forEach(key => {
    const cfg = CONTRIBUTOR_WEIGHT_CONFIG[key];
    const val = cData[key] || 0;
    const unitVal = cfg.valuePerUnit ? Math.min(val * cfg.valuePerUnit, cfg.maxValue) : Math.min(cfg.baseValue || 0.3, cfg.maxValue);
    scores[key] = unitVal * cfg.weight;
    totalScore += scores[key];
  });
  return { scores, totalScore: Math.min(totalScore, 3.0) };
}

function executeSplit(amount) {
  return {
    platform: Number((amount * SPLIT_CONFIG.platformRate).toFixed(4)),
    contributor: Number((amount * SPLIT_CONFIG.contributorRate).toFixed(4)),
    notary: Number((amount * SPLIT_CONFIG.notaryRate).toFixed(4)),
    repoReserve: Number((amount * SPLIT_CONFIG.repoReserveRate).toFixed(4)),
    ecosystem: Number((amount * SPLIT_CONFIG.ecosystemRate).toFixed(4)),
  };
}

function generateHashProof(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

function initRepoSeed() {
  const existing = gitRepoTracker.getAll();
  if (existing.length > 0) return;
  const seed = {
    id: `repo-${GITHUB_REPO}`,
    name: GITHUB_REPO,
    fullName: `${GITHUB_OWNER}/${GITHUB_REPO}`,
    owner: GITHUB_OWNER,
    platform: 'github',
    description: '龟钮开源 — X402 智能微支付协议',
    stars: 0, forks: 0, watchers: 0, openIssues: 0, pullRequests: 0,
    commits: 0, contributors: 0, traffic: 0, releaseCount: 0, codeQuality: 0.5,
    userGrowth: [], snapshots: [], lastSyncAt: null,
    createdAt: new Date().toISOString(),
  };
  gitRepoTracker.set(seed.id, seed);
  console.log('[gitRepoTracker] 仓库种子初始化:', seed.id);
}
initRepoSeed();

async function fetchGitHubRepoData() {
  const headers = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'guiniu-seal-tracker' };
  if (GITHUB_TOKEN) headers['Authorization'] = `token ${GITHUB_TOKEN}`;

  try {
    const repoRes = await axios.get(`${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}`, { headers, timeout: 10000 });
    const repo = repoRes.data;

    let commitCount = 0;
    try {
      const contribRes = await axios.get(`${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contributors`, { headers, timeout: 10000 });
      commitCount = (contribRes.data || []).reduce((s, c) => s + (c.contributions || 0), 0);
    } catch (e) { /* fallback */ }

    let prCount = 0;
    try {
      const prRes = await axios.get(`${GITHUB_API}/search/issues?q=repo:${GITHUB_OWNER}/${GITHUB_REPO}+type:pr&per_page=1`, { headers, timeout: 10000 });
      prCount = prRes.data?.total_count || 0;
    } catch (e) { /* fallback */ }

    let releaseCount = 0;
    try {
      const relRes = await axios.get(`${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases`, { headers, timeout: 10000 });
      releaseCount = (relRes.data || []).length;
    } catch (e) { /* fallback */ }

    return {
      stars: repo.stargazers_count || 0, forks: repo.forks_count || 0,
      watchers: repo.subscribers_count || 0, openIssues: repo.open_issues_count || 0,
      contributors: repo.network_count || 0, commits: commitCount, pullRequests: prCount,
      releaseCount, description: repo.description || '',
      htmlUrl: repo.html_url || '', updatedAt: repo.updated_at || new Date().toISOString(),
    };
  } catch (e) {
    console.log('[gitRepoTracker] GitHub API error:', e.code || e.message);
    return null;
  }
}

router.post('/sync', async (req, res) => {
  const ghData = await fetchGitHubRepoData();
  if (!ghData) return res.json({ success: false, error: 'GitHub API 请求失败' });

  const repoId = `repo-${GITHUB_REPO}`;
  const existing = gitRepoTracker.get(repoId) || {};
  const snapshot = { timestamp: new Date().toISOString(), ...ghData };

  const userGrowth = existing.userGrowth || [];
  userGrowth.push({ date: new Date().toISOString().slice(0, 10), stars: ghData.stars, forks: ghData.forks, watchers: ghData.watchers, contributors: ghData.contributors });
  if (userGrowth.length > 90) userGrowth.splice(0, userGrowth.length - 90);

  const snapshots = existing.snapshots || [];
  snapshots.push(snapshot);
  if (snapshots.length > 30) snapshots.splice(0, snapshots.length - 30);

  const updated = {
    ...existing, id: repoId, name: GITHUB_REPO, fullName: `${GITHUB_OWNER}/${GITHUB_REPO}`,
    owner: GITHUB_OWNER, platform: 'github',
    description: ghData.description || existing.description || '',
    htmlUrl: ghData.htmlUrl || existing.htmlUrl || '',
    stars: ghData.stars, forks: ghData.forks, watchers: ghData.watchers,
    openIssues: ghData.openIssues, pullRequests: ghData.pullRequests,
    commits: ghData.commits, contributors: ghData.contributors,
    releaseCount: ghData.releaseCount, codeQuality: existing.codeQuality || 0.5,
    userGrowth, snapshots, lastSyncAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };

  const { scores, totalScore } = calcRepoWeightedScore(updated);
  updated.weightedScore = totalScore;
  updated.weightScores = scores;
  gitRepoTracker.set(repoId, updated);

  res.json({ success: true, data: { repo: updated, snapshot, weightedScore: totalScore, weightScores: scores } });
});

router.get('/status', (req, res) => {
  const repoId = `repo-${GITHUB_REPO}`;
  const repo = gitRepoTracker.get(repoId);
  if (!repo) return res.json({ success: false, error: '仓库数据不存在，请先同步' });
  const { scores, totalScore } = calcRepoWeightedScore(repo);
  res.json({ success: true, data: { repo: { ...repo, weightedScore: totalScore, weightScores: scores }, lastSyncAt: repo.lastSyncAt } });
});

router.get('/weighted-dimensions', (req, res) => {
  const repoId = `repo-${GITHUB_REPO}`;
  const repo = gitRepoTracker.get(repoId) || {};
  const { scores, totalScore } = calcRepoWeightedScore(repo);
  const dimensions = Object.keys(REPO_WEIGHT_CONFIG).map(key => ({
    key, weight: REPO_WEIGHT_CONFIG[key].weight, currentValue: repo[key] || 0,
    score: scores[key] || 0, maxValue: REPO_WEIGHT_CONFIG[key].maxValue || 0,
    description: {
      stars: 'Star 数量，反映项目受欢迎度', forks: 'Fork 数量，反映项目使用与二次开发活跃度',
      issues: '开放 Issue 数量，反映社区参与度', pullRequests: 'PR 数量，反映代码贡献活跃度',
      commits: '总提交数，反映开发迭代频率', contributors: '贡献者数量，反映社区规模',
      watchers: '关注者数量，反映项目影响力', traffic: '访问流量，反映项目曝光度',
      releaseFreq: '发布频率，反映版本迭代节奏', codeQuality: '代码质量评分，反映项目工程化水平',
    }[key] || key,
  }));
  res.json({ success: true, data: { dimensions, totalScore, repoName: GITHUB_REPO } });
});

router.post('/contributor/track', (req, res) => {
  const { contributorId, username, commitCount, prCount, issueResolved, codeReviewCount, activeDays, docContribution, communityImpact } = req.body;
  if (!contributorId && !username) return res.status(400).json({ success: false, error: 'contributorId 或 username 为必填' });
  const id = contributorId || `contrib-${username}`;
  const existing = gitContributor.get(id) || {};
  const contributor = {
    ...existing, id, username: username || existing.username || id,
    commitCount: commitCount ?? existing.commitCount ?? 0, prCount: prCount ?? existing.prCount ?? 0,
    issueResolved: issueResolved ?? existing.issueResolved ?? 0, codeReviewCount: codeReviewCount ?? existing.codeReviewCount ?? 0,
    activeDays: activeDays ?? existing.activeDays ?? 0, docContribution: docContribution ?? existing.docContribution ?? 0,
    communityImpact: communityImpact ?? existing.communityImpact ?? 0.3,
    updatedAt: new Date().toISOString(), createdAt: existing.createdAt || new Date().toISOString(),
  };
  const { scores, totalScore } = calcContributorWeightedScore(contributor);
  contributor.weightedScore = totalScore;
  contributor.weightScores = scores;
  gitContributor.set(id, contributor);
  res.json({ success: true, data: { contributor, weightedScore: totalScore, weightScores: scores } });
});

router.get('/contributor/list', (req, res) => {
  const contributors = gitContributor.getAll().sort((a, b) => (b.weightedScore || 0) - (a.weightedScore || 0));
  res.json({ success: true, data: { contributors, total: contributors.length } });
});

router.get('/contributor/detail', (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, error: 'id 为必填' });
  const contributor = gitContributor.get(id);
  if (!contributor) return res.status(404).json({ success: false, error: '贡献者不存在' });
  const { scores, totalScore } = calcContributorWeightedScore(contributor);
  res.json({ success: true, data: { ...contributor, weightedScore: totalScore, weightScores: scores } });
});

router.get('/growth', (req, res) => {
  const repoId = `repo-${GITHUB_REPO}`;
  const repo = gitRepoTracker.get(repoId);
  if (!repo || !repo.userGrowth || repo.userGrowth.length === 0) return res.json({ success: true, data: { growthData: [], summary: null } });
  const growthData = repo.userGrowth;
  const latest = growthData[growthData.length - 1];
  const earliest = growthData[0];
  const summary = {
    currentStars: latest.stars, currentForks: latest.forks, currentWatchers: latest.watchers,
    currentContributors: latest.contributors, starGrowth: latest.stars - earliest.stars,
    forkGrowth: latest.forks - earliest.forks, contributorGrowth: latest.contributors - earliest.contributors,
    growthRate: earliest.stars > 0 ? ((latest.stars - earliest.stars) / earliest.stars * 100).toFixed(2) : '0',
    periodDays: growthData.length,
  };
  res.json({ success: true, data: { growthData, summary } });
});

router.post('/settle', async (req, res) => {
  const { repoData, contributorId, contributorData, baseRate } = req.body;
  const repoId = `repo-${GITHUB_REPO}`;
  const repo = gitRepoTracker.get(repoId);
  const currentRepoData = repo || repoData || {};
  const { scores: repoScores, totalScore: repoTotalScore } = calcRepoWeightedScore(currentRepoData);
  const rate = baseRate || 2.0;
  const repoSettleAmount = Number((repoTotalScore * rate).toFixed(4));

  let contributorSettleAmount = 0, contributorScores = {}, contributorTotalScore = 0;
  if (contributorData || contributorId) {
    const cd = contributorData || gitContributor.get(contributorId) || {};
    const result = calcContributorWeightedScore(cd);
    contributorScores = result.scores;
    contributorTotalScore = result.totalScore;
    contributorSettleAmount = Number((contributorTotalScore * rate * 0.5).toFixed(4));
  }

  const totalSettleAmount = Number((repoSettleAmount + contributorSettleAmount).toFixed(4));
  const splits = executeSplit(totalSettleAmount);
  const settlement = {
    id: `GIT-${Date.now()}-${repoId.slice(-6)}`, repoId, repoName: GITHUB_REPO,
    repoSettleAmount, repoTotalScore, repoScores, contributorId: contributorId || null,
    contributorSettleAmount, contributorTotalScore, contributorScores, totalSettleAmount, splits,
    hashProof: '', notarized: false, status: 'settled', createdAt: new Date().toISOString(),
  };
  settlement.hashProof = generateHashProof({ id: settlement.id, repoId, totalSettleAmount, splits, timestamp: settlement.createdAt });

  try {
    const notaryRes = await axios.post(`${SELF_BASE}/api/notary/apply`, {
      txId: settlement.id, providerId: 'p001', userId: repoId, amount: 0,
      documentType: 'git_repo_tracker_settlement', documentHash: settlement.hashProof,
    }, { timeout: 5000 });
    if (notaryRes.data?.success) { settlement.notarized = true; settlement.notaryId = notaryRes.data.data?.id; }
  } catch (e) { console.log('[gitRepoTracker] notary fallback:', e.code || e.message); }

  gitWeightedSettle.set(settlement.id, settlement);
  res.json({ success: true, data: settlement });
});

router.get('/settle/records', (req, res) => {
  const { page = 1, pageSize = 20 } = req.query;
  let records = gitWeightedSettle.getAll().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const total = records.length;
  const paged = records.slice((Number(page) - 1) * Number(pageSize), Number(page) * Number(pageSize));
  res.json({ success: true, data: { items: paged, total, page: Number(page), pageSize: Number(pageSize) } });
});

router.get('/settle/stats', (req, res) => {
  const records = gitWeightedSettle.getAll();
  res.json({ success: true, data: {
    totalSettlements: records.length, totalAmount: records.reduce((s, r) => s + (r.totalSettleAmount || 0), 0),
    totalContributorEarnings: records.reduce((s, r) => s + (r.splits?.contributor || 0), 0),
    notarizedCount: records.filter(r => r.notarized).length,
  }});
});

router.post('/notarize', async (req, res) => {
  const repoId = `repo-${GITHUB_REPO}`;
  const repo = gitRepoTracker.get(repoId);
  if (!repo) return res.status(400).json({ success: false, error: '仓库数据不存在' });
  const proof = generateHashProof({ repoId, stars: repo.stars, forks: repo.forks, commits: repo.commits, timestamp: new Date().toISOString() });
  try {
    const notaryRes = await axios.post(`${SELF_BASE}/api/notary/apply`, {
      txId: `notarize-${repoId}`, providerId: 'p001', userId: repoId, amount: 0,
      documentType: 'git_repo_data_certification', documentHash: proof,
    }, { timeout: 5000 });
    if (notaryRes.data?.success) {
      repo.notaryId = notaryRes.data.data?.id;
      repo.notarizedAt = new Date().toISOString();
      repo.hashProof = proof;
      gitRepoTracker.set(repoId, repo);
      return res.json({ success: true, data: { notaryId: repo.notaryId, hashProof: proof, notarizedAt: repo.notarizedAt } });
    }
  } catch (e) { /* fallback */ }
  repo.hashProof = proof;
  repo.notarizedAt = new Date().toISOString();
  gitRepoTracker.set(repoId, repo);
  res.json({ success: true, data: { hashProof: proof, notarizedAt: repo.notarizedAt, note: '本地存证(公证服务不可达)' } });
});

router.get('/dashboard', (req, res) => {
  const repoId = `repo-${GITHUB_REPO}`;
  const repo = gitRepoTracker.get(repoId);
  const contributors = gitContributor.getAll();
  const settleRecords = gitWeightedSettle.getAll();
  const { scores, totalScore } = repo ? calcRepoWeightedScore(repo) : { scores: {}, totalScore: 0 };
  res.json({ success: true, data: {
    repo: repo ? { ...repo, weightedScore: totalScore, weightScores: scores } : null,
    contributorCount: contributors.length,
    topContributors: contributors.sort((a, b) => (b.weightedScore || 0) - (a.weightedScore || 0)).slice(0, 10),
    recentSettlements: settleRecords.slice(-5),
    settleStats: { total: settleRecords.length, totalAmount: settleRecords.reduce((s, r) => s + (r.totalSettleAmount || 0), 0), notarized: settleRecords.filter(r => r.notarized).length },
  }});
});

module.exports = router;
