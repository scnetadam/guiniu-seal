/**
 * 跨平台工具函数
 * 统一封装微信 / 支付宝 / H5 的平台差异
 */

import { isWechat } from './wechat';
import { isAlipay } from './alipay';

/** 判断当前平台 */
export function getPlatform(): 'wechat' | 'alipay' | 'h5' {
  if (isWechat()) return 'wechat';
  if (isAlipay()) return 'alipay';
  return 'h5';
}

/** 语音识别（平台差异封装） */
export function startVoiceRecognition(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (isAlipay()) {
      // @ts-ignore
      my.startRecognize({
        type: 'voice',
        lang: 'zh_cn',
        success: (res: any) => resolve((res.result || '').trim()),
        fail: (err: any) => reject(err),
      });
    } else if (isWechat()) {
      // @ts-ignore
      wx.startRecord({
        success: () => {
          // @ts-ignore
          wx.stopRecord();
          uni.showToast({ title: '微信语音识别需使用插件', icon: 'none' });
          reject(new Error('微信语音识别需使用插件'));
        },
        fail: () => reject(new Error('语音识别失败')),
      });
    } else {
      // H5 不支持
      reject(new Error('当前环境不支持语音识别'));
    }
  });
}

/** TTS 语音播报 */
export function speakText(text: string) {
  if (isAlipay()) {
    try {
      // @ts-ignore
      my.startTTS({ content: text, type: '0' });
    } catch (e) {
      // 静默失败
    }
  } else if (isWechat()) {
    // 微信小程序暂不支持直接 TTS，忽略
  }
}

/** 分享（平台差异） */
export function shareApp() {
  if (isAlipay()) {
    try {
      // @ts-ignore
      my.shareAppMessage();
    } catch (e) {}
  } else if (isWechat()) {
    // @ts-ignore
    wx.showShareMenu({ withShareTicket: true });
  } else {
    uni.showShareMenu({ withShareTicket: true });
  }
}

/** 获取手机号（支付宝专用） */
export function getPhoneNumber(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (isAlipay()) {
      // @ts-ignore
      my.getPhoneNumber({
        success: (res: any) => {
          if (res.response) {
            try {
              const data = JSON.parse(res.response);
              if (data.mobile) resolve(data.mobile);
              else reject(new Error('未获取到手机号'));
            } catch { reject(new Error('解析手机号失败')); }
          } else { reject(new Error('未获取到手机号')); }
        },
        fail: (err: any) => reject(err),
      });
    } else {
      // 微信或 H5 暂不支持
      reject(new Error('当前环境不支持获取手机号'));
    }
  });
}

/** 执行支付（微信/支付宝） */
export async function requestPayment(params: {
  provider: 'alipay' | 'wxpay';
  orderInfo?: string;
  timeStamp?: string;
  nonceStr?: string;
  package?: string;
  signType?: 'MD5' | 'HMAC-SHA256';
  paySign?: string;
  timeOut?: number;
}): Promise<any> {
  return uni.requestPayment(params as any);
}