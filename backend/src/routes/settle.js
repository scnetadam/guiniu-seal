const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function _genId() {
  return 'ord_' + Date.now().toString(36) + '_' + crypto.randomBytes(4).toString('hex');
}

const orders = new Map();
const splitRules = new Map();
const notaryRecords = new Map();
let notaryIdCounter = 0;

const RESERVE_TTL = 30 * 60 * 1000;

function _hash(obj) {
  return crypto.createHash('sha256').update(JSON.stringify(obj) + crypto.randomBytes(4).toString('hex')).digest('hex');
}

class NotaryEngine {
  static createEvidence(params) {
    const { orderId, amount, channel, payerId, payeeId, subject, splits, taxResult, hash, notaryProvider } = params;
    notaryIdCounter++;
    const evidenceId = 'EV-' + Date.now().toString(36) + '-' + notaryIdCounter;
    const timestamp = new Date().toISOString();

    const fundFlowSnapshot = {
      totalAmount: amount,
      splits: (splits || []).map(s => ({ partyId: s.partyId, amount: s.amount, memo: s.memo })),
      taxWithheld: taxResult?.taxWithheld || 0,
      netAmount: taxResult?.netAmount || amount,
      taxTrack: taxResult?.track || null,
      taxRiskTags: taxResult?.riskTags || [],
    };

    const evidenceBody = { orderId, amount, channel, payerId, payeeId, subject, hash };
    const digest = crypto.createHash('sha256')
      .update(evidenceId + JSON.stringify(evidenceBody) + JSON.stringify(fundFlowSnapshot) + timestamp)
      .digest('hex');

    const record = {
      evidenceId, evidenceBody, fundFlowSnapshot,
      taxSnapshot: taxResult ? { track: taxResult.track, netAmount: taxResult.netAmount, taxWithheld: taxResult.taxWithheld, needInvoice: taxResult.needInvoice, riskTags: taxResult.riskTags, detail: taxResult.detail } : null,
      digest, notaryProvider: notaryProvider || 'self',
      status: 'created', timestamp, createdAt: timestamp,
      confirmations: { firstConsent: null, secondConsent: null },
    };
    notaryRecords.set(evidenceId, record);
    return record;
  }

  static getEvidence(evidenceId) { return notaryRecords.get(evidenceId) || null; }

  static findByOrder(orderId) {
    return Array.from(notaryRecords.values()).filter(r => r.evidenceBody.orderId === orderId);
  }

  static stats() {
    const all = Array.from(notaryRecords.values());
    return { total: all.length, byStatus: all.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {}) };
  }

  static verify(evidenceId) {
    const record = notaryRecords.get(evidenceId);
    if (!record) return { valid: false, error: 'not_found' };
    const reDigest = crypto.createHash('sha256')
      .update(evidenceId + JSON.stringify(record.evidenceBody) + JSON.stringify(record.fundFlowSnapshot) + record.timestamp)
      .digest('hex');
    return { valid: reDigest === record.digest, originalDigest: record.digest, computedDigest: reDigest };
  }

  static updateStatus(evidenceId, status, extra = {}) {
    const r = notaryRecords.get(evidenceId);
    if (!r) return null;
    r.status = status;
    Object.assign(r, extra);
    r.updatedAt = new Date().toISOString();
    return r;
  }

  static recordConsent(evidenceId, consentType, consentData) {
    const r = notaryRecords.get(evidenceId);
    if (!r) return null;
    if (!r.confirmations) r.confirmations = {};
    r.confirmations[consentType] = {
      granted: true,
      grantedAt: new Date().toISOString(),
      method: consentData.method || 'api',
      userAgent: consentData.userAgent || null,
      ip: consentData.ip || null,
    };
    r.updatedAt = new Date().toISOString();
    return r;
  }

  static attachStream(evidenceId, streamName, data) {
    const r = notaryRecords.get(evidenceId);
    if (!r) return null;
    if (!r.extraStreams) r.extraStreams = {};
    r.extraStreams[streamName] = { data, attachedAt: new Date().toISOString() };
    return r;
  }
}

const TAX_THRESHOLDS = {
  singleSmall: 800,
  singleLarge: 800,
  monthSmall: 10000,
  monthLarge: 10000,
  dailyFreq: 5,
};

class TaxEngine {
  static calculate(params) {
    const { amount, track = 'B', monthlyAccumulated = 0, dailyCount = 0 } = params;
    let netAmount = amount, taxWithheld = 0, needInvoice = false;
    const riskTags = []; let detail = '';
    if (track === 'A') {
      detail = 'A杞ㄥ伐璧勮柂閲? 鍏ㄩ ' + amount.toFixed(2) + ' 鍏冿紝鐢遍泧涓讳唬鎵ｄ唬缂翠釜绋?;
    } else if (track === 'B') {
      const accumulated = monthlyAccumulated + amount;
      if (dailyCount >= TAX_THRESHOLDS.dailyFreq) riskTags.push('楂橀浜ゆ槗璀︽垝: 鍗曟棩鈮? + TAX_THRESHOLDS.dailyFreq + '绗?);
      if (amount > TAX_THRESHOLDS.singleLarge) {
        taxWithheld = parseFloat((amount * 0.2).toFixed(2));
        netAmount = parseFloat((amount - taxWithheld).toFixed(2));
        needInvoice = true;
        detail = 'B杞ㄥ崟绗斿ぇ棰? 棰勬墸20%=' + taxWithheld.toFixed(2) + '鍏冿紝瀹炲彂' + netAmount.toFixed(2) + '鍏?;
      } else if (accumulated > TAX_THRESHOLDS.monthLarge) {
        const taxable = Math.max(0, amount - 800);
        taxWithheld = parseFloat((taxable * 0.2).toFixed(2));
        netAmount = parseFloat((amount - taxWithheld).toFixed(2));
        needInvoice = true;
        riskTags.push('鏈堢疮瓒呴檺: 寤鸿寮曞C杞?);
        detail = 'B杞ㄦ湀绱ぇ棰? 搴旂◣' + taxable.toFixed(2) + '鍏兠?0%=' + taxWithheld.toFixed(2) + '鍏冿紝瀹炲彂' + netAmount.toFixed(2) + '鍏?;
      } else {
        detail = 'B杞ㄥ皬棰? 鏆備笉鎵ｇ即锛屾湀搴曟眹鎬?;
      }
    } else if (track === 'C') {
      detail = 'C杞ㄧ粡钀ユ墍寰? 鍏ㄩ ' + amount.toFixed(2) + ' 鍏冩嫧浠橈紝榫熼挳鐣橦ash璇佹嵁閾?;
    }
    return { netAmount, taxWithheld, needInvoice, riskTags, track, detail };
  }

  static batchProcessMonth(items) {
    return items.map(function(item) {
      const taxable = Math.max(0, item.monthlyAccumulated - 800);
      const taxW = parseFloat((taxable * 0.2).toFixed(2));
      return { userId: item.userId, monthlyTotal: item.monthlyAccumulated, taxWithheld: taxW, netAmount: item.amount - taxW, needInvoice: true, detail: '鏈堝簳姹囨€? 鏈堢疮' + item.monthlyAccumulated.toFixed(2) + '鍏冿紝搴旂◣' + taxable.toFixed(2) + '鍏兠?0%=' + taxW.toFixed(2) + '鍏? };
    });
  }
}

let alipayBackend = null;
let wechatPayBackend = null;
let ecnyBackend = null;

function _loadBackends() {
  if (!alipayBackend) {
    try {
      const { AlipayBackend } = require('../paymentBackends/alipay');
      const keyPath = path.join(__dirname, '..', '..', 'keys', 'alipay-private.pem');
      const pubPath = path.join(__dirname, '..', '..', 'keys', 'alipay-public.pem');
      if (fs.existsSync(keyPath) && fs.existsSync(pubPath)) {
        alipayBackend = new AlipayBackend({
          appId: process.env.ALIPAY_APP_ID,
          appPrivateKeyPath: keyPath,
          alipayPublicKeyPath: pubPath,
          gatewayUrl: process.env.ALIPAY_GATEWAY || 'https://openapi-sandbox.dl.alipaydev.com/gateway.do',
          notifyUrl: process.env.ALIPAY_NOTIFY_URL,
          returnUrl: process.env.ALIPAY_RETURN_URL,
        });
        console.log('[Settle] 鏀粯瀹濇矙绠卞悗绔凡鍔犺浇');
      }
    } catch (e) {
      console.log('[Settle] 鏀粯瀹濇矙绠卞悗绔湭閰嶇疆:', e.message);
    }
  }

  if (!wechatPayBackend) {
    try {
      const { WechatPayBackend } = require('../paymentBackends/wechat');
      if (process.env.WECHAT_MCH_ID && process.env.WECHAT_APP_ID && process.env.WECHAT_API_V3_KEY) {
        wechatPayBackend = new WechatPayBackend({
          appId: process.env.WECHAT_APP_ID,
          mchId: process.env.WECHAT_MCH_ID,
          apiV3Key: process.env.WECHAT_API_V3_KEY,
          notifyUrl: process.env.WECHAT_NOTIFY_URL,
        });
        console.log('[Settle] 寰俊鏀粯鍚庣宸插姞杞?);
      }
    } catch (e) {
      console.log('[Settle] 寰俊鏀粯鍚庣鏈厤缃?', e.message);
    }
  }

  if (!ecnyBackend) {
    try {
      const { ECnyBackend } = require('../paymentBackends/ecny');
      if (process.env.ECNY_MCH_ID && process.env.ECNY_API_KEY) {
        ecnyBackend = new ECnyBackend({
          gatewayUrl: process.env.ECNY_GATEWAY || 'https://api.ccb.com/ecny/v1',
          mchId: process.env.ECNY_MCH_ID,
          appId: process.env.ECNY_APP_ID || process.env.ALIPAY_APP_ID,
          apiKey: process.env.ECNY_API_KEY,
          notifyUrl: process.env.ECNY_NOTIFY_URL,
        });
        console.log('[Settle] e-CNY 鏁板瓧浜烘皯甯佸悗绔凡鍔犺浇');
      }
    } catch (e) {
      console.log('[Settle] e-CNY 鏁板瓧浜烘皯甯佸悗绔湭閰嶇疆:', e.message);
    }
  }
}

class SplitContract {
  constructor(rule) {
    this.ruleId = rule.ruleId || _genId();
    this.name = rule.name;
    this.totalWeight = rule.totalWeight || 100;
    this.splits = rule.splits || [];
    this.conditions = rule.conditions || {};
    this.enabled = rule.enabled !== false;
    this.createdAt = new Date().toISOString();
  }

  calculate(totalAmount) {
    return this.splits.map(s => ({
      partyId: s.partyId,
      amount: parseFloat((totalAmount * s.weight / this.totalWeight).toFixed(2)),
      weight: s.weight,
      wallet: s.wallet,
      memo: s.memo || '',
    }));
  }
}

class ChannelCapability {
  static getProfile(channel) {
    switch (channel) {
      case 'alipay':
        return {
          id: 'alipay',
          name: '鏀粯瀹?,
          modes: ['page', 'qrcode', 'app'],
          balanceProbe: '0.01棰勫喕缁撹瘯鎺?OAUTH鑺濋夯鑴辨晱',
          reserveMethod: '璧勯噾鎺堟潈鍐荤粨鎺ュ彛',
          executeMethod: '浠ｆ墸鍗忚鍛ㄦ湡鎵?鍏嶅瘑+棰濆害棰勫',
          costPerTx: 0.01,
          supportsSplit: true,
          supportsUmbrella: false,
          kycRequired: true,
          riskLevel: 'medium',
        };
      case 'wechat':
        return {
          id: 'wechat',
          name: '寰俊鏀粯',
          modes: ['jsapi'],
          balanceProbe: '棰濆害棰勫鎺ュ彛',
          reserveMethod: '棰勬墸閿佸畾',
          executeMethod: 'JSAPI鏀粯',
          costPerTx: 0.01,
          supportsSplit: true,
          supportsUmbrella: false,
          kycRequired: true,
          riskLevel: 'medium',
        };
      case 'ecny':
        return {
          id: 'ecny',
          name: '鏁板瓧浜烘皯甯?,
          modes: ['qrcode', 'page'],
          balanceProbe: '閽卞寘浣欓鏌ヨ',
          reserveMethod: '浼炲垪閿佸畾',
          executeMethod: '浜岀淮鐮?椤甸潰鏀粯',
          costPerTx: 0,
          supportsSplit: true,
          supportsUmbrella: true,
          kycRequired: true,
          riskLevel: 'low',
        };
      default:
        return {
          id: channel,
          name: channel,
          modes: [],
          balanceProbe: 'none',
          reserveMethod: 'none',
          executeMethod: 'simulated',
          costPerTx: 0,
          supportsSplit: false,
          supportsUmbrella: false,
          kycRequired: false,
          riskLevel: 'unknown',
        };
    }
  }

  static recommend(params) {
    const { amount, needSplit, needUmbrella, userKycLevel, preferLowCost } = params;
    const channels = ['alipay', 'wechat', 'ecny'].map(c => ChannelCapability.getProfile(c));
    const scored = channels.map(ch => {
      let score = 50;
      if (preferLowCost && ch.costPerTx === 0) score += 30;
      else if (preferLowCost && ch.costPerTx <= 0.01) score += 15;
      if (needSplit && ch.supportsSplit) score += 10;
      if (needUmbrella && ch.supportsUmbrella) score += 20;
      if (userKycLevel === 'full' && ch.kycRequired) score += 5;
      if (ch.riskLevel === 'low') score += 10;
      if (amount > 0 && amount < ch.costPerTx * 100) score -= 20;
      return { ...ch, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }
}

class WalletReserveEngine {
  static check(userId, amount, channel) {
    const { wallets } = require('../models/dataStore');
    const wallet = wallets.get(userId);
    if (!wallet) return { canReserve: false, reason: 'wallet_not_found', availableBalance: 0 };
    const available = wallet.balance || 0;
    const profile = ChannelCapability.getProfile(channel);
    const probeResult = {
      available,
      requested: amount,
      channel,
      probeMethod: profile.balanceProbe,
      canReserve: available >= amount,
      reason: available >= amount ? null : 'insufficient_balance',
      estimatedHold: Math.min(amount * 1.1, available),
    };
    if (probeResult.canReserve && channel === 'alipay') {
      probeResult.probeNote = '鏀粯瀹濇棤涓汉API浣欓鎺㈡煡锛屼緷璧?.01棰勫喕缁撹瘯鎺?OAUTH鎺堟潈';
    }
    return probeResult;
  }

  static reserve(userId, amount, orderId, channel) {
    const { wallets } = require('../models/dataStore');
    const lockResult = wallets.withLock(userId, (wallet) => {
      if ((wallet.balance || 0) < amount) return false;
      wallet.balance -= amount;
      wallet.reservedAmount = (wallet.reservedAmount || 0) + amount;
      wallet.transactions.push({
        id: `tx_reserve_${Date.now()}`,
        userId,
        type: 'reserve',
        amount: -amount,
        subject: `棰勬墸: ${orderId}`,
        refId: orderId,
        channel,
        createdAt: new Date().toISOString(),
      });
      return wallet;
    });

    if (!lockResult.success) {
      return { reserved: false, reason: lockResult.error === 'operation_rejected' ? '浣欓涓嶈冻' : 'reserve_failed' };
    }

    return {
      reserved: true,
      orderId,
      amount,
      channel,
      reservedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + RESERVE_TTL).toISOString(),
    };
  }

  static executeReserved(userId, orderId, splits) {
    const { wallets } = require('../models/dataStore');
    const lockResult = wallets.withLock(userId, (wallet) => {
      wallet.reservedAmount = Math.max(0, (wallet.reservedAmount || 0) - (wallet.transactions.find(t => t.refId === orderId && t.type === 'reserve')?.amount || 0) * -1);
      const reserveTx = wallet.transactions.find(t => t.refId === orderId && t.type === 'reserve');
      if (reserveTx) {
        reserveTx.type = 'payment_confirmed';
        reserveTx.confirmedAt = new Date().toISOString();
      }
      return wallet;
    });

    if (splits && Array.isArray(splits)) {
      splits.forEach(split => {
        if (split.wallet) {
          wallets.withLock(split.partyId, (payeeWallet) => {
            payeeWallet.balance = (payeeWallet.balance || 0) + split.amount;
            payeeWallet.transactions.push({
              id: `tx_settle_${Date.now()}_${split.partyId}`,
              userId: split.partyId,
              type: 'split_receipt',
              amount: split.amount,
              subject: split.memo || `鍒嗚处: ${orderId}`,
              refId: orderId,
              createdAt: new Date().toISOString(),
            });
            return payeeWallet;
          });
        }
      });
    }

    return { executed: true, orderId, settledAt: new Date().toISOString() };
  }

  static release(userId, orderId, reason) {
    const { wallets } = require('../models/dataStore');
    const lockResult = wallets.withLock(userId, (wallet) => {
      const reserveTx = wallet.transactions.find(t => t.refId === orderId && t.type === 'reserve');
      if (!reserveTx) return false;
      wallet.balance += Math.abs(reserveTx.amount);
      wallet.reservedAmount = Math.max(0, (wallet.reservedAmount || 0) - Math.abs(reserveTx.amount));
      reserveTx.type = 'reserve_released';
      reserveTx.releaseReason = reason || 'timeout';
      reserveTx.releasedAt = new Date().toISOString();
      return wallet;
    });

    return { released: lockResult.success, orderId, reason };
  }
}

class AiThresholdEngine {
  static THRESHOLD_YUAN = 10;
  static COST_PER_TX = 0.01;

  static calculateThreshold(params) {
    const { channelCost, taxCost, splitWeight, userComplianceLevel } = params;
    const baseThreshold = this.THRESHOLD_YUAN;
    let multiplier = 1.0;
    if (channelCost > 0) multiplier += channelCost * 10;
    if (taxCost > 0) multiplier += taxCost * 5;
    if (splitWeight > 1) multiplier += (splitWeight - 1) * 0.5;
    if (userComplianceLevel === 'full') multiplier *= 0.8;
    else if (userComplianceLevel === 'basic') multiplier *= 1.0;
    else if (userComplianceLevel === 'none') multiplier *= 1.5;
    return parseFloat((baseThreshold * multiplier).toFixed(2));
  }

  static evaluateGuiniuPoint(params) {
    const { currentPoints, pointValue, channelCost, taxCost, splitWeight, userComplianceLevel } = params;
    const threshold = this.calculateThreshold({ channelCost, taxCost, splitWeight, userComplianceLevel });
    const totalValue = currentPoints * pointValue;
    const canTrigger = totalValue >= threshold;
    const netAfterCost = Math.max(0, totalValue - channelCost - taxCost);
    return {
      currentPoints,
      pointValue,
      totalValue: parseFloat(totalValue.toFixed(4)),
      threshold,
      canTrigger,
      netAfterCost: parseFloat(netAfterCost.toFixed(4)),
      costBreakdown: { channelCost, taxCost },
      remainingToThreshold: canTrigger ? 0 : parseFloat(((threshold - totalValue) / pointValue).toFixed(2)),
      complianceLevel: userComplianceLevel,
      recommendation: canTrigger ? '瑙﹀彂鍒嗚处缁撶畻' : `杩橀渶绱 ${parseFloat(((threshold - totalValue) / pointValue).toFixed(2))} 榫熼挳鐐筦,
    };
  }

  static processMicroPayment(params) {
    const { amount, userId, channel, kolTrack } = params;
    const channelProfile = ChannelCapability.getProfile(channel);
    const cost = channelProfile.costPerTx;
    const isBelowCost = amount < cost * 100;

    if (!isBelowCost) {
      return { action: 'direct_settle', reason: '閲戦瓒呰繃鎴愭湰绾?, amount, channel };
    }

    return {
      action: 'accumulate_guiniu_point',
      reason: `閲戦${amount}鍏冧綆浜庨€氶亾鎴愭湰绾?{cost * 100}鍏冿紝绱榫熼挳鐐筦,
      amount,
      channel,
      pointsAdded: parseFloat((amount / 0.01).toFixed(2)),
      costSaving: true,
    };
  }
}

class CollectorAgent {
  static _queue = [];
  static _deadLetterQueue = [];
  static _circuitBreaker = { state: 'closed', failureCount: 0, threshold: 5, resetAt: null };

  static submit(flowEvent) {
    const compliance = CollectorAgent._checkCompliance(flowEvent);
    if (!compliance.passed) {
      return { accepted: false, reason: 'compliance_blocked', blockedStreams: compliance.failedStreams };
    }
    const item = {
      id: 'COL-' + Date.now().toString(36) + '-' + crypto.randomBytes(2).toString('hex'),
      ...flowEvent,
      status: 'queued',
      queuedAt: new Date().toISOString(),
      retries: 0,
      maxRetries: 3,
    };
    CollectorAgent._queue.push(item);
    return { accepted: true, collectionId: item.id, queueDepth: CollectorAgent._queue.length };
  }

  static _checkCompliance(flowEvent) {
    const required = ['orderFlow', 'fundFlow', 'taxFlow'];
    const results = {};
    let passed = true;
    const failedStreams = [];

    required.forEach(stream => {
      const present = flowEvent[stream] && flowEvent[stream].status !== 'failed';
      results[stream] = present;
      if (!present) {
        passed = false;
        failedStreams.push(stream);
      }
    });

    results.notaryFlow = !!flowEvent.notaryFlow;
    if (!results.notaryFlow) {
      failedStreams.push('notaryFlow');
    }

    return { passed, results, failedStreams };
  }

  static process() {
    if (CollectorAgent._circuitBreaker.state === 'open') {
      if (CollectorAgent._circuitBreaker.resetAt && Date.now() > CollectorAgent._circuitBreaker.resetAt) {
        CollectorAgent._circuitBreaker.state = 'closed';
        CollectorAgent._circuitBreaker.failureCount = 0;
      } else {
        return { processed: 0, reason: 'circuit_breaker_open' };
      }
    }

    const batch = CollectorAgent._queue.filter(i => i.status === 'queued');
    let processed = 0;
    let failed = 0;

    batch.forEach(item => {
      try {
        item.status = 'processing';
        item.processedAt = new Date().toISOString();

        const evidence = NotaryEngine.createEvidence({
          orderId: item.orderFlow?.orderId || item.id,
          amount: item.fundFlow?.amount || 0,
          channel: item.fundFlow?.channel || 'unknown',
          payerId: item.orderFlow?.payerId,
          payeeId: item.orderFlow?.payeeId,
          subject: item.orderFlow?.subject || '',
          splits: item.fundFlow?.splits || [],
          taxResult: item.taxFlow || null,
          hash: _hash(item),
          notaryProvider: item.notaryFlow?.provider || 'collector',
        });

        item.evidenceId = evidence.evidenceId;
        item.status = 'completed';
        item.completedAt = new Date().toISOString();
        processed++;
      } catch (e) {
        item.retries++;
        item.lastError = e.message;
        if (item.retries >= item.maxRetries) {
          item.status = 'dead';
          item.deadAt = new Date().toISOString();
          CollectorAgent._deadLetterQueue.push(item);
          CollectorAgent._queue = CollectorAgent._queue.filter(i => i.id !== item.id);
        } else {
          item.status = 'queued';
        }
        failed++;
        CollectorAgent._circuitBreaker.failureCount++;
      }
    });

    if (CollectorAgent._circuitBreaker.failureCount >= CollectorAgent._circuitBreaker.threshold) {
      CollectorAgent._circuitBreaker.state = 'open';
      CollectorAgent._circuitBreaker.resetAt = Date.now() + 60000;
    }

    return { processed, failed, queueDepth: CollectorAgent._queue.length, dlqDepth: CollectorAgent._deadLetterQueue.length };
  }

  static stats() {
    return {
      queue: CollectorAgent._queue.length,
      deadLetter: CollectorAgent._deadLetterQueue.length,
      circuitBreaker: { ...CollectorAgent._circuitBreaker },
    };
  }

  static getDeadLetters() {
    return CollectorAgent._deadLetterQueue;
  }

  static replayDeadLetter(id) {
    const idx = CollectorAgent._deadLetterQueue.findIndex(i => i.id === id);
    if (idx === -1) return { success: false, error: 'not_found' };
    const item = CollectorAgent._deadLetterQueue.splice(idx, 1)[0];
    item.status = 'queued';
    item.retries = 0;
    item.replayedAt = new Date().toISOString();
    CollectorAgent._queue.push(item);
    return { success: true, id };
  }
}

router.post('/estimate', (req, res) => {
  const { totalAmount, ruleId, splits: customSplits, kolTrack, monthlyAccumulated, dailyCount } = req.body;
  let splitResult = [];
  if (customSplits) {
    const totalWeight = customSplits.reduce((s, x) => s + (x.weight || 0), 0);
    splitResult = new SplitContract({ splits: customSplits, totalWeight }).calculate(parseFloat(totalAmount) || 0);
  } else if (ruleId && splitRules.has(ruleId)) {
    splitResult = splitRules.get(ruleId).calculate(parseFloat(totalAmount) || 0);
  }
  let taxEstimate = null;
  if (kolTrack && totalAmount) {
    taxEstimate = TaxEngine.calculate({ amount: parseFloat(totalAmount), track: kolTrack, monthlyAccumulated: monthlyAccumulated || 0, dailyCount: dailyCount || 0 });
  }
  const channelRecommendation = ChannelCapability.recommend({
    amount: parseFloat(totalAmount) || 0,
    needSplit: splitResult.length > 0,
    needUmbrella: false,
    userKycLevel: 'basic',
    preferLowCost: true,
  });

  res.json({ success: true, data: { splits: splitResult, taxEstimate: taxEstimate, channelRecommendation } });
});

router.post('/rule', (req, res) => {
  const { ruleId, name, splits, conditions } = req.body;
  if (!name || !splits || !Array.isArray(splits) || splits.length === 0) {
    return res.status(400).json({ success: false, error: '璇峰～鍐欏垎璐﹁鍒欏悕绉板拰鍒嗚处鍒楄〃' });
  }

  const totalWeight = splits.reduce((s, x) => s + (x.weight || 0), 0);
  const contract = new SplitContract({ ruleId: ruleId || _genId(), name, totalWeight, splits, conditions: conditions || {} });
  splitRules.set(contract.ruleId, contract);

  res.json({ success: true, data: { ruleId: contract.ruleId, name: contract.name, splits: contract.splits, totalWeight: contract.totalWeight, enabled: contract.enabled } });
});

router.get('/rules', (req, res) => {
  const list = Array.from(splitRules.values()).map(r => ({ ruleId: r.ruleId, name: r.name, splits: r.splits, totalWeight: r.totalWeight, enabled: r.enabled, createdAt: r.createdAt }));
  res.json({ success: true, data: list });
});

router.delete('/rule', (req, res) => {
  const { ruleId } = req.query;
  if (!ruleId) return res.status(400).json({ success: false, error: 'ruleId required' });
  const deleted = splitRules.delete(ruleId);
  res.json({ success: deleted, message: deleted ? '宸插垹闄? : '鏈壘鍒? });
});

router.post('/tax/calculate', (req, res) => {
  const { amount, track, monthlyAccumulated, dailyCount } = req.body;
  if (!amount || !track) return res.status(400).json({ success: false, error: '缂哄皯閲戦鎴栫◣鍔¤建' });
  const result = TaxEngine.calculate({ amount: parseFloat(amount), track: track, monthlyAccumulated: monthlyAccumulated || 0, dailyCount: dailyCount || 0 });
  res.json({ success: true, data: result });
});

router.post('/tax/batch', (req, res) => {
  const { items } = req.body;
  if (!items || !Array.isArray(items)) return res.status(400).json({ success: false, error: '闇€瑕乮tems鏁扮粍' });
  res.json({ success: true, data: TaxEngine.batchProcessMonth(items) });
});

router.get('/tax/thresholds', (req, res) => {
  res.json({ success: true, data: TAX_THRESHOLDS });
});

router.post('/prepare', (req, res) => {
  try {
    _loadBackends();

    const { channel = 'alipay', totalAmount, subject, payerId, payeeId, splits: customSplits, ruleId, agentId, payMode, kolTrack, monthlyAccumulated, dailyCount } = req.body;

    const amount = parseFloat(totalAmount);
    if (!amount || amount <= 0) return res.status(400).json({ success: false, error: '鏃犳晥閲戦' });
    if (!subject) return res.status(400).json({ success: false, error: '璇峰～鍐欒鍗曟爣棰? });

    let splitResult = [];
    if (customSplits && Array.isArray(customSplits) && customSplits.length > 0) {
      const totalW = customSplits.reduce((s, x) => s + (x.weight || 0), 0);
      splitResult = new SplitContract({ splits: customSplits, totalWeight: totalW }).calculate(amount);
    } else if (ruleId && splitRules.has(ruleId)) {
      splitResult = splitRules.get(ruleId).calculate(amount);
    }

    let taxResult = null;
    if (kolTrack) {
      taxResult = TaxEngine.calculate({ amount: amount, track: kolTrack, monthlyAccumulated: monthlyAccumulated || 0, dailyCount: dailyCount || 0 });
    }

    const orderId = _genId();
    const order = {
      id: orderId, channel, amount, subject,
      payerId: payerId || agentId || 'anonymous',
      payeeId, splits: splitResult, agentId: agentId || null,
      status: 'prepared',
      createdAt: new Date().toISOString(),
    };

    const hash = _hash(order);
    order.hash = hash;

    const evidenceRecord = NotaryEngine.createEvidence({
      orderId, amount, channel,
      payerId: order.payerId, payeeId,
      subject, splits: splitResult, taxResult, hash,
      notaryProvider: channel === 'ecny' ? 'ecny_trail' : 'self',
    });
    order.evidenceId = evidenceRecord.evidenceId;

    const walletCheck = WalletReserveEngine.check(order.payerId, amount, channel);

    const channelProfile = ChannelCapability.getProfile(channel);
    const thresholdEval = AiThresholdEngine.processMicroPayment({
      amount, userId: order.payerId, channel, kolTrack,
    });

    const guiniuEval = AiThresholdEngine.evaluateGuiniuPoint({
      currentPoints: amount / 0.01,
      pointValue: 0.01,
      channelCost: channelProfile.costPerTx,
      taxCost: taxResult?.taxWithheld || 0,
      splitWeight: splitResult.length || 1,
      userComplianceLevel: 'basic',
    });

    order.walletCheck = walletCheck;
    order.thresholdEval = thresholdEval;
    order.guiniuEval = guiniuEval;

    orders.set(orderId, order);

    res.json({ success: true, data: {
      paymentId: orderId,
      channel,
      totalAmount: amount,
      subject,
      payerId: order.payerId,
      payeeId,
      splits: splitResult,
      taxResult: taxResult,
      walletCheck,
      channelProfile,
      thresholdEval,
      guiniuEval,
      evidence: {
        evidenceId: evidenceRecord.evidenceId,
        digest: evidenceRecord.digest,
        status: evidenceRecord.status,
        timestamp: evidenceRecord.timestamp,
      },
      hash,
      status: order.status,
      nextStep: 'confirm',
      confirmUrl: '/api/settle/confirm',
      createdAt: order.createdAt,
    } });
  } catch (err) {
    console.error('[Settle Prepare Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/confirm', async (req, res) => {
  try {
    _loadBackends();

    const { paymentId, firstConsent, secondConsent, consentMethod, channel, payMode } = req.body;
    if (!paymentId) return res.status(400).json({ success: false, error: 'paymentId 蹇呭～' });

    const order = orders.get(paymentId);
    if (!order) return res.status(404).json({ success: false, error: '璁㈠崟涓嶅瓨鍦? });
    if (order.status !== 'prepared') {
      return res.status(400).json({ success: false, error: `璁㈠崟鐘舵€佷笉鍏佽纭: ${order.status}` });
    }

    if (!firstConsent) {
      return res.status(400).json({ success: false, error: '绗竴娆＄敤鎴风‘璁わ紙榫熼挳濂栧姳鏉冪泭鐐瑰綊闆嗗悓鎰忥級鏈€氳繃' });
    }

    NotaryEngine.recordConsent(order.evidenceId, 'firstConsent', {
      method: consentMethod || 'api',
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    const ch = channel || order.channel;
    const reserveResult = WalletReserveEngine.reserve(order.payerId, order.amount, paymentId, ch);
    if (!reserveResult.reserved) {
      order.status = 'reserve_failed';
      orders.set(paymentId, order);
      return res.json({ success: false, error: '棰勬墸澶辫触: ' + reserveResult.reason, paymentId });
    }

    if (!secondConsent) {
      return res.json({
        success: true,
        data: {
          paymentId,
          status: 'reserved',
          reserve: reserveResult,
          message: '棰勬墸宸查攣瀹氾紝绛夊緟绗簩娆＄‘璁わ紙鐪熼挶L1鍏戜粯+瀛樿瘉HASH纭锛?,
          nextStep: 'execute',
          executeUrl: '/api/settle/execute',
        },
      });
    }

    NotaryEngine.recordConsent(order.evidenceId, 'secondConsent', {
      method: consentMethod || 'api',
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    order.status = 'confirmed';
    order.confirmedAt = new Date().toISOString();
    orders.set(paymentId, order);

    let paymentInstruction;
    const mode = payMode || 'page';

    switch (ch) {
      case 'wechat': {
        if (wechatPayBackend) {
          paymentInstruction = await wechatPayBackend.createJsapiPay(order.amount.toFixed(2), order.subject, req.body.openid || 'simulate_openid');
          if (paymentInstruction && !paymentInstruction.environment) paymentInstruction.environment = 'sandbox';
        } else {
          paymentInstruction = { channel: 'wechat', outTradeNo: paymentId, totalAmount: order.amount.toFixed(2), subject: order.subject, mode: 'simulated', environment: 'simulated' };
        }
        break;
      }
      case 'ecny': {
        if (ecnyBackend) {
          const ecnyResult = await ecnyBackend.createTradeQrcode(order.amount, order.subject, req.body.payeeWallet || '');
          paymentInstruction = { channel: 'ecny', outTradeNo: ecnyResult.tradeNo, qrCode: ecnyResult.qrCode, payUrl: ecnyResult.payUrl, totalAmount: order.amount.toFixed(2), subject: order.subject, mode: 'qrcode', environment: 'live' };
        } else {
          paymentInstruction = { channel: 'ecny', outTradeNo: paymentId, totalAmount: order.amount.toFixed(2), subject: order.subject, mode: 'simulated', environment: 'simulated' };
        }
        break;
      }
      case 'alipay':
      default: {
        if (alipayBackend) {
          switch (mode) {
            case 'qrcode': paymentInstruction = await alipayBackend.createTradePrecreate(order.amount.toFixed(2), order.subject); break;
            case 'app': paymentInstruction = await alipayBackend.createTradeAppPay(order.amount.toFixed(2), order.subject); break;
            default: paymentInstruction = await alipayBackend.createTradePagePay(order.amount.toFixed(2), order.subject);
          }
          if (paymentInstruction && !paymentInstruction.environment) paymentInstruction.environment = 'sandbox';
        } else {
          paymentInstruction = { channel: 'alipay', outTradeNo: paymentId, totalAmount: order.amount.toFixed(2), subject: order.subject, mode: 'simulated', environment: 'simulated' };
        }
      }
    }

    if (order.splits.length > 0 && ch === 'ecny') {
      try {
        let umbrellaResult = null;
        try {
          const { UmbrellaSplitEngine } = require('../protocols/umbrellaSplit');
          const localEngine = new UmbrellaSplitEngine();
          umbrellaResult = localEngine.execute({
            totalAmount: order.amount,
            sourceTradeNo: paymentId,
            kol: req.body.kol ? { track: req.body.kol.track || 'B' } : null,
            monthlyAccumulated: req.body.monthlyAccumulated || 0,
            dailyCount: req.body.dailyCount || 0,
            customSplits: order.splits.map(s => ({ weight: s.weight, targetType: s.partyId, memo: s.memo })),
          });
        } catch (ue) {
          console.warn('[Settle] 鏈湴浼炲垪寮曟搸鏈姞杞?', ue.message);
          if (ecnyBackend) {
            umbrellaResult = await ecnyBackend.umbrellaSplit({
              parentTradeNo: paymentInstruction.outTradeNo || paymentId,
              totalAmount: order.amount,
              splits: order.splits.map(s => ({ wallet: s.wallet, amount: s.amount, memo: s.memo || s.partyId })),
            });
          }
        }
        if (umbrellaResult) {
          order.umbrellaBatchNo = umbrellaResult.batchNo || '';
          order.umbrellaEntries = umbrellaResult.entries || [];
        }
      } catch (ue) {
        console.warn('[Settle] 浼炲垪鍒嗚处鎵ц澶辫触:', ue.message);
      }
    }

    const collectResult = CollectorAgent.submit({
      orderFlow: { orderId: paymentId, payerId: order.payerId, payeeId: order.payeeId, subject: order.subject, status: 'confirmed' },
      fundFlow: { amount: order.amount, channel: ch, splits: order.splits, status: 'confirmed' },
      taxFlow: order.taxResult || { status: 'pending' },
      notaryFlow: { provider: 'self', evidenceId: order.evidenceId, status: 'created' },
    });

    if (collectResult.accepted) {
      CollectorAgent.process();
    }

    order.status = 'executing';
    order.paymentInstruction = paymentInstruction;
    orders.set(paymentId, order);

    res.json({ success: true, data: {
      paymentId,
      channel: ch,
      totalAmount: order.amount,
      subject: order.subject,
      payerId: order.payerId,
      payeeId: order.payeeId,
      paymentInstruction,
      splits: order.splits,
      taxResult: order.taxResult,
      evidence: {
        evidenceId: order.evidenceId,
        confirmations: { firstConsent: true, secondConsent: true },
        status: 'sealed',
      },
      collectionId: collectResult.collectionId,
      reserve: reserveResult,
      status: order.status,
    } });
  } catch (err) {
    console.error('[Settle Confirm Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/execute', async (req, res) => {
  try {
    const { paymentId } = req.body;
    if (!paymentId) return res.status(400).json({ success: false, error: 'paymentId 蹇呭～' });

    const order = orders.get(paymentId);
    if (!order) return res.status(404).json({ success: false, error: '璁㈠崟涓嶅瓨鍦? });
    if (order.status !== 'reserved' && order.status !== 'confirmed') {
      return res.status(400).json({ success: false, error: `璁㈠崟鐘舵€佷笉鍏佽鎵ц: ${order.status}` });
    }

    const secondConsentData = req.body.secondConsent || { method: 'api', granted: true };
    NotaryEngine.recordConsent(order.evidenceId, 'secondConsent', {
      method: secondConsentData.method || 'api',
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });

    _loadBackends();
    let paymentInstruction;
    const ch = order.channel;
    const mode = req.body.payMode || 'page';

    switch (ch) {
      case 'wechat': {
        if (wechatPayBackend) {
          paymentInstruction = await wechatPayBackend.createJsapiPay(order.amount.toFixed(2), order.subject, req.body.openid || 'simulate_openid');
          if (paymentInstruction && !paymentInstruction.environment) paymentInstruction.environment = 'sandbox';
        } else {
          paymentInstruction = { channel: 'wechat', outTradeNo: paymentId, totalAmount: order.amount.toFixed(2), subject: order.subject, mode: 'simulated', environment: 'simulated' };
        }
        break;
      }
      case 'ecny': {
        if (ecnyBackend) {
          const ecnyResult = await ecnyBackend.createTradeQrcode(order.amount, order.subject, req.body.payeeWallet || '');
          paymentInstruction = { channel: 'ecny', outTradeNo: ecnyResult.tradeNo, qrCode: ecnyResult.qrCode, payUrl: ecnyResult.payUrl, totalAmount: order.amount.toFixed(2), subject: order.subject, mode: 'qrcode', environment: 'live' };
        } else {
          paymentInstruction = { channel: 'ecny', outTradeNo: paymentId, totalAmount: order.amount.toFixed(2), subject: order.subject, mode: 'simulated', environment: 'simulated' };
        }
        break;
      }
      case 'alipay':
      default: {
        if (alipayBackend) {
          switch (mode) {
            case 'qrcode': paymentInstruction = await alipayBackend.createTradePrecreate(order.amount.toFixed(2), order.subject); break;
            case 'app': paymentInstruction = await alipayBackend.createTradeAppPay(order.amount.toFixed(2), order.subject); break;
            default: paymentInstruction = await alipayBackend.createTradePagePay(order.amount.toFixed(2), order.subject);
          }
          if (paymentInstruction && !paymentInstruction.environment) paymentInstruction.environment = 'sandbox';
        } else {
          paymentInstruction = { channel: 'alipay', outTradeNo: paymentId, totalAmount: order.amount.toFixed(2), subject: order.subject, mode: 'simulated', environment: 'simulated' };
        }
      }
    }

    const executeResult = WalletReserveEngine.executeReserved(order.payerId, paymentId, order.splits);

    const collectResult = CollectorAgent.submit({
      orderFlow: { orderId: paymentId, payerId: order.payerId, payeeId: order.payeeId, subject: order.subject, status: 'completed' },
      fundFlow: { amount: order.amount, channel: ch, splits: order.splits, status: 'completed' },
      taxFlow: order.taxResult || { status: 'pending' },
      notaryFlow: { provider: 'self', evidenceId: order.evidenceId, status: 'sealed' },
    });

    if (collectResult.accepted) {
      CollectorAgent.process();
    }

    NotaryEngine.updateStatus(order.evidenceId, 'sealed', { sealedAt: new Date().toISOString() });

    order.status = 'completed';
    order.paidAt = new Date().toISOString();
    order.paymentInstruction = paymentInstruction;
    orders.set(paymentId, order);

    res.json({ success: true, data: {
      paymentId,
      channel: ch,
      totalAmount: order.amount,
      subject: order.subject,
      payerId: order.payerId,
      payeeId: order.payeeId,
      paymentInstruction,
      splits: order.splits,
      taxResult: order.taxResult,
      evidence: {
        evidenceId: order.evidenceId,
        status: 'sealed',
        confirmations: { firstConsent: true, secondConsent: true },
      },
      walletExecution: executeResult,
      collectionId: collectResult.collectionId,
      status: order.status,
      paidAt: order.paidAt,
    } });
  } catch (err) {
    console.error('[Settle Execute Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/release', (req, res) => {
  try {
    const { paymentId, reason } = req.body;
    if (!paymentId) return res.status(400).json({ success: false, error: 'paymentId 蹇呭～' });

    const order = orders.get(paymentId);
    if (!order) return res.status(404).json({ success: false, error: '璁㈠崟涓嶅瓨鍦? });

    const releaseResult = WalletReserveEngine.release(order.payerId, paymentId, reason || 'manual_release');

    order.status = 'released';
    order.releasedAt = new Date().toISOString();
    order.releaseReason = reason || 'manual_release';
    orders.set(paymentId, order);

    NotaryEngine.updateStatus(order.evidenceId, 'voided', { voidedAt: new Date().toISOString(), voidReason: reason || 'manual_release' });

    res.json({ success: true, data: { paymentId, status: order.status, releaseResult } });
  } catch (err) {
    console.error('[Settle Release Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/checkout', async (req, res) => {
  try {
    _loadBackends();

    const { channel = 'alipay', totalAmount, subject, payerId, payeeId, splits: customSplits, ruleId, agentId, payMode, kolTrack, monthlyAccumulated, dailyCount } = req.body;

    const amount = parseFloat(totalAmount);
    if (!amount || amount <= 0) return res.status(400).json({ success: false, error: '鏃犳晥閲戦' });
    if (!subject) return res.status(400).json({ success: false, error: '璇峰～鍐欒鍗曟爣棰? });

    let splitResult = [];
    if (customSplits && Array.isArray(customSplits) && customSplits.length > 0) {
      const totalW = customSplits.reduce((s, x) => s + (x.weight || 0), 0);
      splitResult = new SplitContract({ splits: customSplits, totalWeight: totalW }).calculate(amount);
    } else if (ruleId && splitRules.has(ruleId)) {
      splitResult = splitRules.get(ruleId).calculate(amount);
    }

    let taxResult = null;
    if (kolTrack) {
      taxResult = TaxEngine.calculate({ amount: amount, track: kolTrack, monthlyAccumulated: monthlyAccumulated || 0, dailyCount: dailyCount || 0 });
    }

    const orderId = _genId();
    const order = { id: orderId, channel, amount, subject, payerId: payerId || agentId || 'anonymous', payeeId, splits: splitResult, agentId: agentId || null, status: 'pending', createdAt: new Date().toISOString() };
    orders.set(orderId, order);

    const hash = _hash(order);
    order.hash = hash;

    const evidenceRecord = NotaryEngine.createEvidence({
      orderId, amount, channel,
      payerId: order.payerId, payeeId,
      subject, splits: splitResult, taxResult, hash,
      notaryProvider: channel === 'ecny' ? 'ecny_trail' : 'self',
    });
    order.evidenceId = evidenceRecord.evidenceId;

    let paymentInstruction;

    switch (channel) {
      case 'wechat': {
        if (wechatPayBackend) {
          paymentInstruction = await wechatPayBackend.createJsapiPay(amount.toFixed(2), subject, req.body.openid || 'simulate_openid');
          if (paymentInstruction && !paymentInstruction.environment) paymentInstruction.environment = 'sandbox';
        } else {
          paymentInstruction = { channel: 'wechat', outTradeNo: orderId, totalAmount: amount.toFixed(2), subject, mode: 'simulated', environment: 'simulated' };
        }
        break;
      }
      case 'ecny': {
        if (ecnyBackend) {
          const ecnyResult = await ecnyBackend.createTradeQrcode(amount, subject, req.body.payeeWallet || '');
          paymentInstruction = { channel: 'ecny', outTradeNo: ecnyResult.tradeNo, qrCode: ecnyResult.qrCode, payUrl: ecnyResult.payUrl, totalAmount: amount.toFixed(2), subject, mode: 'qrcode', environment: 'live' };
        } else {
          paymentInstruction = { channel: 'ecny', outTradeNo: orderId, totalAmount: amount.toFixed(2), subject, mode: 'simulated', environment: 'simulated' };
        }
        break;
      }
      case 'alipay':
      default: {
        const mode = payMode || 'page';
        if (alipayBackend) {
          switch (mode) {
            case 'qrcode': paymentInstruction = await alipayBackend.createTradePrecreate(amount.toFixed(2), subject); break;
            case 'app': paymentInstruction = await alipayBackend.createTradeAppPay(amount.toFixed(2), subject); break;
            default: paymentInstruction = await alipayBackend.createTradePagePay(amount.toFixed(2), subject);
          }
          if (paymentInstruction && !paymentInstruction.environment) paymentInstruction.environment = 'sandbox';
        } else {
          paymentInstruction = { channel: 'alipay', outTradeNo: orderId, totalAmount: amount.toFixed(2), subject, mode: 'simulated', environment: 'simulated' };
        }
      }
    }

    if (splitResult.length > 0 && channel === 'ecny') {
      try {
        let umbrellaResult = null;
        try {
          const { UmbrellaSplitEngine } = require('../protocols/umbrellaSplit');
          const localEngine = new UmbrellaSplitEngine();
          umbrellaResult = localEngine.execute({
            totalAmount: amount,
            sourceTradeNo: orderId,
            kol: req.body.kol ? { track: req.body.kol.track || 'B' } : null,
            monthlyAccumulated: req.body.monthlyAccumulated || 0,
            dailyCount: req.body.dailyCount || 0,
            customSplits: splitResult.map(s => ({ weight: s.weight, targetType: s.partyId, memo: s.memo })),
          });
        } catch (ue) {
          console.warn('[Settle] 鏈湴浼炲垪寮曟搸鏈姞杞? 灏濊瘯 e-CNY 鍚庣:', ue.message);
          if (ecnyBackend) {
            umbrellaResult = await ecnyBackend.umbrellaSplit({
              parentTradeNo: paymentInstruction.outTradeNo || orderId,
              totalAmount: amount,
              splits: splitResult.map(s => ({ wallet: s.wallet, amount: s.amount, memo: s.memo || s.partyId })),
            });
          }
        }
        if (umbrellaResult) {
          order.umbrellaBatchNo = umbrellaResult.batchNo || '';
          order.umbrellaEntries = umbrellaResult.entries || [];
        }
      } catch (ue) {
        console.warn('[Settle] 浼炲垪鍒嗚处鎵ц澶辫触:', ue.message);
      }
    }

    res.json({ success: true, data: {
      paymentId: orderId,
      channel,
      totalAmount: amount,
      subject,
      payerId: order.payerId,
      payeeId,
      paymentInstruction,
      splits: splitResult,
      taxResult: taxResult,
      evidence: {
        evidenceId: evidenceRecord.evidenceId,
        digest: evidenceRecord.digest,
        status: evidenceRecord.status,
        timestamp: evidenceRecord.timestamp,
        fundFlowSnapshot: evidenceRecord.fundFlowSnapshot,
      },
      hash,
      status: order.status,
      createdAt: order.createdAt,
    } });
  } catch (err) {
    console.error('[Settle Checkout Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/channels', (req, res) => {
  _loadBackends();
  const channels = [];
  if (alipayBackend) channels.push({ id: 'alipay', name: '鏀粯瀹?, modes: ['page', 'qrcode', 'app'], icon: 'alipay', description: '鏀粯瀹濇壂鐮?璺宠浆鏀粯' });
  if (wechatPayBackend) channels.push({ id: 'wechat', name: '寰俊鏀粯', modes: ['jsapi'], icon: 'wechat', description: '寰俊灏忕▼搴忔敮浠? });
  if (ecnyBackend) channels.push({ id: 'ecny', name: '鏁板瓧浜烘皯甯?, modes: ['qrcode', 'page'], icon: 'ecny', description: 'e-CNY 鏁板瓧浜烘皯甯佺粨绠楋紙寤鸿锛? });
  if (channels.length === 0) {
    channels.push({ id: 'alipay', name: '鏀粯瀹濓紙妯℃嫙锛?, modes: ['page'], icon: 'alipay', description: '妯℃嫙妯″紡' });
    channels.push({ id: 'wechat', name: '寰俊鏀粯锛堟ā鎷燂級', modes: ['jsapi'], icon: 'wechat', description: '妯℃嫙妯″紡' });
    channels.push({ id: 'ecny', name: '鏁板瓧浜烘皯甯侊紙妯℃嫙锛?, modes: ['qrcode'], icon: 'ecny', description: '妯℃嫙妯″紡' });
  }
  res.json({ success: true, data: channels });
});

router.get('/channel/profile', (req, res) => {
  const { channel } = req.query;
  if (!channel) return res.status(400).json({ success: false, error: 'channel required' });
  res.json({ success: true, data: ChannelCapability.getProfile(channel) });
});

router.post('/channel/recommend', (req, res) => {
  const { amount, needSplit, needUmbrella, userKycLevel, preferLowCost } = req.body;
  const recommendation = ChannelCapability.recommend({ amount, needSplit, needUmbrella, userKycLevel, preferLowCost });
  res.json({ success: true, data: recommendation });
});

router.post('/wallet/check', (req, res) => {
  const { userId, amount, channel } = req.body;
  if (!userId || !amount) return res.status(400).json({ success: false, error: 'userId, amount 蹇呭～' });
  const result = WalletReserveEngine.check(userId, parseFloat(amount), channel || 'alipay');
  res.json({ success: true, data: result });
});

router.post('/wallet/reserve', (req, res) => {
  const { userId, amount, orderId, channel } = req.body;
  if (!userId || !amount || !orderId) return res.status(400).json({ success: false, error: 'userId, amount, orderId 蹇呭～' });
  const result = WalletReserveEngine.reserve(userId, parseFloat(amount), orderId, channel || 'alipay');
  res.json({ success: true, data: result });
});

router.post('/wallet/release', (req, res) => {
  const { userId, orderId, reason } = req.body;
  if (!userId || !orderId) return res.status(400).json({ success: false, error: 'userId, orderId 蹇呭～' });
  const result = WalletReserveEngine.release(userId, orderId, reason || 'manual');
  res.json({ success: true, data: result });
});

router.post('/threshold/evaluate', (req, res) => {
  const { currentPoints, pointValue, channelCost, taxCost, splitWeight, userComplianceLevel } = req.body;
  const result = AiThresholdEngine.evaluateGuiniuPoint({ currentPoints, pointValue, channelCost, taxCost, splitWeight, userComplianceLevel });
  res.json({ success: true, data: result });
});

router.post('/threshold/micro-payment', (req, res) => {
  const { amount, userId, channel, kolTrack } = req.body;
  if (!amount || !userId) return res.status(400).json({ success: false, error: 'amount, userId 蹇呭～' });
  const result = AiThresholdEngine.processMicroPayment({ amount: parseFloat(amount), userId, channel: channel || 'alipay', kolTrack });
  res.json({ success: true, data: result });
});

router.get('/collector/stats', (req, res) => {
  res.json({ success: true, data: CollectorAgent.stats() });
});

router.get('/collector/dead-letters', (req, res) => {
  res.json({ success: true, data: CollectorAgent.getDeadLetters() });
});

router.post('/collector/replay', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });
  const result = CollectorAgent.replayDeadLetter(id);
  res.json({ success: result.success, data: result });
});

router.post('/notarize', (req, res) => {
  const { orderId, notaryProvider } = req.body;
  if (!orderId) return res.status(400).json({ success: false, error: 'orderId required' });
  const order = orders.get(orderId);
  if (!order) return res.status(404).json({ success: false, error: '璁㈠崟涓嶅瓨鍦? });

  const evidence = NotaryEngine.createEvidence({
    orderId, amount: order.amount, channel: order.channel,
    payerId: order.payerId, payeeId: order.payeeId,
    subject: order.subject, splits: order.splits || [],
    hash: order.hash, notaryProvider: notaryProvider || 'manual',
  });
  res.json({ success: true, data: evidence });
});

router.get('/evidence/:id', (req, res) => {
  const record = NotaryEngine.getEvidence(req.params.id);
  if (!record) return res.status(404).json({ success: false, error: '瀛樿瘉涓嶅瓨鍦? });
  res.json({ success: true, data: record });
});

router.get('/evidence', (req, res) => {
  const { orderId } = req.query;
  if (!orderId) return res.status(400).json({ success: false, error: 'orderId required' });
  res.json({ success: true, data: NotaryEngine.findByOrder(orderId) });
});

router.post('/evidence/verify', (req, res) => {
  const { evidenceId } = req.body;
  if (!evidenceId) return res.status(400).json({ success: false, error: 'evidenceId required' });
  const result = NotaryEngine.verify(evidenceId);
  res.json({ success: true, data: { evidenceId, ...result } });
});

router.get('/evidence/stats', (req, res) => {
  res.json({ success: true, data: NotaryEngine.stats() });
});

router.post('/evidence/attach', (req, res) => {
  const { evidenceId, streamName, data } = req.body;
  if (!evidenceId || !streamName || !data) {
    return res.status(400).json({ success: false, error: 'evidenceId, streamName, data required' });
  }
  const result = NotaryEngine.attachStream(evidenceId, streamName, data);
  if (!result) return res.status(404).json({ success: false, error: '瀛樿瘉涓嶅瓨鍦? });
  res.json({ success: true, data: result });
});

router.post('/evidence/consent', (req, res) => {
  const { evidenceId, consentType, consentData } = req.body;
  if (!evidenceId || !consentType) {
    return res.status(400).json({ success: false, error: 'evidenceId, consentType required' });
  }
  const result = NotaryEngine.recordConsent(evidenceId, consentType, consentData || {});
  if (!result) return res.status(404).json({ success: false, error: '瀛樿瘉涓嶅瓨鍦? });
  res.json({ success: true, data: result });
});

router.get('/order/:id', (req, res) => {
  const order = orders.get(req.params.id);
  if (!order) return res.status(404).json({ success: false, error: '璁㈠崟涓嶅瓨鍦? });
  res.json({ success: true, data: order });
});

router.post('/notify', async (req, res) => {
  _loadBackends();
  const { channel } = req.query;
  const notification = req.body;
  console.log('[Settle Notify]', channel, JSON.stringify(notification).slice(0, 200));

  try {
    if (channel === 'ecny' && ecnyBackend) {
      const valid = await ecnyBackend.handleNotify(notification);
      if (valid) {
        const order = orders.get(notification.outTradeNo);
        if (order) { order.status = 'completed'; order.paidAt = new Date().toISOString(); }
        return res.send('success');
      }
    } else if (channel === 'alipay' && alipayBackend) {
      const valid = await alipayBackend.handleNotify(notification);
      if (valid) {
        const order = orders.get(notification.out_trade_no);
        if (order) { order.status = 'completed'; order.paidAt = new Date().toISOString(); }
        return res.send('success');
      }
    }
  } catch (e) {
    console.error('[Settle Notify Error]', e.message);
  }
  res.send('success');
});

router.post('/tax/record', (req, res) => {
  const { userId, amount, track, taxWithheld, netAmount, orderId } = req.body;
  if (!userId || !amount) return res.status(400).json({ success: false, error: 'userId, amount 蹇呭～' });
  const record = TaxStateMachine.createRecord({ userId, amount: parseFloat(amount), track: track || 'B', taxWithheld: taxWithheld || 0, netAmount: netAmount || amount, orderId });
  res.json({ success: true, data: record });
});

router.post('/tax/transition', (req, res) => {
  const { recordId, newState, params } = req.body;
  if (!recordId || !newState) return res.status(400).json({ success: false, error: 'recordId, newState 蹇呭～' });
  const result = TaxStateMachine.transition(recordId, newState, params || {});
  res.json(result);
});

router.get('/tax/compliance', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 蹇呭～' });
  const compliance = TaxStateMachine.getUserComplianceWeight(userId);
  res.json({ success: true, data: compliance });
});

router.post('/tax/verify-external', (req, res) => {
  const { userId, source, ref, declarationId } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'userId 蹇呭～' });
  const result = TaxStateMachine.verifyFromExternal(userId, { source, ref, declarationId });
  res.json({ success: true, data: result });
});

module.exports = router;


