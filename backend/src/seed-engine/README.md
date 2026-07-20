# 龟钮 Seed Engine — 模块化数据种子引擎

龟钮三项目（印信/印证/自驭）的种子数据管理模块，支持：
- 自动检测 data/ 目录状态，按权限策略决定是否写入
- 数据流写入本地 + 同步上传 COS 备份
- 命令行一键写入，也可作为模块被应用启动时引用

## 目录结构

```
seed-engine/
├── engine.js          # 核心引擎：检测、写入、权限控制
├── cos.js             # COS 上传模块（腾讯云对象存储）
├── config.js          # 配置：项目路径、数据目录映射、COS 凭证
├── presets/           # 预设数据模板
│   ├── seal.js        # 印信种子数据
│   ├── verify.js      # 印证种子数据
│   └── deveco.js      # 自驭种子数据
├── cli.js             # CLI 入口：命令行一键操作
└── README.md          # 本文件
```

## 使用方式

### 命令行

```bash
# 写入所有项目（自动检测，空目录自动写入，非空询问）
node src/seed-engine/cli.js

# 写入指定项目
node src/seed-engine/cli.js --project=seal
node src/seed-engine/cli.js --project=verify
node src/seed-engine/cli.js --project=deveco

# 强制覆盖（跳过检测）
node src/seed-engine/cli.js --force

# 仅上传 COS（不写入本地）
node src/seed-engine/cli.js --cos-only

# 仅检测状态
node src/seed-engine/cli.js --check
```

### 作为模块引用

```js
const { seedEngine } = require('./seed-engine/engine');

// 启动时自动检测
if (seedEngine.shouldAutoSeed()) {
  seedEngine.runAll({ force: false });
}

// 或手动写入 + COS 上传
const result = seedEngine.runProject('seal', { force: true });
seedEngine.uploadToCos(result);
```

## 权限策略

| 状态 | 行为 |
|------|------|
| data/ 目录不存在 | 自动创建并写入种子数据 |
| data/ 目录为空 | 自动写入种子数据 |
| data/ 目录有数据 | 询问确认（CLI 模式）或跳过（模块模式） |
| `--force` 参数 | 跳过所有检测，直接覆盖 |

## 数据流

```
CLI 触发 / 应用启动
        │
        ▼
  检测 data/ 目录状态
        │
        ├── 空/不存在 → 写入种子数据
        ├── 有数据 → 询问/跳过
        └── --force → 直接覆盖
        │
        ▼
  写入本地 JSON 文件
        │
        ▼
  上传 COS 备份（可选，--cos 或配置开启）
        │
        ▼
  返回结果报告
```