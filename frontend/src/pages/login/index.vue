<!-- login/index.vue -->
<template>
  <view class="page">
    <view class="login-card">
      <view class="brand-section">
        <text class="brand-icon">🔏</text>
        <text class="brand-title">龟钮印证</text>
        <text class="brand-sub">区块链存证 · 可信支付</text>
      </view>
      <view class="input-section">
        <view class="input-row">
          <text class="input-label">手机号</text>
          <input class="input-field" type="text" placeholder="请输入手机号" @input="e => phone = e.detail.value" v-model="phone" maxlength="11" />
        </view>
        <view class="input-row">
          <text class="input-label">密码</text>
          <input class="input-field" type="password" placeholder="请输入密码" @input="e => password = e.detail.value" v-model="password" />
        </view>
        <view class="input-row" v-if="isRegister">
          <text class="input-label">确认密码</text>
          <input class="input-field" type="password" placeholder="请再次输入密码" @input="e => confirmPwd = e.detail.value" v-model="confirmPwd" />
        </view>
      </view>
      <view class="action-section">
        <button class="login-btn" :loading="loading" :disabled="loading" @tap="handleLogin">{{ isRegister ? '注册' : '登录' }}</button>
        <view class="switch-row">
          <text class="switch-text" @tap="isRegister = !isRegister">{{ isRegister ? '已有账号？去登录' : '没有账号？去注册' }}</text>
          <text class="forgot-text" v-if="!isRegister">忘记密码</text>
        </view>
      </view>
      <view class="agreement" v-if="isRegister">
        <text class="agree-text">注册即表示同意</text>
        <text class="agree-link">《用户协议》</text>
        <text class="agree-text">和</text>
        <text class="agree-link">《隐私政策》</text>
      </view>
      <view class="third-party">
        <text class="third-label">其他登录方式</text>
        <view class="third-icons">
          <view class="third-icon" @tap="wechatLogin"><text>💬</text><text class="third-name">微信</text></view>
          <view class="third-icon" @tap="alipayLogin"><text>💳</text><text class="third-name">支付宝</text></view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '../../stores/index'
import { notificationApi } from '../../api/index'

const userStore = useUserStore()
const phone = ref('')
const password = ref('')
const confirmPwd = ref('')
const loading = ref(false)
const isRegister = ref(false)

onShow(() => { userStore.restore() })

async function handleLogin() {
  if (!phone.value || !password.value) {
    uni.showToast({ title: '请填写手机号和密码', icon: 'none' })
    return
  }
  if (isRegister.value && password.value !== confirmPwd.value) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const success = await userStore.login({ phone: phone.value, password: password.value, isRegister: isRegister.value })
    if (success) {
      uni.showToast({ title: isRegister.value ? '注册成功' : '登录成功', icon: 'success' })
      setTimeout(() => {
        uni.switchTab({ url: '/pages/home/index' })
        checkLoginReminders()
      }, 500)
    } else {
      uni.showToast({ title: userStore.error || '操作失败', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '网络异常', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function wechatLogin() { uni.showToast({ title: '微信登录开发中', icon: 'none' }) }
function alipayLogin() { uni.showToast({ title: '支付宝登录开发中', icon: 'none' }) }

async function checkLoginReminders() {
  try {
    const res = await notificationApi.loginReminders()
    if (res.success && res.data?.hasEarningsReminder) {
      const reminder = res.data.reminders.find(r => r.category === 'earnings_claim')
      if (reminder) {
        uni.showModal({
          title: reminder.title || '收益提醒',
          content: reminder.body || '您有待领取的收益',
          confirmText: reminder.actionText || '立即查看',
          cancelText: '稍后再说',
          success: ({ confirm }) => {
            if (confirm) uni.navigateTo({ url: reminder.actionUrl || '/pages/wallet/index' })
            notificationApi.dismissReminder(reminder.id)
          }
        })
      }
    }
  } catch (e) {}
}
</script>

<style scoped>
.page { min-height:100vh; background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); display:flex; align-items:center; justify-content:center; padding:40rpx; }
.login-card { width:100%; max-width:560rpx; background:#fff; border-radius:32rpx; padding:40rpx; box-shadow:0 20rpx 60rpx rgba(0,0,0,.15); }
.brand-section { text-align:center; margin-bottom:40rpx; }
.brand-icon { font-size:60rpx; display:block; margin-bottom:12rpx; }
.brand-title { display:block; font-size:36rpx; font-weight:700; color:var(--gn-text); margin-bottom:8rpx; }
.brand-sub { display:block; font-size:24rpx; color:var(--gn-text-tertiary); }
.input-section { margin-bottom:32rpx; }
.input-row { margin-bottom:20rpx; }
.input-label { display:block; font-size:24rpx; color:var(--gn-text-secondary); margin-bottom:8rpx; }
.input-field { width:100%; height:72rpx; padding:0 20rpx; background:var(--gn-bg); border-radius:var(--gn-radius); font-size:26rpx; }
.action-section { margin-bottom:24rpx; }
.login-btn { width:100%; height:80rpx; background:linear-gradient(135deg,var(--gn-primary),var(--gn-primary-dark)); border-radius:40rpx; color:#fff; font-size:30rpx; font-weight:600; line-height:80rpx; }
.switch-row { display:flex; justify-content:space-between; margin-top:16rpx; }
.switch-text { font-size:24rpx; color:var(--gn-primary); }
.forgot-text { font-size:24rpx; color:var(--gn-text-tertiary); }
.agreement { display:flex; justify-content:center; gap:4rpx; margin-bottom:24rpx; font-size:22rpx; }
.agree-text { color:var(--gn-text-tertiary); }
.agree-link { color:var(--gn-primary); }
.third-party { text-align:center; }
.third-label { display:block; font-size:22rpx; color:var(--gn-text-tertiary); margin-bottom:16rpx; }
.third-icons { display:flex; justify-content:center; gap:40rpx; }
.third-icon { display:flex; flex-direction:column; align-items:center; gap:8rpx; font-size:36rpx; }
.third-name { font-size:22rpx; color:var(--gn-text-secondary); }
</style>
