program
  .command('clean')
  .description('将当前目录清洗为指定模板')
  .option('-t, --template <name>', '模板名称', process.env.YYC3_TEMPLATE || 'base')
  .action(async (options) => {
    const targetDir = process.cwd();
    await clean(options.template, targetDir);
  });
