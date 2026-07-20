# 快速开始

## 1. 克隆项目

```bash
git clone https://github.com/scnetadam/guiniu-seal.git
cd guiniu-seal
```

## 2. 启动开发

```bash
# 后端
cd backend/backend
cp .env.example .env
npm install
npm start

# 前端
cd x402-frontend
npm install
npm run dev
```

## 3. 访问入口

- 首页：`/pages/home/index`
- 统一结算：`/pages/checkout/index`
- API 测试台：`/pages/api-test/index`
- 关于我们：`/pages/about/index`

## 4. 常见 API

```bash
# 健康检查
curl http://localhost:80/api/test/status

# 结算下单
curl -X POST http://localhost:80/api/settle/checkout \
  -H "Content-Type: application/json" \
  -d '{"channel":"alipay","totalAmount":100,"subject":"测试"}'

# 税务计算
curl -X POST http://localhost:80/api/settle/tax/calculate \
  -H "Content-Type: application/json" \
  -d '{"amount":10000,"track":"B"}'

# 存证查询
curl http://localhost:80/api/settle/evidence/stats
```

## 5. 本地调试说明

- 前端：HBuilderX 打开 `x402-frontend` 项目
- 后端：VSCode 调试 `backend/backend/src/index.js`
- 数据库：JSON 文件持久化，无需额外安装
- 上传 COS：设置环境变量 `COS_ENABLED=true`

---

*开发期间若遇到问题，请查阅 `docs/` 目录完整文档。*