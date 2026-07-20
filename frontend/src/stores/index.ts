import { defineStore } from 'pinia';
import { ref } from 'vue';
import { authApi } from '../api/index';

export const useUserStore = defineStore('user', () => {
  const token = ref('');
  const userId = ref('');
  const userInfo = ref<{ nickName: string; avatarUrl: string; role?: string } | null>(null);
  const isLoggedIn = ref(false);

  async function login(code: string, nickName?: string, avatarUrl?: string, platform?: string, role?: string) {
    const res = await authApi.login(code, nickName, avatarUrl, platform, role);
    if (res.success) {
      token.value = res.data.token;
      userId.value = res.data.user.id;
      userInfo.value = res.data.user;
      isLoggedIn.value = true;
      uni.setStorageSync('token', res.data.token);
      uni.setStorageSync('userId', res.data.user.id);
      uni.setStorageSync('userInfo', JSON.stringify(res.data.user));
    }
    return res;
  }

  function logout() {
    token.value = '';
    userId.value = '';
    userInfo.value = null;
    isLoggedIn.value = false;
    uni.removeStorageSync('token');
    uni.removeStorageSync('userId');
    uni.removeStorageSync('userInfo');
  }

  function restore() {
    const t = uni.getStorageSync('token');
    const uid = uni.getStorageSync('userId');
    const ui = uni.getStorageSync('userInfo');
    if (t && uid) {
      token.value = t;
      userId.value = uid;
      if (ui) userInfo.value = JSON.parse(ui);
      isLoggedIn.value = true;
    }
  }

  return { token, userId, userInfo, isLoggedIn, login, logout, restore };
});