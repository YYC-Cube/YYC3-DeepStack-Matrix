// packages/cli/src/create-app.ts 中的关键改动

const TEMPLATES = [
  { title: "Dashboard 仪表盘", value: "dashboard", description: "侧边栏+内容区+数据表格", port: 3201 },
  { title: "AI Platform AI平台", value: "ai-platform", description: "对话界面+模型管理+工具调用", port: 3300 },
  { title: "Landing Page 着陆页", value: "landing", description: "品牌展示+Spline 3D+动效", port: 3200 },
  { title: "API Service API服务", value: "api", description: "RESTful API+认证+中间件", port: 3400 },
  { title: "Medical 医疗系统", value: "medical", description: "医疗数据+仪表盘+患者管理", port: 3210 },
  { title: "Education 教育平台", value: "education", description: "课程管理+学习路径+测验", port: 3220 },
  { title: "Management 管理后台", value: "management", description: "RBAC+CRUD+审批流", port: 3230 },
  { title: "SaaS Platform SaaS平台", value: "saas", description: "多租户+订阅+计费", port: 3240 },
]
