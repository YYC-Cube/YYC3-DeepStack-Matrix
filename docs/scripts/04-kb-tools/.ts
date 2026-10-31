// 伪代码
1. 创建目标文件夹
2. 从 `packages/framework` 复制基础模板（除 `node_modules`, `.next` 等）
3. 修改 `package.json`：将 `@yyc3/*` 依赖改为本地路径或 npm 版本
4. 根据场景配置：
   - 合并 `tailwind.config.js` 的主题
   - 复制 `customFiles` 到对应位置
   - 生成环境变量文件（.env.local）
5. 执行 `pnpm install` 和 `pnpm build`
