import { defineConfig, type UserConfigExport } from '@tarojs/cli'

import devConfig from './dev'
import prodConfig from './prod'

export default defineConfig(async (merge) => {
  const baseConfig: UserConfigExport = {
    projectName: 'app-mp-artist',
    date: '2026-11-1',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2,
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [],
    defineConstants: {},
    framework: 'react',
    compiler: 'webpack5',
    mini: {
      postcss: {
        pxtransform: { enable: true, config: {} },
        cssModules: { enable: false },
      },
    },
    h5: {
      publicPath: './',
      staticDirectory: 'static',
      router: { mode: 'hash' },
      postcss: {
        autoprefixer: { enable: true, config: {} },
        cssModules: { enable: false },
      },
      devServer: { port: 10086 },
    },
  }

  // 注意:Taro 注入 NODE_ENV;dev/prod 差异配置见 ./dev 与 ./prod
  if (process.env.NODE_ENV === 'development') {
    return merge({}, baseConfig, devConfig)
  }
  return merge({}, baseConfig, prodConfig)
})
