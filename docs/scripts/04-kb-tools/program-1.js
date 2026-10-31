#!/usr/bin/env node
const { Command } = require('commander');
const program = new Command();

// 动态导入 ES module
import('../dist/commands/clean.js').then(({ registerCleanCommand }) => {
  registerCleanCommand(program);
  program.parse();
});
