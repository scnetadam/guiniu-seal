<!-- wallet/index.vue -->
<template>
  <view class="page">
    <view class="page-header">
      <view class="back-btn" @tap="goBack">&larr;</view>
      <text class="page-header-text">🔏 钱包</text>
    </view>
    <view class="balance-card">
      <text class="balance-label">可用余额</text>
      <text class="balance-amount">¥{{ balance.toFixed(2) }}</text>
      <view class="balance-actions">
        <view class="bal-btn" @tap="goToPay"><text>💸 付款</text></view>
        <view class="bal-btn" @tap="goToCollect"><text>💰 收款</text></view>
        <view class="bal-btn" @tap="goToRecharge"><text>💵 充值</text></view>
      </view>
    </view>
    <view class="assets-section">
      <view class="section-title">资产一览</view>
      <view class="asset-item">
        <text class="asset-label">余额</text>
        <text class="asset-value">¥{{ balance.toFixed(2) }}</text>
      </view>
      <view class="asset-item">
        <text class="asset-label">促销余额</text>
        <text class="asset-value">¥{{ promoBalance.toFixed(2) }}</text>
      </view>
      <view class="asset-item">
        <text class="asset-label">数据收益</text>
        <text class="asset-value">¥{{ earnings.toFixed(2) }}</text>
      </view>
      <view class="asset-item">
        <text class="asset-label">存证数</text>
        <text class="asset-value">{{ certCount }} 笔</text>
      </view>
    </view>
    <view class="actions-grid">
      <view class="action-item" @tap="goToTx"><text>📋 交易记录</text></view>
      <view class="action-item" @tap="goToCert"><text>📜 存证查询</text></view>
      <view class="action-item" @tap="goToData"><text>📊 数据收益</text></view>
      <view class="action-item" @tap="goToSecurity"><text>🛡 安全设置</text></view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/index'
import { walletApi } from '../../api/index'

const userStore = useUserStore()
const balance = ref(0)
const promoBalance = ref(0)
const earnings = ref(0)
const certCount = ref(0)

onShow(async () => {
  userStore.restore()
  if (userStore.isLoggedIn) {
    try {
      const res = await walletApi.balance()
      if (res.success) {
        balance.value = res.data.balance || 0
        promoBalance.value = res.data.promotionBalance || 0
        earnings.value = res.data.dataEarnings || 0
        certCount.value = res.data.certCount || 0
      }
    } catch (e) {}
  }
})

function goBack() { uni.navigateBack() }
function goToPay() { uni.navigateTo({ url: '/pages/pay/index' }) }
function goToCollect() { uni.navigateTo({ url: '/pages/collect/index' }) }
function goToRecharge() { uni.showToast({ title: '充值功能开发中', icon: 'none' }) }
function goToTx() { uni.switchTab({ url: '/pages/bills/index' }) }
function goToCert() { uni.showToast({ title: '存证查询功能开发中', icon: 'none' }) }
function goToData() { uni.navigateTo({ url: '/pages/dataEarnings/index' }) }
function goToSecurity() { uni.showToast({ title: '安全设置功能开发中', icon: 'none' }) }
</script>

<style scoped>
.page { min-height:100vh; background:var(--gn-bg); }
.page-header { display:flex; align-items:center; gap:16rpx; padding:20rpx 24rpx; background:var(--gn-card); border-bottom:2rpx solid var(--gn-border-light); }
.back-btn { width:56rpx; height:56rpx; display:flex; align-items:center; justify-content:center; font-size:32rpx; border-radius:50%; background:var(--gn-bg); }
.page-header-text { font-size:32rpx; font-weight:700; color:var(--gn-text); }
.balance-card { margin:24rpx; padding:32rpx; background:linear-gradient(135deg,var(--gn-primary),#1e40af); border-radius:var(--gn-radius-xl); text-align:center; }
.balance-label { display:block; font-size:24rpx; color:rgba(255,255,255,.7); margin-bottom:8rpx; }
.balance-amount { display:block; font-size:60rpx; font-weight:700; color:#fff; margin-bottom:24rpx; }
.balance-actions { display:flex; gap:16rpx; justify-content:center; }
.bal-btn { flex:1; padding:16rpx; background:rgba(255,255,255,.15); border-radius:var(--gn-radius); font-size:24rpx; color:#fff; text-align:center; }
.assets-section { margin:0 24rpx 24rpx; padding:24rpx; background:var(--gn-card); border-radius:var(--gn-radius-lg); }
.section-title { font-size:26rpx; font-weight:600; color:var(--gn-text); margin-bottom:16rpx; }
.asset-item { display:flex; justify-content:space-between; padding:12rpx 0; border-bottom:2rpx solid var(--gn-border-light); }
.asset-label { font-size:24rpx; color:var(--gn-text-secondary); }
.asset-value { font-size:24rpx; font-weight:600; color:var(--gn-text); }
.actions-grid { display:grid; grid-template-columns:1fr 1fr; gap:16rpx; padding:0 24rpx; }
.action-item { display:flex; align-items:center; justify-content:center; padding:24rpx; background:var(--gn-card); border-radius:var(--gn-radius-lg); font-size:26rpx; color:var(--gn-text); }
</style>
