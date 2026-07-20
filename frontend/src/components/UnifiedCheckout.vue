<!-- 龟钮·印信 — 统一收银台组件
     三通道 + 分账 + 税务 + 存证四流合一
     用法：
       <UnifiedCheckout
         :amount="100"
         :subject="'订单标题'"
         :splits="[{partyId:'user_001',weight:60}]"
         @success="onPaySuccess"
       />
-->
<template>
  <view class="checkout-wrap">
    <!-- 金额 -->
    <view class="section">
      <text class="section-title">💰 金额</text>
      <view class="amount-row">
        <text class="currency-symbol">¥</text>
        <input class="amount-input" v-model="form.amount" type="digit"
          :disabled="amountFixed" placeholder="输入金额" />
      </view>
    </view>

    <!-- 通道 -->
    <view class="section">
      <text class="section-title">💳 支付通道</text>
      <view class="channel-grid">
        <view v-for="ch in channels" :key="ch.id"
          class="channel-item" :class="{ active: form.channel === ch.id }"
          @tap="form.channel = ch.id">
          <text class="channel-icon">{{ ch.icon }}</text>
          <text class="channel-name">{{ ch.name }}</text>
          <text class="channel-badge" v-if="ch.badge">{{ ch.badge }}</text>
        </view>
      </view>
    </view>

    <!-- 标题 -->
    <view class="section">
      <text class="section-title">📝 订单标题</text>
      <input class="input-field" v-model="form.subject" placeholder="请输入订单标题" />
    </view>

    <!-- 分账 -->
    <view class="section">
      <view class="section-header">
        <text class="section-title">📊 分账设置</text>
        <text class="section-toggle" @tap="showSplits = !showSplits">{{ showSplits ? '收起' : '展开' }}</text>
      </view>
      <template v-if="showSplits">
        <view class="split-row" v-for="(s, i) in form.splits" :key="i">
          <input class="split-party" v-model="s.partyId" placeholder="参与方ID" />
          <input class="split-weight" v-model.number="s.weight" type="digit" placeholder="权重" />
          <text class="split-del" @tap="form.splits.splice(i,1)">✕</text>
        </view>
        <text class="add-split" @tap="form.splits.push({partyId:'',weight:0,memo:''})">+ 添加</text>
      </template>
    </view>

    <!-- 税务 -->
    <view class="section">
      <text class="section-title">🧾 税务轨</text>
      <view class="track-grid">
        <view v-for="t in tracks" :key="t.id"
          class="track-item" :class="{ active: form.kolTrack === t.id }"
          @tap="form.kolTrack = t.id">
          <text class="track-name">{{ t.label }}</text>
        </view>
      </view>
      <view class="row-fields" v-if="form.kolTrack" style="margin-top:12rpx">
        <view class="field-group"><text class="field-label">月累计</text><input class="field-input" v-model="form.monthlyAccumulated" type="digit" placeholder="0" /></view>
        <view class="field-group"><text class="field-label">本日笔数</text><input class="field-input" v-model="form.dailyCount" type="digit" placeholder="0" /></view>
      </view>
    </view>

    <!-- 提交 -->
    <button class="btn-checkout" :disabled="submitting" @tap="submitCheckout">
      <text v-if="!submitting">🚀 统一结算 · ¥{{ totalFixed }}</text>
      <text v-else>处理中...</text>
    </button>

    <!-- 结果 -->
    <view class="result-section" v-if="result">
      <text class="result-title" :class="result.success?'green':'red'">{{ result.success ? '✅ 成功' : '❌ 失败' }}</text>
      <scroll-view scroll-y class="result-scroll"><text class="result-json">{{ JSON.stringify(result.data,null,2) }}</text></scroll-view>
    </view>

    <!-- 存证 -->
    <view class="result-section" v-if="result?.data?.evidence">
      <text class="result-title gold">🔗 存证信息</text>
      <view class="evidence-row"><text class="ev-label">ID</text><text class="ev-value mono">{{ result.data.evidence.evidenceId }}</text></view>
      <view class="evidence-row"><text class="ev-label">摘要</text><text class="ev-value mono">{{ String(result.data.evidence.digest||'').substring(0,24) }}...</text></view>
      <view class="evidence-row"><text class="ev-label">状态</text><text class="ev-value green">{{ result.data.evidence.status }}</text></view>
      <view class="evidence-row" v-if="result.data.evidence.fundFlowSnapshot"><text class="ev-label">资金流</text><text class="ev-value">{{ JSON.stringify(result.data.evidence.fundFlowSnapshot) }}</text></view>
      <button class="btn-sm" @tap="verifyEvidence">🔍 验证存证</button>
    </view>
  </view>
</template>

<script>
const BASE_URL = 'http://localhost:80/api/settle';
export default {
  name: 'UnifiedCheckout',
  props: {
    defaultChannel: { type: String, default: 'alipay' },
    amount: { type: Number, default: 0 },
    subject: { type: String, default: '' },
    payerId: { type: String, default: 'user_002' },
    payeeId: { type: String, default: 'user_001' },
    splits: { type: Array, default: () => [] },
    kolTrack: { type: String, default: '' },
    amountFixed: { type: Boolean, default: false },
  },
  emits: ['success'],
  data() {
    return {
      form: {
        channel: this.defaultChannel,
        amount: this.amount || '',
        subject: this.subject,
        splits: this.splits.length ? JSON.parse(JSON.stringify(this.splits)) : [{ partyId: '', weight: 100 }],
        kolTrack: this.kolTrack,
        monthlyAccumulated: 0, dailyCount: 0,
      },
      channels: [
        { id: 'alipay', name: '支付宝', icon: '💳', badge: '推荐' },
        { id: 'wechat', name: '微信', icon: '💚' },
        { id: 'ecny', name: 'e-CNY', icon: '🪙' },
      ],
      tracks: [
        { id: 'A', label: 'A轨·工资' },
        { id: 'B', label: 'B轨·劳务' },
        { id: 'C', label: 'C轨·经营' },
      ],
      showSplits: this.splits.length > 0,
      submitting: false,
      result: null,
    };
  },
  computed: {
    totalFixed() { return (parseFloat(this.form.amount) || 0).toFixed(2); },
  },
  methods: {
    async submitCheckout() {
      const amt = parseFloat(this.form.amount);
      if (!amt || amt <= 0) { uni.showToast({ title: '请输入金额', icon: 'none' }); return; }
      if (!this.form.subject) { uni.showToast({ title: '请输入标题', icon: 'none' }); return; }
      this.submitting = true; this.result = null;
      const body = {
        channel: this.form.channel, totalAmount: amt, subject: this.form.subject,
        payerId: this.payerId, payeeId: this.payeeId,
        kolTrack: this.form.kolTrack || undefined,
        monthlyAccumulated: parseFloat(this.form.monthlyAccumulated) || 0,
        dailyCount: parseInt(this.form.dailyCount) || 0,
      };
      if (this.form.splits[0]?.partyId) body.splits = this.form.splits.filter(s => s.partyId);
      try {
        const res = await uni.request({ url: BASE_URL + '/checkout', method: 'POST', data: body, header: { 'Content-Type': 'application/json' } });
        this.result = { success: res.data.success, data: res.data.data || res.data };
        if (res.data.success) { uni.showToast({ title: '✅ 下单成功', icon: 'success' }); this.$emit('success', res.data.data); }
        else { uni.showToast({ title: res.data.error || '失败', icon: 'none' }); }
      } catch (e) {
        this.result = { success: false, data: { error: e.message } };
        uni.showToast({ title: '网络错误', icon: 'none' });
      }
      this.submitting = false;
    },
    async verifyEvidence() {
      const evId = this.result?.data?.evidence?.evidenceId;
      if (!evId) { uni.showToast({ title: '无存证', icon: 'none' }); return; }
      try {
        const res = await uni.request({ url: BASE_URL + '/evidence/verify', method: 'POST', data: { evidenceId: evId }, header: { 'Content-Type': 'application/json' } });
        uni.showToast({ title: res.data.data?.valid ? '✅ 验证通过' : '❌ 已被篡改', icon: 'none' });
      } catch (e) { uni.showToast({ title: '验证失败', icon: 'none' }); }
    },
  },
};
</script>

<style scoped>
.checkout-wrap { padding: 0 0 40rpx; }
.section { background: #1a1a2e; border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; border: 1px solid #2a2a4e; }
.section-title { font-size: 28rpx; color: #C8923E; font-weight: bold; display: block; margin-bottom: 10rpx; }
.section-header { display: flex; justify-content: space-between; }
.section-toggle { font-size: 24rpx; color: #6b8cae; }
.amount-row { display: flex; align-items: center; background: #0f0f23; border-radius: 12rpx; padding: 8rpx 16rpx; }
.currency-symbol { font-size: 40rpx; color: #C8923E; font-weight: bold; margin-right: 12rpx; }
.amount-input { flex: 1; font-size: 48rpx; color: #fff; background: transparent; border: none; height: 80rpx; font-weight: bold; }
.channel-grid { display: flex; gap: 12rpx; }
.channel-item { flex: 1; background: #0f0f23; border: 2rpx solid #2a2a4e; border-radius: 12rpx; padding: 20rpx 12rpx; text-align: center; position: relative; }
.channel-item.active { border-color: #C8923E; background: rgba(200,146,62,.1); }
.channel-icon { display: block; font-size: 36rpx; margin-bottom: 6rpx; }
.channel-name { display: block; font-size: 24rpx; color: #b0a898; }
.channel-badge { position: absolute; top: -8rpx; right: -8rpx; background: #C8923E; color: #1a1a2e; font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 20rpx; }
.input-field { background: #0f0f23; border: 1px solid #2a2a4e; border-radius: 8rpx; padding: 16rpx; color: #e0d5c1; font-size: 28rpx; width: 100%; }
.split-row { display: flex; gap: 8rpx; margin-bottom: 8rpx; }
.split-party { flex: 3; background: #0f0f23; border: 1px solid #2a2a4e; border-radius: 6rpx; padding: 10rpx; color: #e0d5c1; font-size: 24rpx; }
.split-weight { flex: 1; background: #0f0f23; border: 1px solid #2a2a4e; border-radius: 6rpx; padding: 10rpx; color: #e0d5c1; font-size: 24rpx; }
.split-del { color: #e74c3c; font-size: 28rpx; padding: 8rpx; }
.add-split { color: #6b8cae; font-size: 24rpx; }
.track-grid { display: flex; gap: 12rpx; }
.track-item { flex: 1; background: #0f0f23; border: 2rpx solid #2a2a4e; border-radius: 12rpx; padding: 14rpx 12rpx; text-align: center; }
.track-item.active { border-color: #C8923E; background: rgba(200,146,62,.1); }
.track-name { font-size: 24rpx; color: #e0d5c1; display: block; }
.row-fields { display: flex; gap: 12rpx; }
.field-group { flex: 1; }
.field-label { display: block; font-size: 22rpx; color: #6b8cae; margin-bottom: 4rpx; }
.field-input { background: #0f0f23; border: 1px solid #2a2a4e; border-radius: 6rpx; padding: 12rpx; color: #e0d5c1; font-size: 24rpx; width: 100%; }
.btn-checkout { width: 100%; background: #C8923E; color: #1a1a2e; border: none; border-radius: 16rpx; padding: 24rpx; font-size: 32rpx; font-weight: bold; margin: 16rpx 0; }
.btn-checkout[disabled] { opacity: .5; }
.btn-sm { background: #2a2a4e; color: #C8923E; border: 1px solid #C8923E; border-radius: 8rpx; padding: 12rpx 24rpx; font-size: 24rpx; margin-top: 12rpx; }
.result-section { background: #0a0a1a; border: 1px solid #2a2a4e; border-radius: 12rpx; padding: 16rpx; margin-top: 16rpx; }
.result-title { font-size: 28rpx; font-weight: bold; display: block; margin-bottom: 8rpx; }
.result-title.green { color: #27ae60; }
.result-title.red { color: #e74c3c; }
.result-title.gold { color: #C8923E; }
.result-scroll { max-height: 300rpx; overflow: auto; }
.result-json { font-size: 20rpx; color: #a0d0a0; font-family: monospace; white-space: pre-wrap; }
.evidence-row { display: flex; gap: 8rpx; margin-bottom: 4rpx; }
.ev-label { font-size: 22rpx; color: #6b8cae; width: 60rpx; flex-shrink: 0; }
.ev-value { font-size: 22rpx; color: #e0d5c1; }
.ev-value.mono { font-family: monospace; font-size: 20rpx; }
.ev-value.green { color: #27ae60; }
</style>
