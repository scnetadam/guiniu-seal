const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const PROJECTS = {
  seal: {
    name: '龟钮·印信',
    dir: ROOT,
    dataDir: path.join(ROOT, 'data'),
    files: ['users.json', 'wallets.json', 'payments.json', 'contracts.json', 'transactions.json', 'opRegistry.json', 'deadLetterOps.json', 'taxRecords.json'],
    preset: './presets/seal',
    dataStreams: {
      orderFlow: { files: ['payments.json', 'contracts.json', 'transactions.json'], cosPrefix: 'order-flow' },
      fundFlow: { files: ['wallets.json'], cosPrefix: 'fund-flow' },
      taxFlow: { files: ['taxRecords.json'], cosPrefix: 'tax-flow' },
      notaryFlow: { files: ['opRegistry.json', 'deadLetterOps.json'], cosPrefix: 'notary-flow' },
    },
  },
  verify: {
    name: '龟钮·印证',
    dir: path.resolve('D:\\X402-GUINIU\\backend'),
    dataDir: path.resolve('D:\\X402-GUINIU\\backend\\data'),
    files: ['dataProducts.json', 'kolWeights.json', 'notaryRecords.json', 'governanceRecords.json', 'dataConsentRecords.json', 'earningsRecords.json'],
    preset: './presets/verify',
    dataStreams: {
      orderFlow: { files: ['dataProducts.json'], cosPrefix: 'order-flow' },
      fundFlow: { files: ['earningsRecords.json'], cosPrefix: 'fund-flow' },
      taxFlow: { files: [], cosPrefix: 'tax-flow' },
      notaryFlow: { files: ['notaryRecords.json', 'governanceRecords.json'], cosPrefix: 'notary-flow' },
    },
  },
  deveco: {
    name: '龟钮·自驭',
    dir: path.resolve('D:\\X402-DEVECO\\backend'),
    dataDir: path.resolve('D:\\X402-DEVECO\\data'),
    files: ['agents.json', 'contents.json', 'tasks.json', 'weightRecords.json'],
    preset: './presets/deveco',
    dataStreams: {
      orderFlow: { files: ['tasks.json'], cosPrefix: 'order-flow' },
      fundFlow: { files: ['weightRecords.json'], cosPrefix: 'fund-flow' },
      taxFlow: { files: [], cosPrefix: 'tax-flow' },
      notaryFlow: { files: [], cosPrefix: 'notary-flow' },
    },
  },
};

const COS_CONFIG = {
  enabled: process.env.COS_ENABLED === 'true' || false,
  secretId: process.env.COS_SECRET_ID || '',
  secretKey: process.env.COS_SECRET_KEY || '',
  region: process.env.COS_REGION || 'ap-guangzhou',
  bucket: process.env.COS_BUCKET || 'x402-1454137396',
  prefix: process.env.COS_PREFIX || 'seed-engine',
};

const ENGINE_CONFIG = {
  autoSeedOnStartup: process.env.AUTO_SEED === 'true' || false,
  cosOnSeed: process.env.COS_ON_SEED === 'true' || false,
  requireConfirm: process.env.SEED_CONFIRM !== 'false',
  aiAutomation: process.env.AI_AUTOMATION === 'true' || false,
  dataStreamSeparation: process.env.DATA_STREAM_SEPARATION !== 'false',
};

module.exports = { PROJECTS, COS_CONFIG, ENGINE_CONFIG, ROOT };
