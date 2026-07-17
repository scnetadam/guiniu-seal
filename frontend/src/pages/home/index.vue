<!-- home/index.vue - 完整版（从支付宝已编译包反编译） -->
<template>
  <view class="page">
    <view class="brand-header">
      <view class="brand-bg-decor"></view>
      <view class="brand-bg-decor-gold"></view>
      <view class="brand-top">
        <view class="brand-logo-wrap">
          <image class="brand-logo" src="/static/images/logo.svg" mode="aspectFit" />
          <text class="gn-seal-lg">🔏</text>
        </view>
        <view class="brand-info">
          <text class="brand-name">龟钮印证</text>
          <text class="brand-slogan">可信数字身份 · 区块链存证</text>
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
        <view class="stat-item" @tap="goWallet">
          <text class="stat-num">{{ reputation }}</text>
          <text class="stat-label">信用分</text>
        </view>
      </view>
      <view class="voice-command-btn" @tap="startVoiceCommand">
        <text class="voice-cmd-icon">🎤</text>
        <text class="voice-cmd-text">语音指令 · 声控支付</text>
      </view>
    </view>
    <view class="func-grid">
      <view class="func-item" @tap="goCollect">
        <view class="func-icon-wrap" style="background:linear-gradient(135deg,#667eea,#764ba2);"><text class="func-icon">📤</text></view>
        <text class="func-label">收款</text>
      </view>
      <view class="func-item" @tap="goPay">
        <view class="func-icon-wrap" style="background:linear-gradient(135deg,#f093fb,#f5576c);"><text class="func-icon">💳</text></view>
        <text class="func-label">付款</text>
      </view>
      <view class="func-item" @tap="goBizCenter">
        <view class="func-icon-wrap" style="background:linear-gradient(135deg,#4facfe,#00f2fe);"><text class="func-icon">🏢</text></view>
        <text class="func-label">企业中心</text>
      </view>
      <view class="func-item" @tap="goNotary">
        <view class="func-icon-wrap" style="background:linear-gradient(135deg,#43e97b,#38f9d7);"><text class="func-icon">📜</text></view>
        <text class="func-label">公证服务</text>
      </view>
      <view class="func-item" @tap="goGovernance">
        <view class="func-icon-wrap" style="background:linear-gradient(135deg,#fa709a,#fee140);"><text class="func-icon">🏛️</text></view>
        <text class="func-label">监管看板</text>
      </view>
      <view class="func-item" @tap="goAIChat">
        <view class="func-icon-wrap" style="background:linear-gradient(135deg,#a18cd1,#fbc2eb);"><text class="func-icon">🤖</text></view>
        <text class="func-label">AI客服</text>
      </view>
      <view class="func-item" @tap="goAgentPay">
        <view class="func-icon-wrap" style="background:linear-gradient(135deg,#ffecd2,#fcb69f);"><text class="func-icon">🧠</text></view>
        <text class="func-label">Agent支付</text>
      </view>
      <view class="func-item" @tap="goBooking">
        <view class="func-icon-wrap" style="background:linear-gradient(135deg,#89f7fe,#66a6ff);"><text class="func-icon">📅</text></view>
        <text class="func-label">试驾预约</text>
      </view>
      <view class="func-item" @tap="goPromotion">
        <view class="func-icon-wrap" style="background:linear-gradient(135deg,#f6d365,#fda085);"><text class="func-icon">🎯</text></view>
        <text class="func-label">推广中心</text>
      </view>
      <view class="func-item" @tap="goDataMarket">
        <view class="func-icon-wrap" style="background:linear-gradient(135deg,#96fbc4,#f9f586);"><text class="func-icon">📊</text></view>
        <text class="func-label">数据市场</text>
      </view>
      <view class="func-item" @tap="goDataConsent">
        <view class="func-icon-wrap" style="background:linear-gradient(135deg,#a8edea,#fed6e3);"><text class="func-icon">✅</text></view>
        <text class="func-label">数据授权</text>
      </view>
      <view class="func-item" @tap="goDataEarnings">
        <view class="func-icon-wrap" style="background:linear-gradient(135deg,#d4fc79,#96e6a1);"><text class="func-icon">💰</text></view>
        <text class="func-label">数据收益</text>
      </view>
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
            <text class="tx-desc">{{ tx.desc }}</text>
            <text class="tx-time">{{ formatTime(tx.createdAt) }}</text>
          </view>
          <view class="tx-amount-wrap">
            <text :class="['tx-amount', tx.amount >= 0 ? 'tx-in' : 'tx-out']">
              {{ tx.amount >= 0 ? '+' : '' }}¥{{ Math.abs(tx.amount).toFixed(2) }}
            </text>
            <text class="tx-cert-badge" v-if="tx.hash || tx.notary">🔏 已存证</text>
          </view>
        </view>
      </view>
    </view>

    <view class="section" v-else>
      <view class="section-header"><text class="section-title">近期交易</text></view>
      <view class="empty-tx">
        <text class="empty-icon">📭</text>
        <text class="empty-text">暂无交易记录</text>
        <text class="empty-hint">去收款或付款开始第一笔交易</text>
      </view>
    </view>

    <view class="section">
      <view class="section-header"><text class="section-title">服务直达</text></view>
      <view class="service-grid">
        <view class="service-item" @tap="goCollect">
          <text class="service-icon">📤</text>
          <text class="service-label">快速收款</text>
        </view>
        <view class="service-item" @tap="goPay">
          <text class="service-icon">💳</text>
          <text class="service-label">立即付款</text>
        </view>
        <view class="service-item" @tap="goAIChat">
          <text class="service-icon">🤖</text>
          <text class="service-label">AI客服</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
// @ts-ignore
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/index'
import { walletApi } from '../../api/index'

const userStore = useUserStore()
const balance = ref(0)
const reputation = ref(0)
const txCount = ref(0)
const recentTxList = ref([])

onShow(async () => {
  userStore.restore()
  if (userStore.isLoggedIn) {
    await loadDashboard()
  }
})

async function loadDashboard() {
  try {
    const [balRes, txRes] = await Promise.all([
      walletApi.balance(),
      walletApi.transactions()
    ])
    if (balRes.success) {
      balance.value = balRes.data.balance
      reputation.value = balRes.data.reputationScore || 0
    }
    if (txRes.success) {
      recentTxList.value = (txRes.data.list || []).slice(0, 5)
      txCount.value = txRes.data.list?.length || 0
    }
  } catch (e) {}
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return (d.getMonth()+1)+'/'+d.getDate()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')
}

function showTxDetail(tx) {
  if (!tx.hash && !tx.notary) return
  let c = '交易编号: '+tx.id+'\n金额: ¥'+Math.abs(tx.amount).toFixed(2)+'\n说明: '+tx.desc+'\n时间: '+formatTime(tx.createdAt)
  if (tx.hash) c += '\n\n📜 存证 HASH:\n'+tx.hash
  if (tx.notary) c += '\n\n📋 公证书编号: '+tx.notary.certificateNo
  uni.showModal({title:'🔏 存证详情',content:c,showCancel:false,confirmText:'关闭'})
}

function goCollect() { uni.navigateTo({url:'/pages/collect/index'}) }
function goPay() { uni.navigateTo({url:'/pages/pay/index'}) }
function goBills() { uni.switchTab({url:'/pages/bills/index'}) }
function goWallet() { uni.navigateTo({url:'/pages/wallet/index'}) }
function goDataMarket() { uni.navigateTo({url:'/pages/dataMarket/index'}) }
function goBizCenter() { uni.navigateTo({url:'/pages/biz/index'}) }
function goNotary() { uni.navigateTo({url:'/pages/notary/index'}) }
function goGovernance() { uni.navigateTo({url:'/pages/governance/index'}) }
function goAIChat() { uni.navigateTo({url:'/pages/ai-chat/index'}) }
function goAgentPay() { uni.navigateTo({url:'/pages/agent-pay/index'}) }
function goBooking() { uni.navigateTo({url:'/pages/booking/index'}) }
function goPromotion() { uni.navigateTo({url:'/pages/promotion/index'}) }
function goDataConsent() { uni.navigateTo({url:'/pages/dataConsent/index'}) }
function goDataEarnings() { uni.navigateTo({url:'/pages/dataEarnings/index'}) }

function startVoiceCommand() {
  try {
    if (typeof my !== 'undefined') {
      my.startRecognize({
        type:'voice',lang:'zh_cn',
        success:async(res)=>{
          const t=(res.result||'').trim()
          if(!t)return
          uni.showToast({title:'🎤 '+t,icon:'none'})
          try {
            const r=await api.post('/ai/voice-command',{text:t})
            if(r.success&&r.data.intent){
              const c=r.data
              if(c.intent==='pay'&&c.params)uni.navigateTo({url:'/pages/pay/index?data='+encodeURIComponent(JSON.stringify({action:'voice_pay',toNickName:c.params.payeeName||'',amount:c.params.amount||'',subject:c.params.subject||''}))})
              else if(c.intent==='search')uni.navigateTo({url:'/pages/bills/index'})
              else if(c.intent==='collect')uni.navigateTo({url:'/pages/collect/index'})
              else if(c.intent==='biz')uni.navigateTo({url:'/pages/biz/index'})
              else if(c.intent==='chat')uni.navigateTo({url:'/pages/ai-chat/index'})
              else uni.showToast({title:'未识别的指令',icon:'none'})
            }else uni.showToast({title:'指令解析失败',icon:'none'})
          }catch(e){uni.showToast({title:'指令解析失败',icon:'none'})}
        },
        fail:()=>{uni.showToast({title:'语音识别失败',icon:'none'})}
      })
    }
  }catch(e){}
}
</script>

<style scoped>
.page { min-height:100vh; background:var(--gn-bg); padding-bottom:20rpx; }
.brand-header { position:relative; padding:60rpx 30rpx 40rpx; margin-bottom:24rpx; background:linear-gradient(135deg,var(--gn-primary) 0%,var(--gn-primary-dark) 50%,var(--gn-primary-deeper) 100%); overflow:hidden; }
.brand-bg-decor { position:absolute; top:0; right:0; bottom:0; left:0; background:radial-gradient(ellipse at 20% 20%,rgba(255,255,255,.12) 0%,transparent 50%),radial-gradient(ellipse at 80% 80%,rgba(255,255,255,.08) 0%,transparent 50%),radial-gradient(ellipse at 50% 100%,rgba(200,146,62,.18) 0%,transparent 40%); }
.brand-top { position:relative; z-index:1; display:flex; align-items:center; margin-bottom:36rpx; }
.brand-logo-wrap { position:relative; margin-right:20rpx; }
.brand-logo { width:72rpx; height:72rpx; border-radius:12rpx; filter:drop-shadow(0 2rpx 8rpx rgba(200,146,62,0.3)); }
.brand-seal { position:absolute; top:-8rpx; right:-8rpx; font-size:24rpx; filter:drop-shadow(0 2rpx 4rpx rgba(0,0,0,.2)); }
.brand-info { flex:1; }
.brand-name { display:block; font-size:40rpx; font-weight:700; color:#fff; letter-spacing:4rpx; text-shadow:0 2rpx 8rpx rgba(0,0,0,.1); }
.brand-slogan { display:block; font-size:24rpx; color:rgba(255,255,255,.7); margin-top:6rpx; }
.brand-stats { position:relative; z-index:1; display:flex; align-items:center; background:rgba(255,255,255,.12); backdrop-filter:blur(8px); border-radius:var(--gn-radius-lg); padding:20rpx 16rpx; border:1rpx solid rgba(200,146,62,0.15); }
.stat-item { flex:1; display:flex; flex-direction:column; align-items:center; }
.stat-num { font-size:34rpx; font-weight:700; color:#fff; margin-bottom:4rpx; }
.stat-num.gold { color:#C8923E; text-shadow:0 0 12rpx rgba(200,146,62,0.3); }
.stat-label { font-size:22rpx; color:rgba(255,255,255,.6); }
.stat-divider { width:2rpx; height:40rpx; background:rgba(255,255,255,.15); }
.voice-command-btn { display:flex; align-items:center; justify-content:center; gap:8rpx; padding:16rpx 32rpx; margin:16rpx 32rpx 0; background:rgba(255,255,255,.15); border-radius:var(--gn-radius-full); border:2rpx solid rgba(200,146,62,0.25); position:relative; z-index:1; }
.voice-cmd-icon { font-size:28rpx; }
.voice-cmd-text { font-size:24rpx; color:#fff; opacity:.9; }
.func-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:20rpx; padding:0 24rpx; margin-bottom:24rpx; }
.func-item { display:flex; flex-direction:column; align-items:center; gap:12rpx; }
.func-icon-wrap { display:flex; align-items:center; justify-content:center; width:88rpx; height:88rpx; border-radius:20rpx; box-shadow:0 4rpx 12rpx rgba(0,0,0,.1); }
.func-icon { font-size:40rpx; }
.func-label { font-size:22rpx; color:var(--gn-text-secondary); font-weight:500; }
.section { margin:0 24rpx 24rpx; }
.section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16rpx; }
.section-title { font-size:30rpx; font-weight:700; color:var(--gn-text); }
.section-more { font-size:24rpx; color:var(--gn-primary); }
.tx-list { background:var(--gn-card); border-radius:var(--gn-radius-lg); overflow:hidden; box-shadow:var(--gn-shadow-sm); }
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
.tx-cert-badge { display:block; font-size:20rpx; color:#f59e0b; margin-top:4rpx; }
.empty-tx { display:flex; flex-direction:column; align-items:center; padding:60rpx 0; }
.empty-icon { font-size:80rpx; margin-bottom:16rpx; }
.empty-text { font-size:28rpx; color:var(--gn-text-tertiary); }
.empty-hint { font-size:24rpx; color:var(--gn-text-tertiary); margin-top:8rpx; }
.service-grid { display:flex; gap:20rpx; }
.service-item { flex:1; display:flex; flex-direction:column; align-items:center; gap:12rpx; padding:24rpx 0; background:var(--gn-card); border-radius:var(--gn-radius-lg); box-shadow:var(--gn-shadow-sm); }
.service-icon { font-size:48rpx; }
.service-label { font-size:24rpx; color:var(--gn-text-secondary); }
</style>

