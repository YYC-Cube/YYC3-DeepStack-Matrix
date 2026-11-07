/**
 * 图片资源模块声明(Taro 小程序端)
 * 修复:pages/home、pages/mine 引 yyc3-logo.png 时 TS2307
 * (gates 未含本应用,存量问题由移交处置验证时发现并补齐)
 */
declare module '*.png' {
  const content: string
  export default content
}

declare module '*.jpg' {
  const content: string
  export default content
}

declare module '*.gif' {
  const content: string
  export default content
}

declare module '*.svg' {
  const content: string
  export default content
}
