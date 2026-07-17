<!-- pay/index.vue - 完整版 -->
<template>
  <view class="page">
    <view class="page-header">
      <view class="header-left">
        <text class="header-seal">🔏</text>
        <text class="header-title">龟钮 · 付款</text>
      </view>
      <view class="header-balance" v-if="userStore.isLoggedIn">
        <text class="balance-num">¥{{ balanceAmount.toFixed(2) }}</text>
        <text class="balance-label">可用余额</text>
      </view>
    </view>
    <view class="mode-tabs">
      <view :class="['mode-tab', payMode === 'scan' ? 'active' : '']" @tap="payMode = 'scan'">
        <text class="tab-icon">📷</text>
        <text>扫码付款</text>
      </view>
      <view :class="['mode-tab', payMode === 'direct' ? 'active' : '']" @tap="payMode = 'direct'">
        <text class="tab-icon">🏢</text>
        <text>向企业付款</text>
      </view>
    </view>
    <view class="biz-section card-gn fade-in" v-if="payMode === 'direct'">
      <view class="biz-search-row">
        <input class="biz-input" placeholder="输入企业名称或 ID" @confirm="searchBiz" confirm-type="search" v-model="searchBizId" @input="onSearchInput" />
        <button class="biz-search-btn" :loading="searchingBiz" @tap="searchBiz">搜索</button>
      </view>
      <view class="biz-result" v-if="bizTarget">
        <view class="biz-result-top">
          <text class="biz-company">{{ bizTarget.companyName }}</text>
          <text class="biz-badge">信用 {{ bizTarget.creditRating || 'A' }}</text>
        </view>
        <text class="biz-detail">{{ bizTarget.industry }} · {{ bizTarget.scale }}</text>
        <button class="select-biz-btn" @tap="selectBiz">✓ 向此企业付款</button>
      </view>
      <view class="biz-empty" v-if="bizTarget === null && searchBizId">
        <text class="empty-icon">🔍</text>
        <text>未找到该企业</text>
      </view>
    </view>
    <view class="payee-notice" v-if="isScanPay || (bizTarget && payMode === 'direct')">
      <text class="payee-icon">💸</text>
      <text class="payee-text">向 <text class="payee-name">{{ isScanPay ? toNickName : (bizTarget?.companyName || '') }}</text> 付款</text>
    </view>
    <view class="amount-card">
      <view class="amount-main">
        <text class="currency-sign">¥</text>
        <input class="amount-input" type="digit" placeholder="0.00" placeholder-class="ph" :adjust-position="false" v-model="amount" @input="onAmountInput" />
      </view>
      <view class="amount-divider"></view>
      <view class="note-row">
        <text class="note-icon">📝</text>
        <input class="note-input" placeholder="添加备注（选填）" placeholder-class="ph" v-model="note" @input="onNoteInput" />
      </view>
    </view>
    <button class="pay-btn" :loading="loading" :disabled="loading" @tap="handlePay">
      <text class="pay-btn-text">确认付款</text>
      <text class="pay-btn-amount" v-if="amount && parseFloat(amount) > 0">¥{{ parseFloat(amount).toFixed(2) }}</text>
    </button>
    <view class="security-note">
      <text class="security-icon">🔏</text>
      <text class="security-text">交易自动上链存证 · AI 风控实时保障</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/index'
import { walletApi, paymentApi, api } from '../../api/index'

const userStore = useUserStore()
const payMode = ref('scan')
const searchBizId = ref('')
const bizTarget = ref(null)
const searchingBiz = ref(false)
const amount = ref('')
const note = ref('')
const loading = ref(false)
const balanceAmount = ref(0)
const toUserId = ref('')
const toNickName = ref('')
const isScanPay = ref(false)

function onSearchInput(e) { searchBizId.value = e.detail.value }
function onAmountInput(e) { amount.value = e.detail.value }
function onNoteInput(e) { note.value = e.detail.value }

onLoad(async (query) => {
  if (query?.data) {
    try {
      const scanData = JSON.parse(decodeURIComponent(query.data))
      if (scanData.action === 'biz_qrcode_pay' || scanData.action === 'biz_paylink') {
        isScanPay.value = true
        toUserId.value = scanData.bizUserId || ''
        toNickName.value = scanData.action === 'biz_qrcode_pay' ? '企业收款' : '线上支付'
        if (scanData.amount) amount.value = String(scanData.amount)
        if (scanData.subject) note.value = scanData.subject
        return
      }
      toUserId.value = scanData.toUserId || ''
      toNickName.value = scanData.toNickName || ''
      amount.value = scanData.amount || ''
      isScanPay.value = true
    } catch (e) {}
  }
})

onShow(() => {
  userStore.restore()
  loadBalance()
})

async function loadBalance() {
  if (!userStore.isLoggedIn) return
  try {
    const res = await walletApi.balance()
    if (res.success) balanceAmount.value = res.data.balance
  } catch (e) {}
}

async function searchBiz() {
  if (!searchBizId.value) {
    uni.showToast({ title: '请输入企业名称或ID', icon: 'none' })
    return
  }
  searchingBiz.value = true
  bizTarget.value = null
  try {
    const res = await api.get('/biz/search', { params: { q: searchBizId.value } })
    if (res.success && res.data) bizTarget.value = res.data
    else bizTarget.value = null
  } catch (e) {
    bizTarget.value = null
    uni.showToast({ title: '查询失败', icon: 'none' })
  } finally {
    searchingBiz.value = false
  }
}

function selectBiz() {
  if (!bizTarget.value) return
  toUserId.value = bizTarget.value.userId
  toNickName.value = bizTarget.value.companyName
  isScanPay.value = true
}

function saveLocalTx(payData, tradeNo, certData) {
  const hash = certData?.hash || ''
  const notary = certData?.notary || null
  const tx = {
    id: payData.id,
    amount: -Math.abs(payData.amount),
    desc: '付款: ' + (payData.subject || '公益支付'),
    type: 'expense',
    tradeNo, hash, notary,
    createdAt: payData.createdAt || new Date().toISOString()
  }
  const existing = uni.getStorageSync('local_txs') || '[]'
  let list = []
  try { list = JSON.parse(existing) } catch (e) {}
  list.unshift(tx)
  uni.setStorageSync('local_txs', JSON.stringify(list))
  let certInfo = ''
  if (hash) certInfo += '\n\n📜 存证 HASH: ' + hash.slice(0, 16) + '...'
  if (notary) {
    certInfo += '\n📋 公证书编号: ' + notary.certificateNo
    certInfo += '\n🏛 公证服务商: ' + notary.provider
  }
  if (certInfo) {
    uni.showModal({
      title: '✅ 支付成功 · 已存证',
      content: '交易已自动生成区块链存证' + certInfo,
      showCancel: false, confirmText: '查看账单',
      success: () => { uni.switchTab({ url: '/pages/bills/index' }) }
    })
  } else {
    setTimeout(() => uni.switchTab({ url: '/pages/bills/index' }), 800)
  }
}

async function handlePay() {
  if (!amount.value || parseFloat(amount.value) <= 0) {
    uni.showToast({ title: '请输入金额', icon: 'none' })
    return
  }
  if (!userStore.isLoggedIn) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const res = await paymentApi.create({
      amount: parseFloat(amount.value),
      subject: note.value || '公益支付',
      payerId: userStore.userId,
      payeeId: toUserId.value || userStore.userId,
      userId: userStore.userId,
      payMode: 'app'
    })
    if (res.success) {
      const pi = res.data.paymentInstruction
      if (pi?.orderString) {
        try {
          const payRes = await uni.requestPayment({ provider: 'alipay', orderInfo: pi.orderString, timeOut: 30 })
          if (payRes.code === 9000) {
            paymentApi.confirm(res.data.id, pi.tradeNo || '').then(confirmRes => {
              saveLocalTx(res.data, pi.tradeNo || '', confirmRes.data)
            })
            uni.showToast({ title: '支付成功', icon: 'success' })
            amount.value = ''; note.value = ''
          } else {
            uni.showToast({ title: '支付取消', icon: 'none' })
          }
        } catch (e) {
          uni.showModal({
            title: '确认付款',
            content: '支付 ¥' + parseFloat(amount.value).toFixed(2) + '\n\n交易ID: ' + res.data.id,
            success: ({ confirm }) => {
              if (confirm) {
                const tradeNo = 'sim_' + Date.now()
                paymentApi.confirm(res.data.id, tradeNo).then(cr => saveLocalTx(res.data, tradeNo, cr.data))
                uni.showToast({ title: '付款成功', icon: 'success' })
                amount.value = ''; note.value = ''
              }
            }
          })
        }
      } else {
        uni.showModal({
          title: '确认付款',
          content: '支付 ¥' + parseFloat(amount.value).toFixed(2) + '\n\n交易ID: ' + res.data.id,
          success: ({ confirm }) => {
            if (confirm) { saveLocalTx(res.data, 'demo_' + Date.now(), res.data); uni.showToast({ title: '付款成功', icon: 'success' }); amount.value = ''; note.value = '' }
          }
        })
      }
    } else {
      uni.showToast({ title: res.error || '支付创建失败', icon: 'none' })
    }
  } catch (e) {
    uni.showModal({
      title: '确认付款（演示）',
      content: '支付 ¥' + parseFloat(amount.value).toFixed(2),
      success: ({ confirm }) => {
        if (confirm) { saveLocalTx({ id: Date.now().toString(), amount: parseFloat(amount.value), subject: note.value || '', createdAt: new Date().toISOString() }, 'catch_' + Date.now(), {}); uni.showToast({ title: '付款成功（演示）', icon: 'success' }); amount.value = ''; note.value = '' }
      }
    })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page { min-height:100vh; background:var(--gn-bg); padding:24rpx; }
.page-header { display:flex; align-items:center; justify-content:space-between; padding:20rpx 0; margin-bottom:16rpx; }
.header-left { display:flex; align-items:center; gap:12rpx; }
.header-seal { font-size:32rpx; }
.header-title { font-size:36rpx; font-weight:700; color:var(--gn-text); }
.header-balance { text-align:right; }
.balance-num { display:block; font-size:32rpx; font-weight:700; color:var(--gn-gold); }
.balance-label { display:block; font-size:22rpx; color:var(--gn-text-tertiary); }
.mode-tabs { display:flex; gap:16rpx; margin-bottom:24rpx; }
.mode-tab { flex:1; display:flex; align-items:center; justify-content:center; gap:8rpx; padding:20rpx; background:var(--gn-card); border-radius:var(--gn-radius-lg); border:2rpx solid var(--gn-border); font-size:26rpx; color:var(--gn-text-secondary); }
.mode-tab.active { border-color:var(--gn-primary); color:var(--gn-primary); background:rgba(37,99,235,.06); }
.tab-icon { font-size:32rpx; }
.biz-section { background:var(--gn-card); border-radius:var(--gn-radius-lg); padding:24rpx; margin-bottom:24rpx; box-shadow:var(--gn-shadow-sm); }
.biz-search-row { display:flex; gap:16rpx; }
.biz-input { flex:1; height:64rpx; padding:0 20rpx; background:var(--gn-bg); border-radius:var(--gn-radius); font-size:26rpx; }
.biz-search-btn { height:64rpx; padding:0 24rpx; background:var(--gn-primary); color:#fff; border-radius:var(--gn-radius); font-size:26rpx; line-height:64rpx; }
.biz-result { margin-top:20rpx; padding:20rpx; background:var(--gn-bg); border-radius:var(--gn-radius); }
.biz-result-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:8rpx; }
.biz-company { font-size:28rpx; font-weight:600; color:var(--gn-text); }
.biz-badge { font-size:22rpx; color:var(--gn-gold); padding:4rpx 12rpx; background:rgba(245,158,11,.1); border-radius:var(--gn-radius-sm); }
.biz-detail { display:block; font-size:24rpx; color:var(--gn-text-tertiary); margin-bottom:12rpx; }
.select-biz-btn { width:100%; height:56rpx; background:var(--gn-primary); color:#fff; border-radius:var(--gn-radius); font-size:24rpx; line-height:56rpx; }
.biz-empty { display:flex; align-items:center; justify-content:center; gap:8rpx; padding:30rpx; font-size:26rpx; color:var(--gn-text-tertiary); }
.empty-icon { font-size:40rpx; }
.payee-notice { display:flex; align-items:center; gap:8rpx; padding:16rpx 20rpx; margin-bottom:20rpx; background:rgba(37,99,235,.06); border-radius:var(--gn-radius); border-left:6rpx solid var(--gn-primary); }
.payee-icon { font-size:28rpx; }
.payee-text { font-size:26rpx; color:var(--gn-text-secondary); }
.payee-name { color:var(--gn-primary); font-weight:600; }
.amount-card { background:var(--gn-card); border-radius:var(--gn-radius-lg); padding:32rpx; margin-bottom:24rpx; box-shadow:var(--gn-shadow-sm); }
.amount-main { display:flex; align-items:center; }
.currency-sign { font-size:48rpx; font-weight:700; color:var(--gn-text); margin-right:12rpx; }
.amount-input { flex:1; font-size:60rpx; font-weight:700; height:80rpx; }
.amount-divider { height:2rpx; background:var(--gn-border-light); margin:24rpx 0; }
.note-row { display:flex; align-items:center; gap:12rpx; }
.note-icon { font-size:28rpx; }
.note-input { flex:1; font-size:28rpx; height:60rpx; }
.pay-btn { width:100%; height:96rpx; display:flex; align-items:center; justify-content:center; gap:16rpx; background:linear-gradient(135deg,var(--gn-primary),var(--gn-primary-dark)); border-radius:48rpx; color:#fff; font-size:32rpx; font-weight:600; }
.pay-btn-amount { font-size:28rpx; opacity:.9; }
.security-note { display:flex; align-items:center; justify-content:center; gap:8rpx; padding:20rpx; margin-top:12rpx; }
.security-icon { font-size:24rpx; }
.security-text { font-size:22rpx; color:var(--gn-text-tertiary); }
.ph { color:var(--gn-text-tertiary); }
</style>
