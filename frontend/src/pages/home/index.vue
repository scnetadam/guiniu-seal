<template>
  <view class="page">
    <view class="brand-header">
      <view class="brand-bg-decor"></view>
      <view class="brand-top">
        <view class="brand-logo-wrap">
          <image class="brand-logo" src="/static/images/logo.svg" mode="aspectFit" />
          <text class="gn-seal-lg">🔏</text>
        </view>
        <view class="brand-info">
          <text class="brand-name">龟钮·印信</text>
          <text class="brand-slogan">智能微支付协议</text>
        </view>
      </view>
      <view class="brand-stats">
        <view class="stat-item" @tap="goWallet">
          <text class="stat-num gold">¥{{ balance.toFixed(2) }}</text>
          <text class="stat-label">账户余额</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item" @tap="goBills">
          <text class="stat-num">{{ txCount }}</text>
          <text class="stat-label">交易笔数</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-num">🔏</text>
          <text class="stat-label">直连支付</text>
        </view>
      </view>
    </view>

    <view class="func-grid">
      <view class="func-item" @tap="goPay">
        <view class="func-icon-wrap" style="background:linear-gradient(135deg,#f093fb,#f5576c);"><text class="func-icon">💳</text></view>
        <text class="func-label">付款</text>
      </view>
      <view class="func-item" @tap="goCollect">
        <view class="func-icon-wrap" style="background:linear-gradient(135deg,#667eea,#764ba2);"><text class="func-icon">📤</text></view>
        <text class="func-label">收款</text>
      </view>
      <view class="func-item" @tap="goWallet">
        <view class="func-icon-wrap" style="background:linear-gradient(135deg,#4facfe,#00f2fe);"><text class="func-icon">👛</text></view>
        <text class="func-label">钱包</text>
      </view>
      <view class="func-item" @tap="goAgentPay">
        <view class="func-icon-wrap" style="background:linear-gradient(135deg,#ffecd2,#fcb69f);"><text class="func-icon">🤖</text></view>
        <text class="func-label">Agent支付</text>
      </view>
      <view class="func-item" @tap="goGitTracker">
        <view class="func-icon-wrap" style="background:linear-gradient(135deg,#a18cd1,#fbc2eb);"><text class="func-icon">🔗</text></view>
        <text class="func-label">GIT追踪</text>
      </view>
      <view class="func-item" @tap="goDataLock">
        <view class="func-icon-wrap" style="background:linear-gradient(135deg,#43e97b,#38f9d7);"><text class="func-icon">🔐</text></view>
        <text class="func-label">数据锁定</text>
      </view>
      <view class="func-item" @tap="goNotification">
        <view class="func-icon-wrap" style="background:linear-gradient(135deg,#667eea,#764ba2);"><text class="func-icon">🔔</text></view>
        <text class="func-label">消息<text v-if="notifCount > 0" class="notif-badge">{{ notifCount }}</text></text>
      </view>
    </view>

    <view class="earnings-banner" v-if="hasEarnings" @tap="goWallet">
      <text class="earnings-icon">💰</text>
      <text class="earnings-text">您有 ¥{{ pendingEarnings.toFixed(2) }} 待领取收益</text>
      <text class="earnings-arrow">&gt;</text>
    </view>

    <view class="section" v-if="recentTxList.length > 0">
      <view class="section-header">
        <text class="section-title">近期交易</text>
        <text class="section-more" @tap="goBills">查看全部 &gt;</text>
      </view>
      <view class="tx-list">
        <view class="tx-item" v-for="tx in recentTxList" :key="tx.id" @tap="showTxDetail(tx)">
          <view :class="['tx-icon', tx.amount >= 0 ? 'tx-in' : 'tx-out']">
            <text>{{ tx.amount >= 0 ? '↓' : '↑' }}</text>
          </view>
          <view class="tx-info">
            <text class="tx-desc">{{ tx.desc || tx.subject }}</text>
            <text class="tx-time">{{ formatTime(tx.createdAt) }}</text>
          </view>
          <view class="tx-amount-wrap">
            <text :class="['tx-amount', tx.amount >= 0 ? 'tx-in' : 'tx-out']">
              {{ tx.amount >= 0 ? '+' : '' }}¥{{ Math.abs(tx.amount || tx.amount === 0 ? tx.amount : (tx.amount || 0)).toFixed(2) }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <view class="section" v-else>
      <view class="section-header"><text class="section-title">近期交易</text></view>
      <view class="empty-tx">
        <text class="empty-icon">📭</text>
        <text class="empty-text">暂无交易记录</text>
        <text class="empty-hint">去付款或收款开始第一笔交易</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/index'
import { walletApi, notificationApi } from '../../api/index'

const userStore = useUserStore()
const balance = ref(0)
const txCount = ref(0)
const recentTxList = ref<any[]>([])
const notifCount = ref(0)
const hasEarnings = ref(false)
const pendingEarnings = ref(0)

onShow(async () => {
  userStore.restore()
  if (userStore.isLoggedIn) {
    await loadDashboard()
    await loadNotifCount()
    await loadEarningsReminder()
  }
})

async function loadDashboard() {
  try {
    const [balRes, txRes] = await Promise.all([
      walletApi.balance(),
      walletApi.transactions()
    ])
    if (balRes.success) {
      balance.value = balRes.data.balance || 0
    }
    if (txRes.success) {
      recentTxList.value = (txRes.data.list || []).slice(0, 5)
      txCount.value = txRes.data.total || txRes.data.list?.length || 0
    }
  } catch (e) {}
}

function formatTime(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return (d.getMonth()+1)+'/'+d.getDate()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')
}

function showTxDetail(tx: any) {
  uni.showModal({
    title: '交易详情',
    content: '编号: '+tx.id+'\n金额: ¥'+Math.abs(tx.amount || 0).toFixed(2)+'\n说明: '+(tx.desc || tx.subject)+'\n时间: '+formatTime(tx.createdAt),
    showCancel: false,
    confirmText: '关闭'
  })
}

function goCollect() { uni.showToast({ title: '即将开放', icon: 'none' }) }
function goPay() { uni.navigateTo({ url: '/pages/pay/index' }) }
function goBills() { uni.switchTab({ url: '/pages/bills/index' }) }
function goWallet() { uni.navigateTo({ url: '/pages/wallet/index' }) }
function goAgentPay() { uni.navigateTo({ url: '/pages/pay/index?agent=1' }) }
</script>

<style scoped>
.page { min-height:100vh; background:var(--gn-bg); padding-bottom:20rpx; }
.brand-header { position:relative; padding:60rpx 30rpx 40rpx; margin-bottom:24rpx; background:linear-gradient(135deg,var(--gn-primary) 0%,var(--gn-primary-dark) 50%,var(--gn-primary-deeper) 100%); overflow:hidden; }
.brand-bg-decor { position:absolute; top:0; right:0; bottom:0; left:0; background:radial-gradient(ellipse at 20% 20%,rgba(255,255,255,.12) 0%,transparent 50%),radial-gradient(ellipse at 80% 80%,rgba(255,255,255,.08) 0%,transparent 50%),radial-gradient(ellipse at 50% 100%,rgba(200,146,62,.18) 0%,transparent 40%); }
.brand-top { position:relative; z-index:1; display:flex; align-items:center; margin-bottom:36rpx; }
.brand-logo-wrap { position:relative; margin-right:20rpx; }
.brand-logo { width:72rpx; height:72rpx; border-radius:12rpx; }
.brand-info { flex:1; }
.brand-name { display:block; font-size:40rpx; font-weight:700; color:#fff; letter-spacing:4rpx; }
.brand-slogan { display:block; font-size:24rpx; color:rgba(255,255,255,.7); margin-top:6rpx; }
.brand-stats { position:relative; z-index:1; display:flex; align-items:center; background:rgba(255,255,255,.12); backdrop-filter:blur(8px); border-radius:var(--gn-radius-lg); padding:20rpx 16rpx; }
.stat-item { flex:1; display:flex; flex-direction:column; align-items:center; }
.stat-num { font-size:34rpx; font-weight:700; color:#fff; margin-bottom:4rpx; }
.stat-num.gold { color:#C8923E; }
.stat-label { font-size:22rpx; color:rgba(255,255,255,.6); }
.stat-divider { width:2rpx; height:40rpx; background:rgba(255,255,255,.15); }
.func-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:20rpx; padding:0 24rpx; margin-bottom:24rpx; }
.func-item { display:flex; flex-direction:column; align-items:center; gap:12rpx; }
.func-icon-wrap { display:flex; align-items:center; justify-content:center; width:88rpx; height:88rpx; border-radius:20rpx; box-shadow:0 4rpx 12rpx rgba(0,0,0,.1); }
.func-icon { font-size:40rpx; }
.func-label { font-size:22rpx; color:var(--gn-text-secondary); font-weight:500; }
.section { margin:0 24rpx 24rpx; }
.section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16rpx; }
.section-title { font-size:30rpx; font-weight:700; color:var(--gn-text); }
.section-more { font-size:24rpx; color:var(--gn-primary); }
.tx-list { background:var(--gn-card); border-radius:var(--gn-radius-lg); overflow:hidden; }
.tx-item { display:flex; align-items:center; padding:24rpx 20rpx; border-bottom:2rpx solid var(--gn-border); }
.tx-item:last-child { border-bottom:none; }
.tx-icon { display:flex; align-items:center; justify-content:center; width:56rpx; height:56rpx; border-radius:50%; font-size:28rpx; margin-right:16rpx; }
.tx-icon.tx-in { background:#e8f5e9; color:#2e7d32; }
.tx-icon.tx-out { background:#fce4ec; color:#c62828; }
.tx-info { flex:1; }
.tx-desc { display:block; font-size:26rpx; color:var(--gn-text); font-weight:500; }
.tx-time { display:block; font-size:22rpx; color:var(--gn-text-tertiary); margin-top:4rpx; }
.tx-amount-wrap { text-align:right; }
.tx-amount { display:block; font-size:28rpx; font-weight:700; }
.tx-amount.tx-in { color:#2e7d32; }
.tx-amount.tx-out { color:#c62828; }
.empty-tx { display:flex; flex-direction:column; align-items:center; padding:60rpx 0; }
.empty-icon { font-size:80rpx; margin-bottom:16rpx; }
.empty-text { font-size:28rpx; color:var(--gn-text-tertiary); }
.empty-hint { font-size:24rpx; color:var(--gn-text-tertiary); margin-top:8rpx; }
.earnings-banner { display:flex; align-items:center; padding:20rpx 24rpx; margin:0 24rpx 24rpx; background:linear-gradient(135deg,#fef3c7,#fde68a); border-radius:var(--gn-radius-lg); border:2rpx solid #f59e0b; }
.earnings-icon { font-size:36rpx; margin-right:12rpx; }
.earnings-text { flex:1; font-size:26rpx; font-weight:600; color:#92400e; }
.earnings-arrow { font-size:26rpx; color:#b45309; }
.notif-badge { display:inline-block; min-width:28rpx; height:28rpx; line-height:28rpx; text-align:center; background:#ef4444; color:#fff; font-size:16rpx; border-radius:14rpx; margin-left:4rpx; padding:0 6rpx; }
</style>