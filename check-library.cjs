#!/usr/bin/env node
'use strict';

// 校验生成后的题库 JSON；不修改任何文件。
const fs = require('node:fs');
const path = require('node:path');

const input = process.argv[2] || path.join(__dirname, '..', 'library.json');
const requiredSections = ['problem', 'hint', 'framework', 'solution', 'reflection'];
const requiredRatings = ['difficulty', 'importance', 'exam_probability'];
const issues = [];

let library;
try {
  library = JSON.parse(fs.readFileSync(input, 'utf8'));
} catch (error) {
  console.error('无法读取或解析题库:', input);
  console.error(error.message);
  process.exit(1);
}

if (!Array.isArray(library.questions) || !library.questions.length) {
  issues.push('questions 不是非空数组');
}

const ids = new Set();
for (const [index, question] of (library.questions || []).entries()) {
  const label = question?.id || `第 ${index + 1} 道题`;
  if (!question || typeof question !== 'object') {
    issues.push(`${label}: 不是对象`);
    continue;
  }
  if (ids.has(question.id)) issues.push(`${label}: ID 重复`);
  ids.add(question.id);
  for (const key of ['id', 'week', 'question_number', 'title', 'source_pages']) {
    if (question[key] === undefined || question[key] === null || String(question[key]).trim() === '') {
      issues.push(`${label}: 缺少 ${key}`);
    }
  }
  if (!Array.isArray(question.knowledge) || question.knowledge.length === 0 || question.knowledge.some(item => String(item).split('/').length !== 3)) {
    issues.push(`${label}: 知识点不是完整的三级路径`);
  }
  for (const key of requiredSections) {
    const value = question.sections?.[key];
    if (typeof value !== 'string' || !value.trim()) issues.push(`${label}: ${key} 为空`);
    if (typeof value === 'string' && (value.match(/\$\$/g) || []).length % 2 !== 0) {
      issues.push(`${label}: ${key} 的 $$ 块公式边界不配对`);
    }
  }
  for (const key of requiredRatings) {
    const value = question.ratings?.[key];
    if (!Number.isInteger(value) || value < 1 || value > 5) issues.push(`${label}: ${key} 不在 1 至 5 星范围`);
  }
  if (!String(question.ratings?.exam_probability_basis || '').includes('暂定')) {
    issues.push(`${label}: 缺少考试复现概率的“暂定”说明`);
  }
}

if (issues.length) {
  console.error(issues.map((item, index) => `${index + 1}. ${item}`).join('\n'));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  file: path.relative(process.cwd(), input),
  questions: library.questions.length,
  checks: ['题目字段', 'ID 唯一性', '五个内容章节', '三级知识点', '三维星级', '块公式边界']
}, null, 2));
