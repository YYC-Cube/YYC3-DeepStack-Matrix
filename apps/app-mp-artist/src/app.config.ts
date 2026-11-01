export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/attendance/index',
    'pages/mine/index',
    'pages/bind/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#060e1f',
    navigationBarTitleText: 'LeisureManage',
    navigationBarTextStyle: 'white',
  },
  tabBar: {
    color: '#8b9bb4',
    selectedColor: '#00d4ff',
    backgroundColor: '#0a1628',
    borderStyle: 'black',
    list: [
      { pagePath: 'pages/home/index', text: '首页' },
      { pagePath: 'pages/attendance/index', text: '签到' },
      { pagePath: 'pages/mine/index', text: '我的' },
    ],
  },
  permission: {
    'scope.userLocation': {
      desc: '用于签到/签退定位留痕(定位失败仍可签到,标记为定位不可用)',
    },
  },
})
