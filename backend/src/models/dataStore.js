const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class FileStore {
  constructor(name, seedData = []) {
    this.name = name;
    this.filePath = path.join(DATA_DIR, `${name}.json`);
    this.data = new Map();
    this._writeQueue = Promise.resolve();
    this._version = 0;
    this._load(seedData);
  }

  _load(seedData) {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(item => this.data.set(item.id, item));
        }
      }
    } catch (e) {
      console.error(`[FileStore:${this.name}] 加载失败:`, e.message);
    }

    if (this.data.size === 0 && seedData.length > 0) {
      seedData.forEach(item => this.data.set(item.id, { ...item }));
      this._enqueueSave();
    }
  }

  _enqueueSave() {
    this._writeQueue = this._writeQueue.then(() => {
      return new Promise((resolve) => {
        try {
          const payload = JSON.stringify(Array.from(this.data.values()), null, 2);
          fs.writeFileSync(this.filePath, payload, 'utf-8');
        } catch (e) {
          console.error(`[FileStore:${this.name}] 保存失败:`, e.message);
        }
        resolve();
      });
    });
    return this._writeQueue;
  }

  get(id) { return this.data.get(id) || null; }

  set(id, value) {
    this.data.set(id, value);
    this._version++;
    this._enqueueSave();
    return value;
  }

  getAll() { return Array.from(this.data.values()); }
  find(predicate) { return Array.from(this.data.values()).filter(predicate); }
  findOne(predicate) { return Array.from(this.data.values()).find(predicate); }

  delete(id) {
    const r = this.data.delete(id);
    if (r) {
      this._version++;
      this._enqueueSave();
    }
    return r;
  }

  size() { return this.data.size; }

  getVersion() { return this._version; }

  compareAndSwap(id, expectedVersion, updater) {
    const current = this.data.get(id);
    if (!current) return { success: false, error: 'not_found' };
    if ((current._v || 0) !== expectedVersion) {
      return { success: false, error: 'version_conflict', currentVersion: current._v || 0 };
    }
    const updated = updater(current);
    if (!updated) return { success: false, error: 'update_rejected' };
    updated._v = expectedVersion + 1;
    this.data.set(id, updated);
    this._version++;
    this._enqueueSave();
    return { success: true, data: updated, newVersion: updated._v };
  }

  withLock(id, fn) {
    const current = this.data.get(id);
    if (!current) return { success: false, error: 'not_found' };
    const vBefore = current._v || 0;
    const result = fn(current);
    if (result === false) return { success: false, error: 'operation_rejected' };
    const updated = result || current;
    updated._v = vBefore + 1;
    this.data.set(id, updated);
    this._version++;
    this._enqueueSave();
    return { success: true, data: updated, newVersion: updated._v };
  }
}

class IdempotencyStore {
  constructor() {
    this._keys = new Map();
    this._results = new Map();
  }

  check(key) {
    if (this._keys.has(key)) {
      return { isDuplicate: true, result: this._results.get(key) || null };
    }
    this._keys.set(key, { status: 'processing', createdAt: new Date().toISOString() });
    return { isDuplicate: false };
  }

  complete(key, result) {
    this._keys.set(key, { status: 'completed', completedAt: new Date().toISOString() });
    this._results.set(key, result);
  }

  fail(key, error) {
    this._keys.set(key, { status: 'failed', error: String(error), failedAt: new Date().toISOString() });
  }

  getResult(key) {
    return this._results.get(key) || null;
  }

  has(key) {
    return this._keys.has(key);
  }

  stats() {
    const all = Array.from(this._keys.values());
    return {
      total: all.length,
      byStatus: all.reduce((a, k) => { a[k.status] = (a[k.status] || 0) + 1; return a; }, {}),
    };
  }
}

const stores = {
  users: new FileStore('users'),
  payments: new FileStore('payments'),
  wallets: new FileStore('wallets'),
  agentPayments: new FileStore('agentPayments'),
  gitRepoTracker: new FileStore('gitRepoTracker'),
  gitContributor: new FileStore('gitContributor'),
  gitWeightedSettle: new FileStore('gitWeightedSettle'),
  dataLock: new FileStore('dataLock'),
  notification: new FileStore('notification'),
  notificationTemplate: new FileStore('notificationTemplate'),
  userNotificationPref: new FileStore('userNotificationPref'),
  opRegistry: new FileStore('opRegistry'),
  deadLetterOps: new FileStore('deadLetterOps'),
  taxRecords: new FileStore('taxRecords'),
};

const idempotency = new IdempotencyStore();

module.exports = { ...stores, idempotency };
