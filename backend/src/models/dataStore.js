/**
 * 龟钮·印信 — 开源版数据存储
 * 轻量文件 JSON 存储，无需数据库依赖
 */

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
      this._save();
    }
  }

  _save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(Array.from(this.data.values()), null, 2), 'utf-8');
    } catch (e) {
      console.error(`[FileStore:${this.name}] 保存失败:`, e.message);
    }
  }

  get(id) { return this.data.get(id) || null; }
  set(id, value) { this.data.set(id, value); this._save(); return value; }
  getAll() { return Array.from(this.data.values()); }
  find(predicate) { return Array.from(this.data.values()).filter(predicate); }
  findOne(predicate) { return Array.from(this.data.values()).find(predicate); }
  delete(id) { const r = this.data.delete(id); if (r) this._save(); return r; }
  size() { return this.data.size; }
}

// 导出存储实例
const stores = {
  users: new FileStore('users'),
  payments: new FileStore('payments'),
  wallets: new FileStore('wallets'),
  agentPayments: new FileStore('agentPayments'),
};

module.exports = stores;