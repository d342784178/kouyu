/**
 * 文档质量验证统一入口脚本
 * 用法: node docs/tests/scripts/run-all-tests.js [--structure] [--content] [--report]
 * 
 * 本脚本用于统一执行所有文档质量验证测试，包括：
 * - 结构合规性测试（元信息、章节、索引、链接）
 * - 内容有效性测试（约束理解、文档定位、维护规范、工具调用）
 * 
 * 自动化验证机制：
 * - 每次 project_rules.md 更新后必须运行此脚本
 * - 测试通过后方可提交文档更新
 * - 测试报告将自动保存到 docs/tests/reports/ 目录
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 获取目录路径
const scriptsDir = __dirname;
const testsDir = path.dirname(scriptsDir);
const reportsDir = path.join(testsDir, 'reports');

// 确保报告目录存在
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// 解析命令行参数
const args = process.argv.slice(2);
const runStructure = args.includes('--structure') || args.length === 0;
const runContent = args.includes('--content') || args.length === 0;
const generateReport = args.includes('--report') || args.length === 0;

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

console.log(`${colors.bright}${colors.cyan}\n========================================`);
console.log('      文档质量验证测试套件');
console.log(`========================================${colors.reset}\n`);

const startTime = Date.now();
let structureSuccess = true;
let contentSuccess = true;

// 执行结构测试
if (runStructure) {
  console.log(`${colors.bright}>>> 执行结构合规性测试...${colors.reset}\n`);
  try {
    execSync('node docs/tests/scripts/run-structure-tests.js', {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    console.log(`\n${colors.green}✅ 结构合规性测试通过${colors.reset}\n`);
  } catch (error) {
    console.log(`\n${colors.red}❌ 结构合规性测试失败${colors.reset}\n`);
    structureSuccess = false;
  }
}

// 执行内容测试
if (runContent) {
  console.log(`${colors.bright}>>> 执行内容有效性测试...${colors.reset}\n`);
  try {
    execSync('node docs/tests/scripts/run-content-tests-llm.js', {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    console.log(`\n${colors.green}✅ 内容有效性测试通过${colors.reset}\n`);
  } catch (error) {
    console.log(`\n${colors.red}❌ 内容有效性测试失败${colors.reset}\n`);
    contentSuccess = false;
  }
}

// 生成综合报告
if (generateReport) {
  console.log(`${colors.bright}>>> 生成综合测试报告...${colors.reset}\n`);
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  // 读取测试结果
  let structureResults = null;
  let contentResults = null;
  
  try {
    const structurePath = path.join(reportsDir, 'structure-test-results.json');
    if (fs.existsSync(structurePath)) {
      structureResults = JSON.parse(fs.readFileSync(structurePath, 'utf-8'));
    }
  } catch (e) {
    console.log(`${colors.yellow}⚠️ 无法读取结构测试结果${colors.reset}`);
  }
  
  try {
    const contentPath = path.join(reportsDir, 'content-test-results-llm.json');
    if (fs.existsSync(contentPath)) {
      contentResults = JSON.parse(fs.readFileSync(contentPath, 'utf-8'));
    }
  } catch (e) {
    console.log(`${colors.yellow}⚠️ 无法读取内容测试结果${colors.reset}`);
  }
  
  // 生成质量状态标记
  const qualityBadge = structureSuccess && contentSuccess
    ? { text: 'PASSED', color: colors.green }
    : { text: 'FAILED', color: colors.red };
  
  // 生成报告
  const report = {
    timestamp: new Date().toISOString(),
    duration: `${duration}s`,
    overallStatus: structureSuccess && contentSuccess ? 'PASSED' : 'FAILED',
    qualityBadge: qualityBadge.text,
    summary: {
      structure: structureResults ? {
        total: structureResults.summary.total,
        passed: structureResults.summary.passed,
        failed: structureResults.summary.failed,
        passRate: `${((structureResults.summary.passed / structureResults.summary.total) * 100).toFixed(2)}%`,
        status: structureSuccess ? 'PASSED' : 'FAILED'
      } : null,
      content: contentResults ? {
        total: contentResults.summary.total,
        passed: contentResults.summary.passed,
        failed: contentResults.summary.failed,
        passRate: `${((contentResults.summary.passed / contentResults.summary.total) * 100).toFixed(2)}%`,
        scoreRate: contentResults.summary.totalScore > 0 
          ? `${((contentResults.summary.earnedScore / contentResults.summary.totalScore) * 100).toFixed(2)}%`
          : 'N/A',
        status: contentSuccess ? 'PASSED' : 'FAILED'
      } : null
    },
    verificationPassed: structureSuccess && contentSuccess
  };
  
  // 保存报告到 reports 目录
  const reportPath = path.join(reportsDir, 'doc-quality-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // 输出摘要
  console.log(`${colors.bright}========================================`);
  console.log('          测试执行摘要');
  console.log(`========================================${colors.reset}`);
  console.log(`执行时间: ${duration}s`);
  console.log(`质量状态: ${qualityBadge.color}${qualityBadge.text}${colors.reset}\n`);
  
  if (report.summary.structure) {
    console.log(`${colors.bright}结构合规性测试:${colors.reset}`);
    console.log(`  总测试数: ${report.summary.structure.total}`);
    console.log(`  通过: ${colors.green}${report.summary.structure.passed}${colors.reset}`);
    console.log(`  失败: ${structureSuccess ? colors.green : colors.red}${report.summary.structure.failed}${colors.reset}`);
    console.log(`  通过率: ${report.summary.structure.passRate}\n`);
  }
  
  if (report.summary.content) {
    console.log(`${colors.bright}内容有效性测试:${colors.reset}`);
    console.log(`  总测试数: ${report.summary.content.total}`);
    console.log(`  通过: ${colors.green}${report.summary.content.passed}${colors.reset}`);
    console.log(`  失败: ${contentSuccess ? colors.green : colors.red}${report.summary.content.failed}${colors.reset}`);
    console.log(`  通过率: ${report.summary.content.passRate}`);
    console.log(`  得分率: ${report.summary.content.scoreRate}\n`);
  }
  
  console.log(`${colors.bright}========================================${colors.reset}\n`);
  
  if (report.verificationPassed) {
    console.log(`${colors.green}✅ 文档质量验证通过，可以提交更新${colors.reset}\n`);
  } else {
    console.log(`${colors.red}❌ 文档质量验证失败，请修复问题后重新测试${colors.reset}\n`);
    console.log(`${colors.yellow}提示: 查看 docs/tests/reports/*-test-results.json 了解详细错误信息${colors.reset}\n`);
  }
  
  console.log(`详细报告已保存: ${reportPath}\n`);
}

// 退出码
process.exit(structureSuccess && contentSuccess ? 0 : 1);
