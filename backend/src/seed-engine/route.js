// 龟钮 Seed Engine — API 路由
// /api/seed/*

const express = require('express');
const router = express.Router();
const { checkAll, runAll, runProject } = require('./engine');

// GET /api/seed/status — 三项目数据状态
router.get('/status', (req, res) => {
  try {
    const { checkDataDir } = require('./engine');
    const { PROJECTS } = require('./config');
    const status = {};
    for (const [key, project] of Object.entries(PROJECTS)) {
      status[key] = { name: project.name, ...checkDataDir(project.dataDir) };
    }
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/seed/run — 写入种子数据
router.post('/run', (req, res) => {
  const { project, force } = req.body;
  try {
    let result;
    if (project) {
      result = runProject(project, { force: !!force });
    } else {
      result = runAll({ force: !!force, cos: false });
    }
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;