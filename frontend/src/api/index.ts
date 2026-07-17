/**
 * 龟钮印证 API 封装
 * 后端：龟钮印证支付中台 (Node.js Express)
 */

// 后端服务地址
// 优先使用环境变量 VITE_API_BASE，否则用默认值
const BASE_URL = import.meta.env.VITE_API_BASE || 'https://192.168.0.100:3443/api';

export function getUserId(): string {
  return uni.getStorageSync('userId') || '';
}

function getToken(): string {
  return uni.getStorageSync('token') || '';
}

async function request<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
  const loading = options.showLoading ?? true;
  const token = getToken();

  if (loading) {
    uni.showLoading({ title: options.loadingText || '加载中...', mask: true });
  }

  try {
    // 支付宝小程序 my.request 会自动处理对象序列化
    // 传原始对象，让框架负责序列化
    const requestData = options.data;

    const res = await uni.request({
      url: `${BASE_URL}${url}`,
      method: options.method || 'GET',
      data: requestData,
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
    console.log('[API错误] 类型:', typeof err);
    console.log('[API错误] 本身:', err);
    console.log('[API错误] message:', err?.message);
    console.log('[API错误] errMsg:', err?.errMsg);
    console.log('[API错误] errorCode:', err?.errorCode);
    console.log('[API错误] stack:', err?.stack);
    uni.showToast({ title: err?.message || '网络错误', icon: 'none' });
    throw err;
  } finally {
    if (loading) {
      uni.hideLoading();
    }
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, any>;
  showLoading?: boolean;
  loadingText?: string;
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
  // 从后端获取钱包余额
  async balance() {
    const userId = getUserId();
    const result = await request<ApiResult<any>>(`/wallet/balance?userId=${userId}`, {
      showLoading: false,
    });
    // 返回钱包完整信息 (balance + dataEarnings)
    return result;
  },
  transactions(page = 1) {
    const userId = getUserId();
    return request<ApiResult<{ list: TxItem[]; total: number }>>(`/wallet/transactions?userId=${userId}&page=${page}`, {
      showLoading: false,
    });
  },
};

// ==================== Payment (L0 隔离) ====================
export const paymentApi = {
  // L0 创建支付 (包含 B 端资费 + 风控 + HASH)
  create(data: {
    amount: number;
    subject: string;
    payerId?: string;
    payeeId?: string;
    userId?: string;
    payMode?: string;
  }) {
    return request<ApiResult<any>>('/payment/create', {
      method: 'POST',
      data,
    });
  },
  // 确认支付
  confirm(id: string, channelTradeNo: string) {
    return request<ApiResult<any>>('/payment/confirm', {
      method: 'POST',
      data: { id, channelTradeNo },
    });
  },
  // 查询交易
  query(id: string) {
    return request<ApiResult<any>>(`/payment/query?id=${id}`, {
      showLoading: false,
    });
  },
  // 扫码支付（外部收款码）
  scanPay(scanCode: string) {
    return request<ApiResult<any>>('/payment/scan-pay', {
      method: 'POST',
      data: { scanCode, userId: getUserId() },
    });
  },
};

// ==================== Data Market ====================
export const dataMarketApi = {
  // 数据授权
  consent(userId: string, scope?: string) {
    return request<ApiResult<any>>('/data-market/consent', {
      method: 'POST',
      data: { userId, scope: scope || 'all' },
    });
  },
  // 查询授权状态
  getConsent(userId: string) {
    return request<ApiResult<any>>(`/data-market/consent?userId=${userId}`, {
      showLoading: false,
    });
  },
  // G 端查询数据产品
  listProducts() {
    return request<ApiResult<any[]>>('/data-market/products', {
      showLoading: false,
    });
  },
  // G 端购买数据
  purchase(productId: string, buyerId: string, quantity?: number) {
    return request<ApiResult<any>>('/data-market/purchase', {
      method: 'POST',
      data: { productId, buyerId, quantity: quantity || 1 },
    });
  },
  // BC 端查询分成收益
  earnings(userId: string) {
    return request<ApiResult<any>>(`/data-market/earnings?userId=${userId}`, {
      showLoading: false,
    });
  },
  // 数据样本 (脱敏后)
  sample(productId?: string) {
    return request<ApiResult<any[]>>(`/data-market/sample?productId=${productId || ''}`, {
      showLoading: false,
    });
  },
};

// ==================== Notary (公证) ====================
export const notaryApi = {
  // 列出服务商
  listProviders() {
    return request<ApiResult<any[]>>('/notary/providers', {
      showLoading: false,
    });
  },
  // 申请公证
  apply(txId: string, providerId: string, userId: string, amount: number) {
    return request<ApiResult<any>>('/notary/apply', {
      method: 'POST',
      data: { txId, providerId, userId, amount },
    });
  },
  // 查询公证状态
  query(id: string) {
    return request<ApiResult<any>>(`/notary/query?id=${id}`, {
      showLoading: false,
    });
  },
};

// ==================== Risk (风控) ====================
export const riskApi = {
  // 风险鉴定
  assess(amount: number, userId: string, payeeId?: string) {
    return request<ApiResult<any>>('/risk/assess', {
      method: 'POST',
      data: { amount, userId, payeeId },
      showLoading: false,
    });
  },
};

// ==================== Booking (试驾预约) ====================
export const bookingApi = {
  submit(data: { contentId?: string; name: string; phone: string; city?: string; dealerName?: string }) {
    return request<ApiResult<any>>('/booking/submit', {
      method: 'POST',
      data: { ...data, userId: getUserId() },
    });
  },
  getByUser() {
    const userId = getUserId();
    return request<ApiResult<any>>(`/booking/user/${userId}`, { showLoading: false });
  },
};

// ==================== Content (推广内容) ====================
export const contentApi = {
  publish(data: { activityId: string; carModel: string; text?: string; images?: string[] }) {
    return request<ApiResult<any>>('/content/publish', {
      method: 'POST',
      data: { ...data, userId: getUserId() },
    });
  },
  getById(id: string) {
    return request<ApiResult<any>>(`/content/${id}`, { showLoading: false });
  },
  getByUser() {
    const userId = getUserId();
    return request<ApiResult<any>>(`/content/user/${userId}`, { showLoading: false });
  },
  trackView(contentId: string) {
    return request<ApiResult<any>>('/content/track/view', {
      method: 'POST',
      data: { contentId, userId: getUserId() },
      showLoading: false,
    });
  },
};

// ==================== AI ====================
export const aiApi = {
  generateCopy(brand: string, model: string, keywords?: string, style?: string) {
    return request<ApiResult<any>>('/ai/generate-copy', {
      method: 'POST',
      data: { brand, model, keywords, style, userId: getUserId() },
    });
  },
  recommend() {
    return request<ApiResult<any>>('/ai/recommend', {
      method: 'POST',
      data: { userId: getUserId() },
      showLoading: false,
    });
  },
  insight() {
    return request<ApiResult<any>>('/ai/insight', {
      method: 'POST',
      data: { userId: getUserId() },
      showLoading: false,
    });
  },
  assistant(brand: string, model: string, question: string, chatHistory?: any[]) {
    return request<ApiResult<any>>('/ai/assistant', {
      method: 'POST',
      data: { brand, model, question, chatHistory, userId: getUserId() },
    });
  },
};

// ==================== Types ====================
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
  contentId: string;
  balance: number;
  createdAt: string;
}

export default request;

// 通用 API 请求（用于非标准模块）
export const api = {
  get(url: string, opts?: { params?: Record<string, any> }) {
    const query = opts?.params ? '?' + Object.entries(opts.params)
      .filter(([, v]) => v !== '' && v !== undefined)
      .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
      .join('&') : '';
    return request<ApiResult<any>>(url + query, { showLoading: false });
  },
  post(url: string, data?: any) {
    return request<ApiResult<any>>(url, {
      method: 'POST',
      data,
      showLoading: false,
    });
  },
};