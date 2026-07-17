<!-- bills/index.vue - 完整版 -->
<template>
  <view class="page">
    <view class="page-header">
      <view class="back-btn" @tap="goBack">&larr;</view>
      <text class="page-header-text">\U0001f50f \u9f9f\u94ae \u00b7 \u8d26\u5355</text>
    </view>
    <view class="filter-bar">
      <view class="date-picker" @tap="showDatePicker('start')">
        <text class="date-label">\u5f00\u59cb</text>
        <text class="date-value">{{ dateStart || '\u9009\u62e9\u65e5\u671f' }}</text>
      </view>
      <text class="date-sep">~</text>
      <view class="date-picker" @tap="showDatePicker('end')">
        <text class="date-label">\u7ed3\u675f</text>
        <text class="date-value">{{ dateEnd || '\u9009\u62e9\u65e5\u671f' }}</text>
      </view>
      <button class="filter-btn" @tap="searchByDate">\u67e5\u8be2</button>
    </view>
    <view class="search-bar">
      <input class="search-input" placeholder="\u641c\u4ea4\u6613\u63cf\u8ff0\u3001\u91d1\u989d\u3001\u65e5\u671f..." @confirm="doSearch" v-model="searchQuery" @input="onSearchInput" />
      <text class="voice-icon" @tap="startVoiceSearch">\U0001f3a4</text>
      <text class="search-icon" @tap="doSearch">\U0001f50d</text>
    </view>
    <view class="monthly-summary" v-if="filteredList.length > 0">
      <view class="ms-header">
        <text class="ms-month">{{ currentMonth }}</text>
        <text class="ms-income">\u6536\u5165 \u00a5{{ monthlyIncome.toFixed(2) }}</text>
      </view>
    </view>
    <view class="tx-section">
      <view class="loading-state" v-if="loading">
        <text class="loading-text animate-pulse">\u52a0\u8f7d\u4e2d...</text>
      </view>
      <view class="empty-state" v-else-if="filteredList.length === 0">
        <text class="empty-icon">\U0001f4dc</text>
        <text class="empty-text">\u6682\u65e0\u8d26\u5355\u8bb0\u5f55</text>
        <text class="empty-hint">\u5b8c\u6210\u4e00\u7b14\u4ea4\u6613\u540e\uff0c\u8fd9\u91cc\u4f1a\u663e\u793a\u8d26\u5355</text>
      </view>
      <view class="tx-list" v-else>
        <view class="tx-item" v-for="(tx, idx) in filteredList" :key="tx.id || idx" @tap="showCertDetail(tx)">
          <view :class="['tx-icon', tx.amount > 0 ? 'tx-in' : 'tx-out']">
            <text>{{ tx.amount > 0 ? '\u2191' : '\u2193' }}</text>
          </view>
          <view class="tx-info">
            <text class="tx-desc">{{ tx.desc }}</text>
            <text class="tx-meta">{{ formatTime(tx.createdAt) }} <text class="tx-badge" v-if="tx.hash">\U0001f4dc \u5df2\u5b58\u8bc1</text></text>
          </view>
          <view class="tx-amount-wrap">
            <text :class="['tx-amount', tx.amount > 0 ? 'tx-in' : 'tx-out']">{{ tx.amount > 0 ? '+' : '' }}\u00a5{{ Math.abs(tx.amount).toFixed(2) }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from "vue"
import { onShow } from "@dcloudio/uni-app"
import { walletApi } from '../../api/index'

const txList = ref([])
const loading = ref(true)
const searchQuery = ref('')
const dateStart = ref('')
const dateEnd = ref('')
const dateTarget = ref('start')

const currentMonth = computed(() => {
  if (filteredList.value.length === 0) return ''
  const d = new Date(filteredList.value[0].createdAt)
  return d.getFullYear() + '\u5e74' + (d.getMonth() + 1) + '\u6708'
})

const monthlyIncome = computed(() =>
  filteredList.value.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0)
)

const filteredList = computed(() => {
  let list = txList.value
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(tx => {
      if (tx.desc && tx.desc.toLowerCase().includes(q)) return true
      if (tx.amount && String(Math.abs(tx.amount)).includes(q)) return true
      if (tx.createdAt && tx.createdAt.toLowerCase().includes(q)) return true
      return false
    })
  }
  if (dateStart.value) {
    const s = new Date(dateStart.value).getTime()
    list = list.filter(tx => new Date(tx.createdAt).getTime() >= s)
  }
  if (dateEnd.value) {
    const e = new Date(dateEnd.value).getTime() + 86400000
    list = list.filter(tx => new Date(tx.createdAt).getTime() < e)
  }
  return list
})

function onSearchInput(e) { searchQuery.value = e.detail.value }

onShow(async () => { await loadBills() })

async function loadBills() {
  loading.value = true
  try {
    const res = await walletApi.transactions()
    if (res.success && res.data.list && res.data.list.length > 0) {
      txList.value = res.data.list
    } else {
      loadLocalTxs()
    }
  } catch (e) {
    loadLocalTxs()
  } finally {
    loading.value = false
  }
}

function loadLocalTxs() {
  const stored = uni.getStorageSync('local_txs') || '[]'
  try {
    const list = JSON.parse(stored)
    txList.value = list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  } catch (e) {
    txList.value = []
  }
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return m + '/' + day + ' ' + h + ':' + min
}

function showDatePicker(target) {
  dateTarget.value = target
  uni.showModal({
    title: '\u9009\u62e9\u65e5\u671f',
    content: '\u8bf7\u8f93\u5165\u65e5\u671f (YYYY-MM-DD)',
    editable: true,
    placeholderText: target === 'start' ? '\u5f00\u59cb\u65e5\u671f' : '\u7ed3\u675f\u65e5\u671f',
    success: (res) => {
      if (res.confirm && res.content) {
        if (target === 'start') dateStart.value = res.content
        else dateEnd.value = res.content
      }
    }
  })
}

function searchByDate() {
  if (!dateStart.value && !dateEnd.value) {
    uni.showToast({ title: '\u8bf7\u9009\u62e9\u65e5\u671f\u8303\u56f4', icon: 'none' })
  }
}

function doSearch() {
  if (searchQuery.value.trim()) {
    uni.showToast({ title: '\u641c\u7d22: ' + searchQuery.value, icon: 'none' })
  }
}

function showCertDetail(tx) {
  if (!tx.hash && !tx.notary) return
  let content = '\u4ea4\u6613\u7f16\u53f7: ' + tx.id + '\n'
  content += '\u91d1\u989d: \u00a5' + Math.abs(tx.amount).toFixed(2) + '\n'
  content += '\u8bf4\u660e: ' + tx.desc + '\n'
  content += '\u65f6\u95f4: ' + formatTime(tx.createdAt) + '\n'
  if (tx.hash) content += '\n\U0001f4dc \u5b58\u8bc1 HASH:\n' + tx.hash
  if (tx.notary) {
    content += '\n\n\U0001f4cb \u516c\u8bc1\u4e66\u7f16\u53f7: ' + tx.notary.certificateNo
    content += '\n\U0001f3db \u516c\u8bc1\u670d\u52a1\u5546: ' + tx.notary.provider
  }
  uni.showModal({
    title: '\U0001f50f \u5b58\u8bc1\u8be6\u60c5',
    content: content,
    showCancel: false,
    confirmText: '\u5173\u95ed'
  })
}

function startVoiceSearch() {
  uni.showToast({ title: '\u8bed\u97f3\u641c\u7d22\u529f\u80fd\u5f00\u53d1\u4e2d', icon: 'none' })
}

function goBack() { uni.navigateBack() }
</script>

<style scoped>
.page { min-height:100vh; background:var(--gn-bg); }
.page-header { display:flex; align-items:center; gap:16rpx; padding:20rpx 24rpx; background:var(--gn-card); border-bottom:2rpx solid var(--gn-border-light); }
.back-btn { width:56rpx; height:56rpx; display:flex; align-items:center; justify-content:center; font-size:32rpx; border-radius:50%; background:var(--gn-bg); }
.page-header-text { font-size:32rpx; font-weight:700; color:var(--gn-text); }
.filter-bar { display:flex; align-items:center; gap:12rpx; padding:16rpx 24rpx; background:var(--gn-card); margin-bottom:2rpx; }
.date-picker { flex:1; padding:12rpx; background:var(--gn-bg); border-radius:var(--gn-radius); }
.date-label { display:block; font-size:20rpx; color:var(--gn-text-tertiary); margin-bottom:4rpx; }
.date-value { display:block; font-size:24rpx; color:var(--gn-text); }
.date-sep { font-size:24rpx; color:var(--gn-text-tertiary); }
.filter-btn { height:60rpx; padding:0 20rpx; background:var(--gn-primary); color:#fff; border-radius:var(--gn-radius); font-size:24rpx; line-height:60rpx; }
.search-bar { display:flex; align-items:center; gap:12rpx; padding:16rpx 24rpx; background:var(--gn-card); margin-bottom:16rpx; }
.search-input { flex:1; height:60rpx; padding:0 20rpx; background:var(--gn-bg); border-radius:var(--gn-radius-full); font-size:24rpx; }
.voice-icon, .search-icon { font-size:32rpx; padding:8rpx; }
.monthly-summary { padding:0 24rpx; margin-bottom:16rpx; }
.ms-header { display:flex; justify-content:space-between; align-items:center; padding:16rpx 20rpx; background:var(--gn-card); border-radius:var(--gn-radius); }
.ms-month { font-size:26rpx; font-weight:600; color:var(--gn-text); }
.ms-income { font-size:24rpx; color:var(--gn-success); font-weight:600; }
.tx-section { padding:0 24rpx 40rpx; }
.loading-state, .empty-state { text-align:center; padding:80rpx 40rpx; }
.loading-text { font-size:28rpx; color:var(--gn-text-tertiary); }
.empty-icon { display:block; font-size:64rpx; margin-bottom:16rpx; }
.empty-text { display:block; font-size:28rpx; color:var(--gn-text-secondary); margin-bottom:8rpx; }
.empty-hint { display:block; font-size:24rpx; color:var(--gn-text-tertiary); }
.tx-item { display:flex; align-items:center; gap:16rpx; padding:20rpx; background:var(--gn-card); border-radius:var(--gn-radius); margin-bottom:8rpx; }
.tx-icon { width:48rpx; height:48rpx; display:flex; align-items:center; justify-content:center; border-radius:50%; font-size:24rpx; }
.tx-icon.tx-in { background:rgba(16,185,129,.1); color:var(--gn-success); }
.tx-icon.tx-out { background:rgba(239,68,68,.1); color:var(--gn-danger); }
.tx-info { flex:1; min-width:0; }
.tx-desc { display:block; font-size:26rpx; color:var(--gn-text); font-weight:500; margin-bottom:4rpx; }
.tx-meta { display:block; font-size:22rpx; color:var(--gn-text-tertiary); }
.tx-badge { color:var(--gn-gold); margin-left:8rpx; }
.tx-amount { font-size:28rpx; font-weight:600; }
.tx-amount.tx-in { color:var(--gn-success); }
.tx-amount.tx-out { color:var(--gn-danger); }
</style>
