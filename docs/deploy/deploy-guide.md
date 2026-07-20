# 部署指南 — 龟钮·印信

> 适用：本地开发 / 腾讯云 CVM / Nginx 反代
> 版本：v1.0 | 2026-07-20

---

## 1. 环境要求

| 组件 | 版本 |
|------|------|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| 数据库 | 文件 JSON（无需外部 DB） |
| 对象存储 | 腾讯云 COS（可选，用于种子备份） |

---

## 2. 本地启动

```bash
# 后端
cd backend/backend
npm install
cp .env.example .env
npm start              # 默认端口 80

# 前端（uni-app）
cd x402-frontend/src
npm install
npm run dev            # HBuilderX 或 CLI
```

---

## 3. 种子数据初始化

```bash
# 写入所有项目（自动检测，空目录自动写入）
node src/seed-engine/cli.js --force

# 仅检查状态
node src/seed-engine/cli.js --check

# 仅上传 COS（不写本地）
node src/seed-engine/cli.js --cos-only
```

### 权限策略

| 状态 | 行为 |
|------|------|
| data/ 不存在 | 自动创建并写入 |
| data/ 为空 | 自动写入 |
| data/ 有数据 | 跳过（需 `--force`） |

### 环境变量

```bash
COS_ENABLED=true          # 开启 COS 上传
COS_SECRET_ID=xxx         # 腾讯云 SecretId
COS_SECRET_KEY=xxx        # 腾讯云 SecretKey
COS_REGION=ap-guangzhou
COS_BUCKET=x402-1454137396
COS_PREFIX=seed-engine
AUTO_SEED=true            # 应用启动时自动种子
COS_ON_SEED=true          # 写入后自动上传 COS
```

---

## 4. CVM 部署（腾讯云）

实例：`ins-befbzysg`
- 公网：`159.75.17.54`
- 内网：`172.16.0.13`

### Nginx 配置

```nginx
server {
    listen 80;
    server_name x402.chinaauto.ccwu.cc;

    location /api/x402/ {
        proxy_pass http://localhost:3000/;
    }
    location /api/verify/ {
        proxy_pass http://localhost:3001/;
    }
    location /api/deveco/ {
        proxy_pass http://localhost:80/;
    }
}
```

### PM2 管理

```bash
pm2 start ecosystem.config.js
pm2 logs guiniu-seal
```

---

## 5. 端口规划

| 项目 | 端口 | 说明 |
|------|------|------|
| 印信 (Seal) | 3000 | 支付网关 |
| 印证 (Verify) | 3001 | 数据存证 |
| 自驭 (Deveco) | 80 | AI 枢纽 |

---

## 6. 域名映射

| 域名 | 指向 |
|------|------|
| x402.chinaauto.ccwu.cc | 印信 API |
| verify.chinaauto.ccwu.cc | 印证 API |
| deveco.chinaauto.ccwu.cc | 自驭 AI |

---

## 7. 故障排查

| 症状 | 原因 | 解决 |
|------|------|------|
| 404 on /api/settle/* | 路由未注册 | 检查 index.js 中 `app.use('/api/settle', settleRoutes)` |
| 存证验证失败 | 数据被篡改 | 检查 evidenceRecords 是否被手动修改 |
| 税务计算异常 | kolTrack 未传 | 确认请求体包含 `kolTrack: 'A'|'B'|'C'` |
| COS 上传失败 | 凭证缺失 | 设置 `COS_SECRET_ID` / `COS_SECRET_KEY` |

---

*部署问题请联系运维或查看 CVM 控制台。*