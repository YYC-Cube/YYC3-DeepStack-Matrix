#!/usr/bin/env node
import { Command } from 'commander';
import { registerCleanCommand } from '../src/commands/clean.js';

const program = new Command();

// ... 其他命令注册

registerCleanCommand(program);

program.parse();
