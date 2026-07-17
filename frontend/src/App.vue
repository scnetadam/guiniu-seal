<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app';

onLaunch(() => {
  console.log('[龟钮印证] App Launch');
});
onShow(() => {
  console.log('[龟钮印证] App Show');
});
onHide(() => {
  console.log('[龟钮印证] App Hide');
});
</script>

<template>
  <view></view>
</template>

<style>
/* ============================
   龟钮印证 全局样式 v2.0
   品牌色系 | 龟钮 IP 风格
   ============================ */

:root,
page {
  /* █ 品牌色 — 龟钮蓝（科技感主色） */
  --gn-primary: #2563eb;
  --gn-primary-dark: #1d4ed8;
  --gn-primary-deeper: #1e3a8a;
  --gn-primary-light: #eff6ff;
  --gn-primary-lighter: #dbeafe;

  /* █ 品牌色 — 古铜金（印章质感辅色）
     参考：方升品牌色 #A67C52~#C8923E */
  --gn-gold: #C8923E;
  --gn-gold-light: #FDF6EC;
  --gn-gold-dark: #8B6914;
  --gn-gold-deeper: #6B4F1A;

  /* █ 辅助色 */
  --gn-success: #10b981;
  --gn-success-light: #ecfdf5;
  --gn-danger: #ef4444;
  --gn-danger-light: #fef2f2;
  --gn-warning: #f59e0b;
  --gn-warning-light: #fffbeb;

  /* █ 文字色 */
  --gn-text: #1f2937;
  --gn-text-secondary: #4B5563;
  --gn-text-tertiary: #9CA3AF;
  --gn-text-placeholder: #D1D5DB;
  --gn-text-gold: #A67C52;

  /* █ 背景色 */
  --gn-bg: #f0f2f5;
  --gn-bg-dark: #e5e7eb;
  --gn-card: #ffffff;
  --gn-bg-muted: #f9fafb;

  /* █ 边框 */
  --gn-border: #e5e7eb;
  --gn-border-light: #f3f4f6;

  /* █ 圆角规范 */
  --gn-radius-sm: 8rpx;
  --gn-radius-md: 12rpx;
  --gn-radius-lg: 16rpx;
  --gn-radius-xl: 20rpx;
  --gn-radius-full: 9999rpx;

  /* █ 阴影规范 */
  --gn-shadow-sm: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  --gn-shadow-md: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  --gn-shadow-lg: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
  --gn-shadow-gold: 0 4rpx 16rpx rgba(200, 146, 62, 0.25);
}

page {
  background-color: var(--gn-bg);
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Helvetica Neue", "Microsoft YaHei", sans-serif;
  color: var(--gn-text);
  box-sizing: border-box;
  -webkit-font-smoothing: antialiased;
  font-size: 28rpx;
}

view, scroll-view, swiper { box-sizing: border-box; }

/* █ 按钮重置 */
button {
  margin: 0;
  padding: 0;
  font-size: inherit;
  border: none;
  background: transparent;
  line-height: inherit;
}
button::after { border: none; }

/* █ 输入框 */
input, textarea {
  font-size: inherit;
  color: inherit;
  outline: none;
}

/* █ 隐藏滚动条 */
::-webkit-scrollbar { width: 0; height: 0; }

/* █ 安全区域 */
.safe-bottom { padding-bottom: env(safe-area-inset-bottom); }

/* █ 分割线 */
.divider {
  height: 2rpx;
  background: var(--gn-border-light);
  margin: 0;
}

/* █ 通用动画 */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10rpx); }
  to { opacity: 1; transform: translateY(0); }
}
.fade-in { animation: fadeIn 0.3s ease-out; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }

/* █ 品牌按钮 — 蓝色主按钮 */
.btn-gn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 96rpx;
  background: linear-gradient(135deg, var(--gn-primary), var(--gn-primary-dark));
  border-radius: var(--gn-radius-full);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  box-shadow: 0 4rpx 16rpx rgba(37, 99, 235, 0.3);
  transition: opacity 0.2s;
}
.btn-gn-primary:active { opacity: 0.85; }

/* █ 品牌按钮 — 金色强调按钮 */
.btn-gn-gold {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  background: linear-gradient(135deg, #C8923E, #A67C52);
  border-radius: var(--gn-radius-full);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  box-shadow: var(--gn-shadow-gold);
  transition: opacity 0.2s;
}
.btn-gn-gold:active { opacity: 0.85; }

/* █ 品牌卡片 */
.card-gn {
  background: var(--gn-card);
  border-radius: var(--gn-radius-lg);
  padding: 28rpx;
  box-shadow: var(--gn-shadow-sm);
}

/* █ 品牌徽章 */
.badge-gn {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 16rpx;
  border-radius: var(--gn-radius-full);
  font-size: 20rpx;
  font-weight: 500;
}
.badge-gn.primary { background: var(--gn-primary-light); color: var(--gn-primary); }
.badge-gn.gold { background: var(--gn-gold-light); color: var(--gn-gold-dark); }
.badge-gn.success { background: var(--gn-success-light); color: var(--gn-success); }
.badge-gn.danger { background: var(--gn-danger-light); color: var(--gn-danger); }

/* █ 龟钮印 — 印章装饰元素（古铜金风格） */
.gn-seal {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  background: linear-gradient(135deg, #C8923E, #A67C52);
  border-radius: 6rpx;
  color: #fff;
  font-size: 28rpx;
  transform: rotate(-3deg);
  box-shadow: 0 2rpx 6rpx rgba(200, 146, 62, 0.35);
}

/* █ 龟钮印 — 大号（用于首页品牌头） */
.gn-seal-lg {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64rpx;
  height: 64rpx;
  background: linear-gradient(135deg, #C8923E, #A67C52);
  border-radius: 8rpx;
  color: #fff;
  font-size: 36rpx;
  transform: rotate(-3deg);
  box-shadow: 0 4rpx 12rpx rgba(200, 146, 62, 0.35);
}

/* █ 龟钮印 — 线框风格（轻量装饰） */
.gn-seal-outline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid #C8923E;
  border-radius: 6rpx;
  color: #C8923E;
  font-size: 22rpx;
  transform: rotate(-2deg);
}

/* █ 古铜金分隔线 */
.divider-gold {
  height: 2rpx;
  background: linear-gradient(90deg, transparent, #C8923E, transparent);
  margin: 0;
  opacity: 0.4;
}

/* █ 页面标准头 */
.page-header-gn {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  background: var(--gn-card);
}

/* █ 空状态 */
.empty-state-gn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 40rpx;
}
.empty-state-gn .empty-icon { font-size: 80rpx; margin-bottom: 20rpx; }
.empty-state-gn .empty-text { font-size: 28rpx; color: var(--gn-text-tertiary); }
</style>