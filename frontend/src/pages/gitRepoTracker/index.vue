<template>
  <view class="page">
    <view class="page-header"><text class="page-header-text">🔗 开源项目 GIT 仓库追踪</text></view>
    <view class="card repo-card" v-if="repo">
      <view class="repo-title-row"><text class="repo-name">{{ repo.name }}</text><text class="repo-platform">GitHub</text></view>
      <text class="repo-desc" v-if="repo.description">{{ repo.description }}</text>
      <view class="repo-stats-grid">
        <view class="repo-stat"><text class="repo-stat-val">⭐ {{ repo.stars }}</text><text class="repo-stat-label">Stars</text></view>
        <view class="repo-stat"><text class="repo-stat-val">🍴 {{ repo.forks }}</text><text class="repo-stat-label">Forks</text></view>
        <view class="repo-stat"><text class="repo-stat-val">👁 {{ repo.watchers }}</text><text class="repo-stat-label">Watchers</text></view>
        <view class="repo-stat"><text class="repo-stat-val">👥 {{ repo.contributors }}</text><text class="repo-stat-label">Contributors</text></view>
        <view class="repo-stat"><text class="repo-stat-val">📝 {{ repo.commits }}</text><text class="repo-stat-label">Commits</text></view>
        <view class="repo-stat"><text class="repo-stat-val">🔀 {{ repo.pullRequests }}</text><text class="repo-stat-label">PRs</text></view>
        <view class="repo-stat"><text class="repo-stat-val">🐛 {{ repo.openIssues }}</text><text class="repo-stat-label">Issues</text></view>
        <view class="repo-stat"><text class="repo-stat-val">🏷 {{ repo.releaseCount }}</text><text class="repo-stat-label">Releases</text></view>
      </view>
      <view class="repo-meta"><text class="repo-meta-text" v-if="repo.lastSyncAt">最近同步：{{ repo.lastSyncAt?.slice(0,19) }}</text><text class="repo-meta-text" v-if="repo.weightedScore">加权评分：{{ repo.weightedScore?.toFixed(4) }}</text></view>
      <view class="repo-actions"><button class="btn-primary" @tap="syncRepo">同步 GitHub 数据</button><button class="btn-secondary" @tap="notarizeRepo">数据存证</button></view>
      <view v-if="repo.hashProof" class="hash-proof"><text class="hash-label">存证 Hash：</text><text class="hash-value">{{ repo.hashProof }}</text></view>
    </view>
    <view class="card" v-else><text class="empty">暂无仓库数据</text><button class="btn-primary" @tap="syncRepo" style="margin-top:20rpx;">同步 GitHub 数据</button></view>
    <view class="card" v-if="dimensions.length > 0">
      <text class="section-title">加权维度详情</text>
      <view v-for="dim in dimensions" :key="dim.key" class="dim-row">
        <view class="dim-info"><text class="dim-name">{{ dim.key }}</text><text class="dim-desc">{{ dim.description }}</text></view>
        <view class="dim-right"><text class="dim-weight">权重 {{ (dim.weight * 100).toFixed(0) }}%</text><text class="dim-score">{{ dim.score?.toFixed(4) || '0' }}</text></view>
      </view>
    </view>
    <view class="card" v-if="topContributors.length > 0">
      <text class="section-title">TOP 贡献者</text>
      <view v-for="c in topContributors" :key="c.id" class="contrib-row">
        <view class="contrib-left"><text class="contrib-name">{{ c.username }}</text><text class="contrib-detail">提交 {{ c.commitCount }} | PR {{ c.prCount }}</text></view>
        <text class="contrib-score">{{ (c.weightedScore || 0).toFixed(3) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { gitRepoTrackerApi } from '../../api/index';

const repo = ref<any>(null);
const dimensions = ref<any[]>([]);
const topContributors = ref<any[]>([]);

async function loadDashboard() {
  const res = await gitRepoTrackerApi.dashboard();
  if (res.success && res.data) { repo.value = res.data.repo; topContributors.value = res.data.topContributors || []; }
}
async function loadDimensions() {
  const res = await gitRepoTrackerApi.dimensions();
  if (res.success && res.data) dimensions.value = res.data.dimensions || [];
}
async function syncRepo() {
  const res = await gitRepoTrackerApi.sync();
  if (res.success) { uni.showToast({ title: '同步成功', icon: 'success' }); repo.value = res.data?.repo; loadDimensions(); }
  else uni.showToast({ title: res.error || '同步失败', icon: 'none' });
}
async function notarizeRepo() {
  const res = await gitRepoTrackerApi.notarize();
  if (res.success) { uni.showToast({ title: '存证成功', icon: 'success' }); if (repo.value) { repo.value.hashProof = res.data?.hashProof; repo.value.notarizedAt = res.data?.notarizedAt; } }
  else uni.showToast({ title: res.error || '存证失败', icon: 'none' });
}
onMounted(() => { loadDashboard(); loadDimensions(); });
</script>

<style scoped>
.page { min-height:100vh; background:var(--gn-bg); padding:30rpx; }
.page-header { margin-bottom:30rpx; }
.page-header-text { font-size:34rpx; font-weight:700; color:var(--gn-text); }
.card { background:var(--gn-card); border-radius:var(--gn-radius-lg); padding:24rpx; margin-bottom:20rpx; box-shadow:var(--gn-shadow-sm); }
.repo-card { border:2rpx solid var(--gn-primary); }
.repo-title-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:8rpx; }
.repo-name { font-size:32rpx; font-weight:700; color:var(--gn-text); }
.repo-platform { font-size:22rpx; padding:4rpx 16rpx; border-radius:var(--gn-radius-full); background:#eff6ff; color:#2563eb; }
.repo-desc { font-size:24rpx; color:var(--gn-text-secondary); margin-bottom:16rpx; }
.repo-stats-grid { display:flex; flex-wrap:wrap; gap:12rpx; }
.repo-stat { flex:1; min-width:120rpx; text-align:center; padding:8rpx; background:var(--gn-bg); border-radius:var(--gn-radius); }
.repo-stat-val { font-size:22rpx; font-weight:600; color:var(--gn-text); display:block; }
.repo-stat-label { font-size:18rpx; color:var(--gn-text-tertiary); display:block; }
.repo-meta { margin-top:12rpx; }
.repo-meta-text { font-size:22rpx; color:var(--gn-text-secondary); display:block; margin-top:4rpx; }
.repo-actions { display:flex; gap:12rpx; margin-top:16rpx; }
.btn-primary { flex:1; font-size:26rpx; padding:14rpx; border-radius:var(--gn-radius); background:var(--gn-primary); color:#fff; border:none; }
.btn-secondary { flex:1; font-size:26rpx; padding:14rpx; border-radius:var(--gn-radius); background:#f0f9ff; color:var(--gn-primary); border:2rpx solid var(--gn-primary); }
.hash-proof { margin-top:16rpx; padding:16rpx; background:var(--gn-bg); border-radius:var(--gn-radius); }
.hash-label { font-size:24rpx; font-weight:600; color:var(--gn-text); display:block; }
.hash-value { font-size:20rpx; color:var(--gn-text-secondary); word-break:break-all; display:block; margin-top:4rpx; }
.section-title { font-size:30rpx; font-weight:600; color:var(--gn-text); display:block; margin-bottom:16rpx; }
.dim-row { display:flex; justify-content:space-between; align-items:center; padding:12rpx 0; border-bottom:2rpx solid var(--gn-border-light); }
.dim-row:last-child { border-bottom:none; }
.dim-info { flex:1; }
.dim-name { font-size:26rpx; font-weight:600; color:var(--gn-text); display:block; }
.dim-desc { font-size:20rpx; color:var(--gn-text-tertiary); display:block; margin-top:2rpx; }
.dim-right { text-align:right; }
.dim-weight { font-size:22rpx; color:var(--gn-text-secondary); display:block; }
.dim-score { font-size:24rpx; font-weight:600; color:var(--gn-primary); display:block; }
.contrib-row { display:flex; justify-content:space-between; align-items:center; padding:12rpx 0; border-bottom:2rpx solid var(--gn-border-light); }
.contrib-row:last-child { border-bottom:none; }
.contrib-left { flex:1; }
.contrib-name { font-size:26rpx; font-weight:600; color:var(--gn-text); display:block; }
.contrib-detail { font-size:20rpx; color:var(--gn-text-tertiary); display:block; margin-top:2rpx; }
.contrib-score { font-size:28rpx; font-weight:700; color:var(--gn-primary); }
.empty { text-align:center; padding:40rpx; color:var(--gn-text-tertiary); font-size:26rpx; }
</style>
