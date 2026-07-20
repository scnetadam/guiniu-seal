<template>
  <view class="page">
    <view class="page-header"><text class="page-header-text">🔐 数据锁定存证</text></view>
    <view class="card">
      <text class="section-title">锁定数据源</text>
      <view v-for="s in sources" :key="s.key" class="source-row" @tap="lockSource(s.key)">
        <view class="source-info"><text class="source-name">{{ s.label }}</text><text class="source-desc">{{ s.description }}</text></view>
        <text class="source-arrow">锁定 &gt;</text>
      </view>
    </view>
    <view class="card">
      <text class="section-title">锁定等级</text>
      <view v-for="l in levels" :key="l.key" class="level-row">
        <text class="level-name">{{ l.label }}</text>
        <text class="level-desc">{{ l.description }}</text>
      </view>
    </view>
    <view class="card">
      <text class="section-title">批量锁定</text>
      <button class="btn-primary" @tap="batchLockAll">一键锁定所有数据源</button>
    </view>
    <view class="card">
      <text class="section-title">锁定记录</text>
      <view v-if="records.length > 0">
        <view v-for="r in records" :key="r.id" class="record-item">
          <view class="record-left"><text class="record-id">{{ r.id }}</text><text class="record-source">{{ r.sourceLabel }} | {{ r.lockLevelLabel }}</text><text class="record-time">{{ r.createdAt?.slice(0,19) }}</text></view>
          <view class="record-right"><text class="record-hash">{{ r.dataHash?.slice(0,16) }}...</text><text :class="['record-status', r.notarized ? 'notarized' : '']">{{ r.notarized ? '已存证' : r.status }}</text></view>
        </view>
      </view>
      <view v-else class="empty">暂无锁定记录</view>
    </view>
    <view class="card" v-if="stats">
      <text class="section-title">锁定统计</text>
      <view class="stats-grid">
        <view class="stat-item"><text class="stat-val">{{ stats.totalLocks }}</text><text class="stat-label">锁定数</text></view>
        <view class="stat-item"><text class="stat-val">{{ stats.notarizedCount }}</text><text class="stat-label">已存证</text></view>
        <view class="stat-item"><text class="stat-val">{{ stats.totalDataPoints }}</text><text class="stat-label">数据点</text></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { dataLockApi } from '../../api/index';

const sources = ref<any[]>([]);
const levels = ref<any[]>([]);
const records = ref<any[]>([]);
const stats = ref<any>(null);

async function loadSources() { const res = await dataLockApi.sources(); if (res.success) { sources.value = res.data?.sources || []; levels.value = res.data?.levels || []; } }
async function loadRecords() { const res = await dataLockApi.records(); if (res.success) records.value = res.data?.items || []; }
async function loadStats() { const res = await dataLockApi.stats(); if (res.success) stats.value = res.data; }

async function lockSource(source: string) {
  const res = await dataLockApi.lock({ source, lockLevel: 'snapshot' });
  if (res.success) { uni.showToast({ title: '锁定成功', icon: 'success' }); loadRecords(); loadStats(); }
  else uni.showToast({ title: res.error || '锁定失败', icon: 'none' });
}

async function batchLockAll() {
  const res = await dataLockApi.batchLock({ sources: sources.value.map(s => s.key), lockLevel: 'snapshot' });
  if (res.success) { uni.showToast({ title: `已锁定 ${res.data?.count || 0} 个数据源`, icon: 'success' }); loadRecords(); loadStats(); }
  else uni.showToast({ title: res.error || '批量锁定失败', icon: 'none' });
}

onMounted(() => { loadSources(); loadRecords(); loadStats(); });
</script>

<style scoped>
.page { min-height:100vh; background:var(--gn-bg); padding:30rpx; }
.page-header { margin-bottom:30rpx; }
.page-header-text { font-size:34rpx; font-weight:700; color:var(--gn-text); }
.card { background:var(--gn-card); border-radius:var(--gn-radius-lg); padding:24rpx; margin-bottom:20rpx; box-shadow:var(--gn-shadow-sm); }
.section-title { font-size:30rpx; font-weight:600; color:var(--gn-text); display:block; margin-bottom:16rpx; }
.source-row { display:flex; justify-content:space-between; align-items:center; padding:16rpx 0; border-bottom:2rpx solid var(--gn-border-light); }
.source-row:last-child { border-bottom:none; }
.source-info { flex:1; }
.source-name { font-size:26rpx; font-weight:600; color:var(--gn-text); display:block; }
.source-desc { font-size:20rpx; color:var(--gn-text-tertiary); display:block; margin-top:2rpx; }
.source-arrow { font-size:24rpx; color:var(--gn-primary); }
.level-row { padding:12rpx 0; border-bottom:2rpx solid var(--gn-border-light); }
.level-row:last-child { border-bottom:none; }
.level-name { font-size:26rpx; font-weight:600; color:var(--gn-text); display:block; }
.level-desc { font-size:22rpx; color:var(--gn-text-secondary); display:block; margin-top:2rpx; }
.btn-primary { font-size:26rpx; padding:14rpx; border-radius:var(--gn-radius); background:var(--gn-primary); color:#fff; border:none; }
.record-item { display:flex; justify-content:space-between; padding:16rpx 0; border-bottom:2rpx solid var(--gn-border-light); }
.record-item:last-child { border-bottom:none; }
.record-left { flex:1; }
.record-id { font-size:24rpx; color:var(--gn-text); display:block; }
.record-source { font-size:20rpx; color:var(--gn-text-secondary); display:block; margin-top:2rpx; }
.record-time { font-size:18rpx; color:var(--gn-text-tertiary); display:block; margin-top:2rpx; }
.record-right { text-align:right; }
.record-hash { font-size:18rpx; color:var(--gn-text-secondary); display:block; }
.record-status { font-size:20rpx; color:var(--gn-text-tertiary); display:block; }
.record-status.notarized { color:#16a34a; }
.stats-grid { display:flex; gap:12rpx; }
.stat-item { flex:1; text-align:center; padding:12rpx; }
.stat-val { font-size:28rpx; font-weight:700; color:var(--gn-primary); display:block; }
.stat-label { font-size:20rpx; color:var(--gn-text-secondary); display:block; margin-top:4rpx; }
.empty { text-align:center; padding:40rpx; color:var(--gn-text-tertiary); font-size:26rpx; }
</style>
