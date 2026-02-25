/**
 * 文档结构合规性测试执行脚本
 * 用法: node docs/tests/scripts/run-structure-tests.js
 * 
 * 本脚本用于验证项目文档的结构合规性，包括：
 * - 元信息完整性（版本号、日期、优先级、阅读时间）
 * - 章节结构规范性（文档简介、目录、变更日志）
 * - 文档索引一致性
 * - 交叉引用有效性（死链检测）
 * 
 * 自动扫描 docs/ 目录下所有 .md 文件（排除 tests/ 目录）
 */

const fs = require('fs');
const path = require('path');

// 获取目录路径
const scriptsDir = __dirname;
const testsDir = path.dirname(scriptsDir);
const dataDir = path.join(testsDir, 'data');
const reportsDir = path.join(testsDir, 'reports');
const docsDir = path.join(process.cwd(), 'docs');

// 确保报告目录存在
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// 加载测试配置
const testConfig = JSON.parse(
  fs.readFileSync(path.join(dataDir, 'structure-tests.json'), 'utf-8')
);

// 自动扫描 docs 目录下的所有 .md 文件（排除 tests 目录）
function scanDocsDirectory(dir, excludeDir, fileList = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    // 排除 tests 目录
    if (stat.isDirectory()) {
      if (item !== excludeDir) {
        scanDocsDirectory(fullPath, excludeDir, fileList);
      }
    } else if (item.endsWith('.md')) {
      // 转换为相对路径
      const relativePath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
      fileList.push(relativePath);
    }
  }
  
  return fileList;
}

// 获取所有文档文件
const allDocFiles = scanDocsDirectory(docsDir, 'tests');
console.log(`\n📁 扫描到 ${allDocFiles.length} 个文档文件:`);
allDocFiles.forEach(file => console.log(`   - ${file}`));
console.log('');

const results = {
  testSuite: testConfig.testSuite,
  timestamp: new Date().toISOString(),
  summary: {
    total: 0,
    passed: 0,
    failed: 0
  },
  details: []
};

// 测试执行函数
function runTests() {
  console.log(`\n========== ${testConfig.testSuite} ==========\n`);
  
  testConfig.testCases.forEach(testCase => {
    console.log(`\n--- ${testCase.id}: ${testCase.name} ---`);
    
    switch (testCase.type) {
      case 'metadata':
        runMetadataTest(testCase, allDocFiles);
        break;
      case 'structure':
        runStructureTest(testCase, allDocFiles);
        break;
      case 'index':
        runIndexTest(testCase);
        break;
      case 'links':
        runLinksTest(testCase, allDocFiles);
        break;
    }
  });
  
  // 输出汇总
  console.log('\n========== 测试结果汇总 ==========');
  console.log(`总测试数: ${results.summary.total}`);
  console.log(`通过: ${results.summary.passed}`);
  console.log(`失败: ${results.summary.failed}`);
  console.log(`通过率: ${((results.summary.passed / results.summary.total) * 100).toFixed(2)}%`);
  
  // 保存结果到 reports 目录
  const resultPath = path.join(reportsDir, 'structure-test-results.json');
  fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
  console.log(`\n详细结果已保存: ${resultPath}`);
  
  // 返回测试结果状态（用于自动化流程）
  return results.summary.failed === 0;
}

// 元信息完整性测试
function runMetadataTest(testCase, targetFiles) {
  targetFiles.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      recordResult(testCase.id, filePath, false, '文件不存在');
      return;
    }
    
    const content = fs.readFileSync(fullPath, 'utf-8');
    let allPassed = true;
    const errors = [];
    
    testCase.validationRules.forEach(rule => {
      const regex = new RegExp(rule.pattern);
      if (!regex.test(content)) {
        allPassed = false;
        errors.push(`缺少或格式错误: ${rule.field} (${rule.description})`);
      }
    });
    
    recordResult(testCase.id, filePath, allPassed, errors.join('; ') || '元信息完整');
  });
}

// 章节结构规范性测试
function runStructureTest(testCase, targetFiles) {
  targetFiles.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      recordResult(testCase.id, filePath, false, '文件不存在');
      return;
    }
    
    const content = fs.readFileSync(fullPath, 'utf-8');
    let allPassed = true;
    const errors = [];
    
    testCase.requiredSections.forEach(section => {
      if (!content.includes(section.pattern)) {
        allPassed = false;
        errors.push(`缺少必需章节: ${section.name}`);
      }
    });
    
    recordResult(testCase.id, filePath, allPassed, errors.join('; ') || '章节结构规范');
  });
}

// 从 project_rules.md 中提取文档索引列表
function extractIndexedDocuments(content) {
  const indexedDocs = [];
  // 匹配文档清单表格中的行
  // 格式: | 序号 | `docs/...` | 内容简介 | 优先级 | 阅读时间 |
  const tableRowRegex = /\|\s*(\d+)\s*\|\s*`([^`]+)`\s*\|[^|]+\|\s*(P\d)\s*\|[^|]+\|/g;
  
  let match;
  while ((match = tableRowRegex.exec(content)) !== null) {
    indexedDocs.push({
      id: parseInt(match[1], 10),
      path: match[2],
      priority: match[3]
    });
  }
  
  return indexedDocs;
}

// 文档索引一致性测试
function runIndexTest(testCase) {
  const sourcePath = path.join(process.cwd(), testCase.sourceFile);
  
  if (!fs.existsSync(sourcePath)) {
    recordResult(testCase.id, testCase.sourceFile, false, '源文件不存在');
    return;
  }
  
  const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
  
  // 从 project_rules.md 中动态提取文档索引
  const indexedDocuments = extractIndexedDocuments(sourceContent);
  
  if (indexedDocuments.length === 0) {
    recordResult(testCase.id, '文档索引一致性', false, '未能从 project_rules.md 中提取到文档索引');
    return;
  }
  
  let allPassed = true;
  const errors = [];
  const warnings = [];
  
  // 检查 project_rules.md 中列出的文档是否都存在
  indexedDocuments.forEach(doc => {
    const docPath = path.join(process.cwd(), doc.path);
    
    if (!fs.existsSync(docPath)) {
      allPassed = false;
      errors.push(`索引文档不存在: ${doc.path}`);
    }
  });
  
  // 检查扫描到的文档是否都在索引中
  const indexedPaths = new Set(indexedDocuments.map(d => d.path));
  const unindexedDocs = allDocFiles.filter(file => 
    file.startsWith('docs/') && !indexedPaths.has(file) && !file.includes('/tests/')
  );
  
  if (unindexedDocs.length > 0) {
    allPassed = false;
    unindexedDocs.forEach(doc => {
      errors.push(`实际文档未被索引: ${doc}`);
    });
  }
  
  // 检查是否有索引了但实际不存在的文档
  const actualDocPaths = new Set(allDocFiles.filter(file => 
    file.startsWith('docs/') && !file.includes('/tests/')
  ));
  const ghostDocs = indexedDocuments.filter(doc => !actualDocPaths.has(doc.path));
  
  if (ghostDocs.length > 0) {
    allPassed = false;
    ghostDocs.forEach(doc => {
      errors.push(`索引指向不存在的文档: ${doc.path}`);
    });
  }
  
  // 检查序号连续性
  const ids = indexedDocuments.map(d => d.id).sort((a, b) => a - b);
  for (let i = 0; i < ids.length; i++) {
    if (ids[i] !== i + 1) {
      allPassed = false;
      errors.push(`文档序号不连续: 期望${i + 1}, 实际${ids[i]}`);
      break;
    }
  }
  
  const message = errors.length > 0 
    ? errors.join('; ')
    : `共${indexedDocuments.length}个文档，索引与实际完全一致`;
  
  recordResult(testCase.id, '文档索引一致性', allPassed, message);
}

// 交叉引用有效性测试
function runLinksTest(testCase, targetFiles) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  
  // 包含 project_rules.md 和所有扫描到的文档
  const allTargetFiles = [testCase.sourceFile || '.trae/rules/project_rules.md', ...targetFiles];
  
  allTargetFiles.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      recordResult(testCase.id, filePath, false, '文件不存在');
      return;
    }
    
    const content = fs.readFileSync(fullPath, 'utf-8');
    const links = [];
    let match;
    
    while ((match = linkRegex.exec(content)) !== null) {
      const linkText = match[1];
      const linkUrl = match[2];
      
      // 排除外部链接和锚点
      if (!/^https?:\/\//.test(linkUrl) && !/^#/.test(linkUrl)) {
        links.push({ text: linkText, url: linkUrl });
      }
    }
    
    let allPassed = true;
    const errors = [];
    
    links.forEach(link => {
      // 解析相对路径
      const baseDir = path.dirname(fullPath);
      const resolvedPath = path.resolve(baseDir, link.url.split('#')[0]);
      
      if (!fs.existsSync(resolvedPath)) {
        allPassed = false;
        errors.push(`死链: [${link.text}](${link.url})`);
      }
    });
    
    recordResult(testCase.id, filePath, allPassed, errors.join('; ') || `检查${links.length}个链接，全部有效`);
  });
}

// 记录测试结果
function recordResult(testId, target, passed, message) {
  results.summary.total++;
  if (passed) {
    results.summary.passed++;
  } else {
    results.summary.failed++;
  }
  
  const result = {
    testId,
    target,
    passed,
    message
  };
  
  results.details.push(result);
  
  const status = passed ? '✅ 通过' : '❌ 失败';
  console.log(`${status} - ${target}: ${message || ''}`);
}

// 执行测试
const success = runTests();
process.exit(success ? 0 : 1);
