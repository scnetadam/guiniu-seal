# 龟钮体系 — 同服务器部署指南

三项目共用一个服务器，Nginx 反向代理统一对外。

## 架构总览

```
                        ┌─────────────────────────────────┐
                        │          Nginx (443/80)          │
                        │    your-domain.com               │
                        └──────────┬──────────┬───────────┘
                                   │          │
              ┌────────────────────┘          └────────────────────┐
              ▼                                                    ▼
    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
    │ 龟钮·印信        │    │ 龟钮·印证        │    │ 龟钮·印鉴        │
    │ X402 支付        │    │ 数据存证集市      │    │ 汽车 AI 智能体    │
    │ Port 3000        │    │ Port 3001        │    │ Port 80 (AI 主体)│
    │ API: /api/x402/  │    │ API: /api/verify/│    │ API: /api/deveco/│
    └─────────────────┘    └─────────────────┘    └─────────────────┘
                                                          │
                                                    ┌─────┴──────┐
                                                    │  GLM 大模型 │
                                                    │  (AI 能力)  │
                                                    └────────────┘
```

## AI 调用链路

```
印信/印证前端 → Nginx → 印鉴后端 AI 路由 → GLM API
         ↑                              ↑
         └── 内网 localhost:80 ──────────┘
```

印信和印证的 AI 代理通过 `AI_SERVICE_URL=http://localhost:80` 内网直连印鉴，不走 Nginx。

## 端口规划

| 项目 | 后端端口 | Nginx 路径 | 说明 |
|------|---------|-----------|------|
| 龟钮·印信 (X402) | 3000 | `/api/x402/` | 开源支付协议 |
| 龟钮·印证 (GUINIU) | 3001 | `/api/verify/` | 数据存证集市 |
| 龟钮·印鉴 (DEVECO) | 80 | `/api/deveco/` | AI 主体，内网调用用 localhost:80 |

## 部署步骤

### 1. 安装依赖

```bash
# 龟钮·印信 (X402)
cd /root/x402/backend/backend && npm install

# 龟钮·印证 (GUINIU)
cd /root/guiniu-verify/backend && npm install

# 龟钮·印鉴 (DEVECO)
cd /root/x402-deveco && npm install
```

### 2. 配置环境变量

```bash
# 印信后端
cp /root/x402/backend/backend/.env.example /root/x402/backend/backend/.env
# 编辑 .env，将 HTTP_PORT 改为 3000

# 印证后端
cp /root/guiniu-verify/backend/.env.example /root/guiniu-verify/backend/.env
# AI_SERVICE_URL 已默认为 http://localhost:80

# 印鉴后端
# .env 中 HTTP_PORT=80 保持不变
```

### 3. 配置 Nginx

```bash
cp deploy/nginx-guiniu.conf /etc/nginx/conf.d/guiniu.conf
# 编辑 your-domain.com 为实际域名
# 配置 SSL 证书路径
nginx -t && systemctl reload nginx
```

### 4. 启动顺序

```bash
# 1. 先启动印鉴（AI 主体）
cd /root/x402-deveco && node src/index.js &

# 2. 再启动印信和印证（AI 代理依赖印鉴）
cd /root/x402/backend/backend && node src/index.js &
cd /root/guiniu-verify/backend && node src/index.js &

# 3. 重启 Nginx
systemctl reload nginx
```

### 5. 验证

```bash
# 健康检查
curl https://your-domain.com/health

# 印鉴 AI
curl https://your-domain.com/api/deveco/ai/health

# 印信 AI
curl https://your-domain.com/api/x402/api/ai/health

# 印证 AI
curl https://your-domain.com/api/verify/api/ai/health
```

> 注意：Nginx 路径 `/api/x402/` 会转发到印信后端的 `/`，所以前端实际请求路径是 `/api/x402/api/ai/chat`。

## 前端构建配置

### 龟钮·印信 (X402)

编辑 `x402-frontend/src/api/index.ts`：
```typescript
const BASE_URL = import.meta.env.VITE_API_BASE || '/api/x402/api';
```

构建时：
```bash
cd x402-frontend
VITE_API_BASE=/api/x402/api npm run build
```

### 龟钮·印证 (GUINIU)

编辑 `frontend/src/api/index.ts`：
```typescript
const BASE_URL = import.meta.env.VITE_API_BASE || '/api/verify/api';
```

### 龟钮·印鉴 (DEVECO)

编辑 `frontend/src/api/index.ts`：
```typescript
const BASE_URL = '/api/deveco/api';
```

## 生产建议

1. **进程管理**：使用 PM2 管理三项目进程
   ```bash
   npm install -g pm2
   pm2 start /root/x402-deveco/src/index.js --name guiniu-deveco
   pm2 start /root/x402/backend/backend/src/index.js --name guiniu-seal
   pm2 start /root/guiniu-verify/backend/src/index.js --name guiniu-verify
   pm2 save
   ```

2. **日志**：PM2 日志自动轮转，或配 systemd

3. **SSL**：使用 acme.sh / certbot 自动续期

4. **防火墙**：只开放 80/443，后端端口 3000/3001/80 只监听 127.0.0.1