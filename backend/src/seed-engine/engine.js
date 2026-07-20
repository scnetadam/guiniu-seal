const fs = require('fs');
const path = require('path');
const { PROJECTS, ENGINE_CONFIG } = require('./config');
const { uploadAll, uploadByStream } = require('./cos');

function checkDataDir(dataDir) {
  if (!fs.existsSync(dataDir)) {
    return { exists: false, empty: true, fileCount: 0 };
  }
  const items = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
  return { exists: true, empty: items.length === 0, fileCount: items.length };
}

function shouldSeed(projectKey, force) {
  if (force) {
    return { shouldSeed: true, reason: '强制覆盖' };
  }

  const project = PROJECTS[projectKey];
  if (!project) {
    return { shouldSeed: false, reason: `未知项目: ${projectKey}` };
  }

  const status = checkDataDir(project.dataDir);

  if (!status.exists) {
    return { shouldSeed: true, reason: 'data 目录不存在，将自动创建' };
  }

  if (status.empty) {
    return { shouldSeed: true, reason: 'data 目录为空，将写入种子数据' };
  }

  if (ENGINE_CONFIG.requireConfirm) {
    return { shouldSeed: false, reason: `data 目录已有 ${status.fileCount} 个文件，需手动确认或使用 --force` };
  }

  return { shouldSeed: false, reason: `data 目录已有数据，跳过（SEED_CONFIRM=false）` };
}

function runProject(projectKey, options = {}) {
  const project = PROJECTS[projectKey];
  if (!project) {
    return { success: false, project: projectKey, written: false, files: [], error: `未知项目: ${projectKey}` };
  }

  const { shouldSeed: go, reason } = shouldSeed(projectKey, options.force);
  console.log(`[${project.name}] ${reason}`);

  if (!go) {
    return { success: true, project: project.name, written: false, files: [], reason };
  }

  if (!fs.existsSync(project.dataDir)) {
    fs.mkdirSync(project.dataDir, { recursive: true });
  }

  try {
    const preset = require(project.preset);
    const writtenFiles = [];

    for (const fileName of project.files) {
      const dataKey = fileName.replace('.json', '');
      const data = preset[dataKey];

      if (!data) {
        console.log(`  SKIP: ${fileName} (预设中无 ${dataKey} 数据)`);
        continue;
      }

      const filePath = path.join(project.dataDir, fileName);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      writtenFiles.push(fileName);
      console.log(`  OK: ${fileName} (${data.length} 条记录)`);
    }

    console.log(`[${project.name}] 写入完成: ${writtenFiles.length} 个文件`);
    return { success: true, project: project.name, written: true, files: writtenFiles };
  } catch (err) {
    console.error(`[${project.name}] 写入失败:`, err.message);
    return { success: false, project: project.name, written: false, files: [], error: err.message };
  }
}

function runAll(options = {}) {
  console.log('=== 龟钮 Seed Engine ===\n');

  const results = {};
  for (const key of Object.keys(PROJECTS)) {
    results[key] = runProject(key, options);
  }

  if (options.cos || ENGINE_CONFIG.cosOnSeed) {
    console.log('\n=== 上传 COS ===');
    uploadAll(PROJECTS, results).catch(err => {
      console.error('[COS] 上传失败:', err.message);
    });

    if (ENGINE_CONFIG.dataStreamSeparation) {
      console.log('\n=== 数据流分离上传 COS ===');
      uploadByStream(PROJECTS, results).catch(err => {
        console.error('[COS] 数据流上传失败:', err.message);
      });
    }
  }

  if (ENGINE_CONFIG.aiAutomation && options.ai !== false) {
    console.log('\n=== AI 自动化种子 ===');
    runAiAutomation(results);
  }

  console.log('\n=== 完成 ===');
  return results;
}

function runAiAutomation(results) {
  for (const [key, result] of Object.entries(results)) {
    if (!result.written) continue;
    const project = PROJECTS[key];
    console.log(`[AI] ${project.name}: 检查种子数据自动化权限...`);

    const autoSeedableFiles = project.files.filter(f => {
      const dataKey = f.replace('.json', '');
      const filePath = path.join(project.dataDir, f);
      if (!fs.existsSync(filePath)) return false;
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return Array.isArray(data) && data.length > 0;
      } catch { return false; }
    });

    console.log(`[AI] ${project.name}: ${autoSeedableFiles.length} 个文件可AI自动化处理`);

    if (autoSeedableFiles.length > 0) {
      console.log(`[AI] ${project.name}: 需要手动介入的条件检查:`);
      console.log(`  - KYC/CDD/AML合规验证需手动确认`);
      console.log(`  - 税务轨选择需用户指定`);
      console.log(`  - 资金授权需用户二次确认`);
    }
  }
}

function checkAll() {
  console.log('=== 龟钮 Seed Engine — 状态检查 ===\n');
  for (const [key, project] of Object.entries(PROJECTS)) {
    const status = checkDataDir(project.dataDir);
    console.log(`${project.name}:`);
    console.log(`  目录: ${project.dataDir}`);
    console.log(`  存在: ${status.exists ? '是' : '否'}`);
    console.log(`  数据文件: ${status.fileCount} 个`);
    if (project.dataStreams) {
      console.log(`  数据流:`);
      for (const [streamName, streamConfig] of Object.entries(project.dataStreams)) {
        console.log(`    ${streamName}: ${streamConfig.files.join(', ') || '无文件'} → COS: ${streamConfig.cosPrefix}`);
      }
    }
    if (status.exists && status.fileCount > 0) {
      const files = fs.readdirSync(project.dataDir).filter(f => f.endsWith('.json'));
      files.forEach(f => {
        const size = fs.statSync(path.join(project.dataDir, f)).size;
        console.log(`    ${f} (${size} bytes)`);
      });
    }
    console.log('');
  }
}

module.exports = { checkDataDir, shouldSeed, runProject, runAll, checkAll, runAiAutomation };
