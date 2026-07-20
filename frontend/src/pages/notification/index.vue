<template>
  <view class="page">
    <view class="page-header"><text class="page-header-text">🔔 消息中心</text></view>
    <view class="earnings-banner" v-if="earningsInfo.hasEarnings" @tap="goWallet">
      <text class="banner-icon">💰</text>
      <view class="banner-info"><text class="banner-title">您有 ¥{{ earningsInfo.totalPending.toFixed(2) }} 待领取收益</text><text class="banner-sub">点击前往钱包查看</text></view>
      <text class="banner-arrow">&gt;</text>
    </view>
    <view class="card">
      <text class="section-title">提醒设置</text>
      <view v-for="ch in channels" :key="ch.channel" class="channel-row">
        <view class="channel-left"><text class="channel-icon">{{ ch.icon }}</text><view class="channel-info"><text class="channel-name">{{ ch.label }}</text><text class="channel-desc">{{ ch.description }}</text></view></view>
        <switch :checked="ch.enabled" @change="toggleChannel(ch)" color="var(--gn-primary)" />
      </view>
    </view>
    <view class="card">
      <text class="section-title">通知列表</text>
      <view v-if="notifications.length > 0">
        <view v-for="n in notifications" :key="n.id" class="notif-item" @tap="handleNotif(n)">
          <view class="notif-dot" v-if="!n.readAt"></view>
          <view class="notif-content">
            <text class="notif-title">{{ n.title }}</text>
            <text class="notif-body">{{ n.body }}</text>
            <text class="notif-meta">{{ n.channelLabel }} · {{ n.createdAt?.slice(0,16) }}</text>
          </view>
          <text class="notif-action" v-if="n.actionText">{{ n.actionText }}</text>
        </view>
      </view>
      <view v-else class="empty">暂无通知</view>
    </view>
    <view class="card" v-if="unreadCount > 0">
      <button class="btn-primary" @tap="markAllRead">全部标记已读 ({{ unreadCount }})</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { notificationApi, walletApi } from '../../api/index';

const notifications = ref<any[]>([]);
const channels = ref<any[]>([]);
const unreadCount = ref(0);
const earningsInfo = ref<any>({ hasEarnings: false, totalPending: 0 });

async function loadNotifications() { const res = await notificationApi.list(); if (res.success) { notifications.value = res.data?.items || []; unreadCount.value = res.data?.unreadCount || 0; } }
async function loadChannels() { const res = await notificationApi.prefList(); if (res.success) channels.value = res.data || []; }
async function loadEarnings() { try { const res = await walletApi.balance(); if (res.success && res.data?.balance > 0) earningsInfo.value = { hasEarnings: true, totalPending: res.data.balance }; } catch (e) {} }

async function toggleChannel(ch: any) {
  const res = await notificationApi.prefSet({ channel: ch.channel, enabled: !ch.enabled, target: ch.target });
  if (res.success) ch.enabled = !ch.enabled;
}

function handleNotif(n: any) {
  if (!n.readAt) notificationApi.markRead([n.id]);
  n.readAt = new Date().toISOString();
  if (n.actionUrl) uni.navigateTo({ url: n.actionUrl });
}

async function markAllRead() {
  const ids = notifications.value.filter(n => !n.readAt).map(n => n.id);
  if (ids.length === 0) return;
  await notificationApi.markRead(ids);
  notifications.value.forEach(n => { n.readAt = new Date().toISOString(); });
  unreadCount.value = 0;
  uni.showToast({ title: '已全部标记已读', icon: 'success' });
}

function goWallet() { uni.navigateTo({ url: '/pages/wallet/index' }); }

onMounted(() => { loadNotifications(); loadChannels(); loadEarnings(); });
</script>

<style scoped>
.page { min-height:100vh; background:var(--gn-bg); padding:30rpx; }
.page-header { margin-bottom:30rpx; }
.page-header-text { font-size:34rpx; font-weight:700; color:var(--gn-text); }
.earnings-banner { display:flex; align-items:center; padding:24rpx; margin-bottom:20rpx; background:linear-gradient(135deg,#fef3c7,#fde68a); border-radius:var(--gn-radius-lg); border:2rpx solid #f59e0b; }
.banner-icon { font-size:40rpx; margin-right:16rpx; }
.banner-info { flex:1; }
.banner-title { font-size:28rpx; font-weight:700; color:#92400e; display:block; }
.banner-sub { font-size:22rpx; color:#b45309; display:block; margin-top:4rpx; }
.banner-arrow { font-size:28rpx; color:#b45309; }
.card { background:var(--gn-card); border-radius:var(--gn-radius-lg); padding:24rpx; margin-bottom:20rpx; box-shadow:var(--gn-shadow-sm); }
.section-title { font-size:30rpx; font-weight:600; color:var(--gn-text); display:block; margin-bottom:16rpx; }
.channel-row { display:flex; justify-content:space-between; align-items:center; padding:16rpx 0; border-bottom:2rpx solid var(--gn-border-light); }
.channel-row:last-child { border-bottom:none; }
.channel-left { display:flex; align-items:center; flex:1; }
.channel-icon { font-size:32rpx; margin-right:12rpx; }
.channel-info { flex:1; }
.channel-name { font-size:26rpx; font-weight:600; color:var(--gn-text); display:block; }
.channel-desc { font-size:20rpx; color:var(--gn-text-tertiary); display:block; margin-top:2rpx; }
.notif-item { display:flex; align-items:flex-start; padding:16rpx 0; border-bottom:2rpx solid var(--gn-border-light); position:relative; }
.notif-item:last-child { border-bottom:none; }
.notif-dot { width:16rpx; height:16rpx; background:#ef4444; border-radius:50%; margin-right:12rpx; margin-top:8rpx; flex-shrink:0; }
.notif-content { flex:1; }
.notif-title { font-size:26rpx; font-weight:600; color:var(--gn-text); display:block; }
.notif-body { font-size:22rpx; color:var(--gn-text-secondary); display:block; margin-top:4rpx; }
.notif-meta { font-size:18rpx; color:var(--gn-text-tertiary); display:block; margin-top:4rpx; }
.notif-action { font-size:22rpx; color:var(--gn-primary); margin-left:12rpx; margin-top:8rpx; flex-shrink:0; }
.btn-primary { font-size:26rpx; padding:14rpx; border-radius:var(--gn-radius); background:var(--gn-primary); color:#fff; border:none; }
.empty { text-align:center; padding:40rpx; color:var(--gn-text-tertiary); font-size:26rpx; }
</style>
