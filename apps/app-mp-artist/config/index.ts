import { defineConfig, type UserConfigExport } from '@tarojs/cli'

import devConfig from './dev'
import prodConfig from './prod'

/**
 * webpackbar 5 × webpack ≥5.10x 兼容垫片(不改依赖/lockfile):
 * webpackbar 5 在构造后把自家 options(name/color/reporters…)覆盖到 this.options,
 * 而新版 webpack 在 compiler.hooks.validate 阶段按 ProgressPlugin schema 校验 this.options → 直接报错。
 * 做法:validate 钩子前把 options 换成合法形状,钩子后还原,webpackbar 运行期行为不变。
 */
interface ChainLike {
  plugin: (name: string) => {
    init: (fn: (Plugin: new (...args: unknown[]) => { apply: (c: unknown) => void; options: unknown }, args: unknown[]) => unknown) => void
  }
  plugins: { has: (name: string) => boolean }
}

function patchWebpackBar(chain: ChainLike): void {
  if (!chain.plugins.has('webpackbar')) return
  chain.plugin('webpackbar').init((Plugin, args) => {
    const inst = new Plugin(...args)
    const apply = inst.apply.bind(inst)
    inst.apply = (compiler: unknown) => {
      const hooks = (compiler as { hooks: { validate: { tap: (opts: { name: string; stage: number }, fn: () => void) => void } } }).hooks
      const real = inst.options
      hooks.validate.tap({ name: 'TaroWebpackBarCompat', stage: -1000 }, () => {
        inst.options = { activeModules: true }
      })
      hooks.validate.tap({ name: 'TaroWebpackBarCompatRestore', stage: 1000 }, () => {
        inst.options = real
      })
      apply(compiler)
    }
    return inst
  })
}

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
    // API 基址(编译期内联,保持"URL 构建期固定"立场):
    //   dev 缺省 http://127.0.0.1:3001/api/v1
    //   正式构建:TARO_APP_API_BASE=https://lm.0379.pro/api/v1 pnpm build:h5(或 build:weapp)
    defineConstants: {
      API_BASE: JSON.stringify(process.env.TARO_APP_API_BASE ?? 'http://127.0.0.1:3001/api/v1'),
    },
    framework: 'react',
    compiler: 'webpack5',
    mini: {
      postcss: {
        pxtransform: { enable: true, config: {} },
        cssModules: { enable: false },
      },
      webpackChain(chain) {
        patchWebpackBar(chain as unknown as ChainLike)
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
      webpackChain(chain) {
        patchWebpackBar(chain as unknown as ChainLike)
      },
    },
  }

  // 注意:Taro 注入 NODE_ENV;dev/prod 差异配置见 ./dev 与 ./prod
  if (process.env.NODE_ENV === 'development') {
    return merge({}, baseConfig, devConfig)
  }
  return merge({}, baseConfig, prodConfig)
})
