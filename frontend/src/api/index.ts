/**
 * 龟钮·印信 API 封装
 * 后端：龟钮印信支付中台 (Node.js Express)
 * 仅供支付核心模块使用
 */

const BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:3002/api';

export function getUserId(): string {
  return uni.getStorageSync('userId') || '';
}

function getToken(): string {
  return uni.getStorageSync('token') || '';
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, any>;
  showLoading?: boolean;
  loadingText?: string;
}

export interface ApiResult<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface TxItem {
  id: string;
  userId: string;
  type: string;
  amount: number;
  desc: string;
  balance: number;
  createdAt: string;
}

async function request<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
  const loading = options.showLoading ?? true;
  const token = getToken();

  if (loading) {
    uni.showLoading({ title: options.loadingText || '加载中...', mask: true });
  }

  try {
    const res = await uni.request({
      url: `${BASE_URL}${url}`,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: 10000,
    }) as UniApp.RequestSuccessCallbackResult;

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new Error(res.data?.error || `请求失败 (${res.statusCode})`);
    }

    return res.data as T;
  } catch (err: any) {
    uni.showToast({ title: err?.message || '网络错误', icon: 'none' });
    throw err;
  } finally {
    if (loading) {
      uni.hideLoading();
    }
  }
}

// ==================== Auth ====================
export const authApi = {
  login(code: string, nickName?: string, avatarUrl?: string, platform?: string, role?: string) {
    return request<ApiResult<{ token: string; user: { id: string; nickName: string; avatarUrl: string; role?: string } }>>('/auth/login', {
      method: 'POST',
      data: { code, nickName, avatarUrl, platform, role },
      showLoading: false,
    });
  },
};

// ==================== Wallet ====================
export const walletApi = {
  async balance() {
    const userId = getUserId();
    return request<ApiResult<any>>(`/wallet/balance?userId=${userId}`, { showLoading: false });
  },
  transactions(page = 1) {
    const userId = getUserId();
    return request<ApiResult<{ list: TxItem[]; total: number }>>(`/wallet/transactions?userId=${userId}&page=${page}`, { showLoading: false });
  },
};

// ==================== Payment ====================
export const paymentApi = {
  create(data: { amount: number; subject: string; payerId?: string; payeeId?: string; userId?: string }) {
    return request<ApiResult<any>>('/payment/create', { method: 'POST', data });
  },
  confirm(id: string) {
    return request<ApiResult<any>>('/payment/confirm', { method: 'POST', data: { id } });
  },
  list(userId?: string, page = 1) {
    const params = `?userId=${userId || getUserId()}&page=${page}`;
    return request<ApiResult<{ items: any[]; total: number }>>(`/payment/list${params}`, { showLoading: false });
  },
  detail(id: string) {
    return request<ApiResult<any>>(`/payment/detail?id=${id}`, { showLoading: false });
  },
};

// ==================== Agent Pay ====================
export const agentPayApi = {
  execute(data: { agentId: string; payerId: string; payeeId?: string; amount: number; subject?: string }) {
    return request<ApiResult<any>>('/agent-pay/execute', { method: 'POST', data });
  },
  list(agentId: string, page = 1) {
    return request<ApiResult<{ items: any[]; total: number }>>(`/agent-pay/list?agentId=${agentId}&page=${page}`, { showLoading: false });
  },
};

// ==================== Settle (统一结算) ====================
export const settleApi = {
  checkout(data: { amount: number; subject: string; channel?: string; payerId: string; payeeId?: string }) {
    return request<ApiResult<any>>('/settle/checkout', { method: 'POST', data });
  },
  query(tradeNo: string) {
    return request<ApiResult<any>>(`/settle/query?tradeNo=${tradeNo}`, { showLoading: false });
  },
};

// ==================== General-purpose API ====================
export const api = {
  get(url: string, opts?: { params?: Record<string, any> }) {
    const query = opts?.params
      ? '?' + Object.entries(opts.params).filter(([, v]) => v !== '' && v !== undefined)
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&')
      : '';
    return request<ApiResult<any>>(url + query, { showLoading: false });
  },
  post(url: string, data?: any) {
    return request<ApiResult<any>>(url, { method: 'POST', data, showLoading: false });
  },
};

// ==================== GIT Repo Tracker ====================
export const gitRepoTrackerApi = {
  sync() { return request<ApiResult<any>>('/git-repo-tracker/sync', { method: 'POST', showLoading: true }); },
  status() { return request<ApiResult<any>>('/git-repo-tracker/status', { showLoading: false }); },
  dimensions() { return request<ApiResult<any>>('/git-repo-tracker/weighted-dimensions', { showLoading: false }); },
  growth() { return request<ApiResult<any>>('/git-repo-tracker/growth', { showLoading: false }); },
  notarize() { return request<ApiResult<any>>('/git-repo-tracker/notarize', { method: 'POST', showLoading: true }); },
  settle(data: any) { return request<ApiResult<any>>('/git-repo-tracker/settle', { method: 'POST', data, showLoading: false }); },
  settleStats() { return request<ApiResult<any>>('/git-repo-tracker/settle/stats', { showLoading: false }); },
  settleRecords(page?: number) { return request<ApiResult<any>>(`/git-repo-tracker/settle/records${page ? '?page=' + page : ''}`, { showLoading: false }); },
  contributorTrack(data: any) { return request<ApiResult<any>>('/git-repo-tracker/contributor/track', { method: 'POST', data, showLoading: false }); },
  contributorList() { return request<ApiResult<any>>('/git-repo-tracker/contributor/list', { showLoading: false }); },
  contributorDetail(id: string) { return request<ApiResult<any>>(`/git-repo-tracker/contributor/detail?id=${id}`, { showLoading: false }); },
  dashboard() { return request<ApiResult<any>>('/git-repo-tracker/dashboard', { showLoading: false }); },
};

// ==================== Data Lock ====================
export const dataLockApi = {
  lock(data: any) { return request<ApiResult<any>>('/data-lock/lock', { method: 'POST', data, showLoading: true }); },
  batchLock(data: any) { return request<ApiResult<any>>('/data-lock/batch-lock', { method: 'POST', data, showLoading: true }); },
  records(params?: any) { const q = params ? '?' + Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('&') : ''; return request<ApiResult<any>>(`/data-lock/records${q}`, { showLoading: false }); },
  detail(id: string) { return request<ApiResult<any>>(`/data-lock/detail?id=${id}`, { showLoading: false }); },
  verify(data: any) { return request<ApiResult<any>>('/data-lock/verify', { method: 'POST', data, showLoading: false }); },
  upgrade(data: any) { return request<ApiResult<any>>('/data-lock/upgrade', { method: 'POST', data, showLoading: true }); },
  stats() { return request<ApiResult<any>>('/data-lock/stats', { showLoading: false }); },
  sources() { return request<ApiResult<any>>('/data-lock/sources', { showLoading: false }); },
};

// ==================== Notification ====================
export const notificationApi = {
  send(data: any) { return request<ApiResult<any>>('/notification/send', { method: 'POST', data, showLoading: false }); },
  earningsReminder(data: any) { return request<ApiResult<any>>('/notification/earnings-reminder', { method: 'POST', data, showLoading: false }); },
  dailyReminder(data: any) { return request<ApiResult<any>>('/notification/daily-reminder', { method: 'POST', data, showLoading: false }); },
  loginReminders() { const uid = getUserId(); return request<ApiResult<any>>(`/notification/login-reminders?userId=${uid}`, { showLoading: false }); },
  markRead(ids: string[]) { return request<ApiResult<any>>('/notification/mark-read', { method: 'POST', data: { notificationIds: ids, userId: getUserId() }, showLoading: false }); },
  dismissReminder(id: string) { return request<ApiResult<any>>('/notification/dismiss-reminder', { method: 'POST', data: { id, userId: getUserId() }, showLoading: false }); },
  list(params?: any) { const uid = getUserId(); const q = params ? '&' + Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('&') : ''; return request<ApiResult<any>>(`/notification/list?userId=${uid}${q}`, { showLoading: false }); },
  unreadCount() { const uid = getUserId(); return request<ApiResult<any>>(`/notification/unread-count?userId=${uid}`, { showLoading: false }); },
  prefSet(data: any) { return request<ApiResult<any>>('/notification/pref/set', { method: 'POST', data: { ...data, userId: getUserId() }, showLoading: false }); },
  prefList() { const uid = getUserId(); return request<ApiResult<any>>(`/notification/pref/list?userId=${uid}`, { showLoading: false }); },
  categories() { return request<ApiResult<any>>('/notification/categories', { showLoading: false }); },
  templates(params?: any) { const q = params ? '?' + Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('&') : ''; return request<ApiResult<any>>(`/notification/templates${q}`, { showLoading: false }); },
};

export default request;