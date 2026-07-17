/**
 * 微信平台工具函数
 * 适配 wx.login / wx.getUserProfile 接口
 */

/** 判断当前是否为微信小程序环境 */
export function isWechat(): boolean {
  // @ts-ignore
  return typeof wx !== 'undefined' && typeof wx.login === 'function';
}

/** 微信登录获取 code */
export function wxGetLoginCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    // @ts-ignore
    wx.login({
      success: (res) => {
        if (res.code) {
          resolve(res.code);
        } else {
          reject(new Error('微信登录获取 code 失败'));
        }
      },
      fail: (err) => reject(err),
    });
  });
}

/** 获取微信用户信息（头像、昵称） */
export function wxGetUserProfile(): Promise<{ nickName: string; avatarUrl: string }> {
  return new Promise((resolve) => {
    // @ts-ignore
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        resolve({
          nickName: res.userInfo.nickName || '',
          avatarUrl: res.userInfo.avatarUrl || '',
        });
      },
      fail: () => {
        // 用户拒绝授权，返回空
        resolve({ nickName: '', avatarUrl: '' });
      },
    });
  });
}

/** 微信小程序内支付 */
export function wxRequestPayment(params: {
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: 'MD5' | 'HMAC-SHA256';
  paySign: string;
}): Promise<any> {
  return new Promise((resolve, reject) => {
    // @ts-ignore
    wx.requestPayment({
      ...params,
      success: (res) => resolve(res),
      fail: (err) => reject(err),
    });
  });
}