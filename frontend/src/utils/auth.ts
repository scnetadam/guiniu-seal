/**
 * 平台统一登录适配器
 * 根据运行环境自动选择微信 / 支付宝 / H5 登录流程
 */

import { aliGetAuthCode, aliGetUserInfo, isAlipay } from './alipay';
import { wxGetLoginCode, wxGetUserProfile, isWechat } from './wechat';

/** 获取当前平台标识 */
export function getPlatform(): string {
  if (isWechat()) return 'wechat';
  if (isAlipay()) return 'alipay';
  return 'h5';
}

/** 获取登录凭证（微信 code / 支付宝 authCode） */
export function getLoginCode(): Promise<string> {
  if (isWechat()) {
    return wxGetLoginCode();
  }
  if (isAlipay()) {
    return aliGetAuthCode();
  }
  // H5 下返回模拟 code
  return Promise.resolve('mock_code_h5_' + Date.now());
}

/** 获取用户基本信息 */
export function getUserProfile(): Promise<{ nickName: string; avatarUrl: string }> {
  if (isWechat()) {
    return wxGetUserProfile();
  }
  if (isAlipay()) {
    return aliGetUserInfo();
  }
  return Promise.resolve({ nickName: '用户', avatarUrl: '' });
}