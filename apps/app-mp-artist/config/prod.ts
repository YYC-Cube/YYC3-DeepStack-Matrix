import type { UserConfigExport } from '@tarojs/cli'

export default {
  mini: {},
  h5: {
    /**
     * WebpackChain 插件留空;生产构建如需 CDN 前缀在此配置 publicPath
     */
  },
} satisfies UserConfigExport
