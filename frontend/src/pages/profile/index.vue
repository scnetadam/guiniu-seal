<!-- profile/index.vue -->
<template>
  <view class="page">
    <view class="profile-header">
      <view class="avatar-wrap">
        <text class="avatar">👤</text>
      </view>
      <view class="user-info" v-if="userStore.isLoggedIn">
        <text class="user-name">{{ userStore.userInfo?.nickName || '用户' }}</text>
        <text class="user-phone">{{ userStore.userInfo?.phone || '' }}</text>
      </view>
      <view class="user-info" v-else @tap="goLogin">
        <text class="user-name">点击登录</text>
        <text class="user-phone">登录后使用更多功能</text>
      </view>
    </view>
    <view class="stats-grid">
      <view class="stat-item">
        <text class="stat-num">{{ stats.txCount }}</text>
        <text class="stat-label">交易</text>
      </view>
      <view class="stat-item">
        <text class="stat-num">{{ stats.certCount }}</text>
        <text class="stat-label">存证</text>
      </view>
      <view class="stat-item">
        <text class="stat-num">{{ stats.creditScore }}</text>
        <text class="stat-label">信用分</text>
      </view>
    </view>
    <view class="menu-section">
      <view class="menu-item" @tap="goToWallet">
        <text class="menu-icon">💰</text>
        <text class="menu-text">钱包</text>
        <text class="menu-arrow">&gt;</text>
      </view>
      <view class="menu-item" @tap="goToBills">
        <text class="menu-icon">📋</text>
        <text class="menu-text">账单</text>
        <text class="menu-arrow">&gt;</text>
      </view>
      <view class="menu-item" @tap="goToData">
        <text class="menu-icon">📊</text>
        <text class="menu-text">数据收益</text>
        <text class="menu-arrow">&gt;</text>
      </view>
      <view class="menu-item" @tap="goToSecurity">
        <text class="menu-icon">🛡</text>
        <text class="menu-text">安全设置</text>
        <text class="menu-arrow">&gt;</text>
      </view>
      <view class="menu-item" @tap="goToAbout">
        <text class="menu-icon">📖</text>
        <text class="menu-text">关于</text>
        <text class="menu-arrow">&gt;</text>
      </view>
    </view>
    <button class="logout-btn" v-if="userStore.isLoggedIn" @tap="handleLogout">退出登录</button>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/index'
import { walletApi } from '../../api/index'

const userStore = useUserStore()
const stats = ref({ txCount: 0, certCount: 0, creditScore: 0 })

onShow(async () => {
  userStore.restore()
  if (userStore.isLoggedIn) {
    try {
      const res = await walletApi.balance()
      if (res.success) {
        stats.value.txCount = res.data.txCount || 0
        stats.value.certCount = res.data.certCount || 0
        stats.value.creditScore = res.data.creditScore || 0
      }
    } catch (e) {}
  }
})

function goLogin() { uni.navigateTo({ url: '/pages/login/index' }) }
function goToWallet() { uni.navigateTo({ url: '/pages/wallet/index' }) }
function goToBills() { uni.switchTab({ url: '/pages/bills/index' }) }
function goToData() { uni.navigateTo({ url: '/pages/dataEarnings/index' }) }
function goToSecurity() { uni.showToast({ title: '安全设置功能开发中', icon: 'none' }) }
function goToAbout() { uni.showToast({ title: '关于页面开发中', icon: 'none' }) }

function handleLogout() {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: ({ confirm }) => {
      if (confirm) {
        userStore.logout()
        uni.showToast({ title: '已退出', icon: 'success' })
      }
    }
  })
}
</script>

<style scoped>
.page { min-height:100vh; background:var(--gn-bg); }
.profile-header { display:flex; align-items:center; gap:20rpx; padding:40rpx 24rpx; background:linear-gradient(135deg,var(--gn-primary),#1e40af); }
.avatar-wrap { width:100rpx; height:100rpx; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,.2); border-radius:50%; }
.avatar { font-size:48rpx; }
.user-info { flex:1; }
.user-name { display:block; font-size:32rpx; font-weight:600; color:#fff; margin-bottom:4rpx; }
.user-phone { display:block; font-size:24rpx; color:rgba(255,255,255,.7); }
.stats-grid { display:flex; margin:0 24rpx; margin-top:-24rpx; }
.stat-item { flex:1; text-align:center; padding:20rpx; background:var(--gn-card); border-radius:var(--gn-radius); margin:0 4rpx; box-shadow:var(--gn-shadow-sm); }
.stat-num { display:block; font-size:36rpx; font-weight:700; color:var(--gn-text); margin-bottom:4rpx; }
.stat-label { display:block; font-size:22rpx; color:var(--gn-text-tertiary); }
.menu-section { margin:24rpx; padding:0 20rpx; background:var(--gn-card); border-radius:var(--gn-radius-lg); }
.menu-item { display:flex; align-items:center; padding:24rpx 0; border-bottom:2rpx solid var(--gn-border-light); }
.menu-icon { font-size:32rpx; margin-right:16rpx; }
.menu-text { flex:1; font-size:28rpx; color:var(--gn-text); }
.menu-arrow { font-size:28rpx; color:var(--gn-text-tertiary); }
.logout-btn { margin:40rpx 24rpx; height:80rpx; background:var(--gn-card); border:2rpx solid var(--gn-danger); border-radius:var(--gn-radius-lg); color:var(--gn-danger); font-size:28rpx; line-height:80rpx; text-align:center; }
</style>
