# Figma AI 组件独立完善与拆分指南

## 📋 组件拆分与独立完善提示词

### 核心指令模板

```
请对当前设计进行组件化拆分，遵循以下原则：
1. 识别可复用的UI元素，将其拆分为独立组件
2. 确保每个组件具有单一职责和清晰的边界
3. 为每个组件定义输入参数（props）和状态管理
4. 建立组件层次结构，支持嵌套和组合
5. 为组件添加变体（variants）以支持不同状态和样式
6. 创建组件文档，说明用途、参数和使用示例
```

---

## 🎯 组件拆分原则

### 1. 单一职责原则

每个组件只负责一个功能或展示一个UI元素

**提示词示例：**

```
请将当前设计拆分为原子级组件，确保每个组件只负责单一功能：
- 按钮组件（Button）
- 输入框组件（Input）
- 卡片组件（Card）
- 导航项组件（NavItem）
```

### 2. 可复用性原则

识别重复出现的UI模式，提取为可复用组件

**提示词示例：**

```
分析当前设计中的重复元素，创建可复用组件库：
- 识别至少5个可复用的UI模式
- 为每个模式创建独立组件
- 定义组件的默认样式和变体
- 确保组件支持主题定制
```

### 3. 层次化原则

建立清晰的组件层次结构

**提示词示例：**

```
建立组件层次体系：
- 原子组件（Atoms）：按钮、图标、输入框
- 分子组件（Molecules）：搜索框、导航项、卡片
- 有机体组件（Organisms）：导航栏、侧边栏、内容区
- 模板组件（Templates）：页面布局
- 页面组件（Pages）：完整页面
```

---

## 🔧 组件独立完善步骤

### 步骤1：组件识别与命名

**提示词：**

```
请执行以下操作：
1. 识别当前设计中的所有潜在组件
2. 为每个组件提供清晰的命名（使用PascalCase）
3. 按照功能对组件进行分类
4. 创建组件清单文档
```

**示例输出：**

```typescript
// 组件清单
const ComponentRegistry = {
  // 基础组件
  Button: '基础按钮组件',
  Input: '输入框组件',
  Icon: '图标组件',
  
  // 复合组件
  SearchBox: '搜索框组件',
  NavigationItem: '导航项组件',
  Card: '卡片组件',
  
  // 布局组件
  Container: '容器组件',
  Grid: '网格布局组件',
  Flex: '弹性布局组件'
};
```

### 步骤2：组件属性定义

**提示词：**

```
为每个组件定义完整的属性接口：
1. 必需属性（required props）
2. 可选属性（optional props）
3. 默认值（default values）
4. 属性类型（types）
5. 属性验证（validation）
```

**示例输出：**

```typescript
interface ButtonProps {
  // 必需属性
  label: string;
  onClick: () => void;
  
  // 可选属性
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  
  // 默认值
  variant?: 'primary';
  size?: 'medium';
  disabled?: false;
  loading?: false;
}
```

### 步骤3：组件变体设计

**提示词：**

```
为每个组件设计完整的变体系统：
1. 视觉变体（颜色、大小、形状）
2. 状态变体（默认、悬停、激活、禁用）
3. 功能变体（不同用途的样式）
4. 创建变体映射表
```

**示例输出：**

```typescript
// 按钮组件变体
const ButtonVariants = {
  variant: {
    primary: {
      background: '#0066FF',
      color: '#FFFFFF',
      hover: '#0052CC'
    },
    secondary: {
      background: '#F0F0F0',
      color: '#333333',
      hover: '#E0E0E0'
    },
    ghost: {
      background: 'transparent',
      color: '#0066FF',
      hover: 'rgba(0, 102, 255, 0.1)'
    }
  },
  size: {
    small: {
      padding: '8px 16px',
      fontSize: '14px'
    },
    medium: {
      padding: '12px 24px',
      fontSize: '16px'
    },
    large: {
      padding: '16px 32px',
      fontSize: '18px'
    }
  }
};
```

### 步骤4：组件文档生成

**提示词：**

```
为每个组件生成完整的文档：
1. 组件描述和用途
2. 属性说明（Props API）
3. 使用示例（Code Examples）
4. 最佳实践（Best Practices）
5. 注意事项（Caveats）
```

**示例输出：**

```markdown
# Button 组件

## 描述
Button 是一个可复用的按钮组件，支持多种样式和状态。

## Props API
| 属性 | 类型 | 必需 | 默认值 | 描述 |
|------|------|------|--------|------|
| label | string | 是 | - | 按钮文本 |
| onClick | function | 是 | - | 点击事件处理 |
| variant | 'primary' \| 'secondary' \| 'ghost' | 否 | 'primary' | 按钮样式 |
| size | 'small' \| 'medium' \| 'large' | 否 | 'medium' | 按钮大小 |

## 使用示例
\`\`\`tsx
<Button label="提交" onClick={handleSubmit} variant="primary" />
\`\`\`

## 最佳实践
- 使用 primary 样式表示主要操作
- 使用 secondary 样式表示次要操作
- 为按钮提供清晰的标签文本
```

---

## 🚀 实战提示词模板

### 模板1：完整组件拆分

```
请对当前Figma设计进行完整的组件化拆分：

1. **组件识别**
   - 识别所有可复用的UI元素
   - 按照功能对元素进行分类
   - 创建组件层次结构

2. **组件定义**
   - 为每个组件定义属性接口
   - 设置默认值和验证规则
   - 创建组件变体系统

3. **组件文档**
   - 生成组件使用文档
   - 提供代码示例
   - 说明最佳实践

4. **组件库构建**
   - 创建组件库结构
   - 建立组件依赖关系
   - 生成组件索引文件

请按照原子设计方法论进行拆分，确保组件的可复用性和可维护性。
```

### 模板2：特定组件完善

```
请完善以下组件的设计和实现：

组件名称：[组件名称]
当前状态：[描述当前组件的状态]

完善要求：
1. **属性扩展**
   - 添加缺失的属性
   - 优化属性类型定义
   - 设置合理的默认值

2. **变体设计**
   - 创建视觉变体
   - 定义状态变体
   - 建立变体映射关系

3. **交互优化**
   - 添加悬停效果
   - 定义点击反馈
   - 优化过渡动画

4. **文档完善**
   - 更新组件描述
   - 补充使用示例
   - 添加注意事项

请确保组件符合YYC³设计规范和最佳实践。
```

### 模板3：组件库重构

```
请对当前组件库进行重构优化：

重构目标：
1. **统一设计规范**
   - 统一组件命名规范
   - 标准化属性命名
   - 建立一致的API设计

2. **优化组件结构**
   - 消除重复代码
   - 提取公共逻辑
   - 优化组件层次

3. **增强可维护性**
   - 添加类型定义
   - 完善错误处理
   - 优化性能表现

4. **改进开发体验**
   - 生成完整的文档
   - 提供丰富的示例
   - 创建Storybook展示

重构后请提供：
- 组件库变更清单
- 性能对比报告
- 迁移指南
```

---

## 📊 组件拆分检查清单

### ✅ 完成标准

- [ ] 所有UI元素都已拆分为独立组件
- [ ] 每个组件都有清晰的职责定义
- [ ] 组件属性接口完整且类型安全
- [ ] 组件变体系统完整
- [ ] 组件文档齐全
- [ ] 组件代码符合规范
- [ ] 组件可独立测试
- [ ] 组件支持主题定制
- [ ] 组件性能优化
- [ ] 组件可访问性良好

### 🔍 质量检查

```typescript
// 组件质量检查脚本
const componentQualityCheck = {
  // 单一职责检查
  checkSingleResponsibility: (component) => {
    return component.functions.length <= 3;
  },
  
  // 可复用性检查
  checkReusability: (component) => {
    return component.usageCount >= 2;
  },
  
  // 依赖检查
  checkDependencies: (component) => {
    return component.dependencies.length <= 5;
  },
  
  // 文档完整性检查
  checkDocumentation: (component) => {
    return component.hasDescription && 
           component.hasExamples && 
           component.hasPropsAPI;
  }
};
```

---

## 🎯 最佳实践建议

### 1. 组件命名规范

- 使用 PascalCase 命名组件
- 使用 camelCase 命名属性
- 使用 kebab-case 命名CSS类

### 2. 组件大小控制

- 原子组件：< 100行代码
- 分子组件：100-300行代码
- 有机体组件：300-500行代码

### 3. 组件依赖管理

- 优先使用基础组件
- 避免循环依赖
- 控制组件嵌套深度（≤3层）

### 4. 组件性能优化

- 使用 React.memo 避免不必要的重渲染
- 使用 useMemo 缓存计算结果
- 使用 useCallback 缓存函数引用

---

## 📚 相关资源

### 设计系统

- [原子设计方法论](https://atomicdesign.bradfrost.com/)
- [组件驱动开发](https://www.componentdriven.org/)

### 工具推荐

- Figma Components
- Storybook
- Bit.dev
- React Styleguidist

### YYC³规范

- YYC³ 组件设计规范
- YYC³ 命名规范
- YYC³ 代码规范

---

<div align="center">

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> ***Words Initiate Quadrants, Language Serves as Core for Future***
> *万象归元于云枢 | 深栈智启新纪元***
> ***All things converge in cloud pivot; Deep stacks ignite a new era of intelligence***

</div>
