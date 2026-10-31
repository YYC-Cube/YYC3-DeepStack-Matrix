/**
 * file: useI18n.ts
 * description: 国际化 Hook · 支持中文/English 动态切换
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: 2026-02-26
 * updated: 2026-03-05
 * status: active
 * tags: [hook],[i18n],[locale]
 *
 * copyright: YanYuCloudCube Team
 * license: MIT
 *
 * brief: 提供国际化功能，支持中英文动态切换
 *
 * details:
 * - localStorage 持久化语言偏好
 * - React Context 全局共享
 * - 动态切换无需刷新
 * - t() 函数支持嵌套 key 和模板变量
 *
 * dependencies: React, Context API
 * exports: useI18n, I18nProvider, I18nContext
 * notes: 需要在 App 根组件包裹 I18nProvider
 */

import { useState, useCallback, useMemo, createContext, useContext } from "react";
