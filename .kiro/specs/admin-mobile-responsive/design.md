# Design Document: 管理后台移动端响应式优化

## Overview

本设计文档描述了管理后台（Dashboard）移动端响应式优化的技术实现方案。通过 CSS 媒体查询、Ant Design 响应式组件和 React 状态管理，实现一套完整的移动端适配方案，确保管理员能够在各种设备上流畅使用系统。

### 设计原则

1. **移动优先（Mobile First）**: 优先考虑移动端体验，逐步增强桌面端功能
2. **渐进增强**: 基础功能在所有设备可用，高级功能在大屏幕上增强
3. **一致性**: 保持与现有设计语言的一致性，使用 Ant Design 组件库
4. **性能优先**: 避免不必要的重渲染，使用 CSS 媒体查询优先于 JS 检测

### 断点定义

```typescript
const BREAKPOINTS = {
  xs: 480,   // 超小屏手机
  sm: 576,   // 小屏手机
  md: 768,   // 平板/大屏手机（主要移动端断点）
  lg: 992,   // 小型桌面
  xl: 1200,  // 标准桌面
  xxl: 1600, // 大屏桌面
};
```

## Architecture

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Dashboard Layout                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────────────────────────┐   │
│  │   Sider     │  │              Main                    │   │
│  │  (Desktop)  │  │  ┌─────────────────────────────────┐ │   │
│  │             │  │  │           Header                 │ │   │
│  │  ┌───────┐  │  │  └─────────────────────────────────┘ │   │
│  │  │ Menu  │  │  │  ┌─────────────────────────────────┐ │   │
│  │  └───────┘  │  │  │          Content                │ │   │
│  │             │  │  │                                  │ │   │
│  └─────────────┘  │  └─────────────────────────────────┘ │   │
│                   └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Drawer (Mobile Only)                    │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │                   Menu                         │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 响应式状态管理

```typescript
// 使用 React Hook 管理响应式状态
interface ResponsiveState {
  isMobile: boolean;      // < 768px
  isTablet: boolean;      // 768px - 1024px
  isDesktop: boolean;     // > 1024px
  screenWidth: number;
}

// 自定义 Hook
function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenWidth: 1200,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setState({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        screenWidth: width,
      });
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return state;
}
```

## Components and Interfaces

### 1. 响应式布局组件 (DashboardLayout)

```typescript
interface DashboardLayoutProps {
  children: React.ReactNode;
}

// 布局状态
interface LayoutState {
  collapsed: boolean;      // 侧边栏折叠状态
  drawerVisible: boolean;  // 移动端抽屉可见性
  isMobile: boolean;       // 是否移动端
}
```

### 2. 响应式表格组件

```typescript
interface ResponsiveTableProps<T> {
  columns: ColumnsType<T>;
  dataSource: T[];
  loading?: boolean;
  // 移动端隐藏的列
  mobileHiddenColumns?: string[];
  // 平板隐藏的列
  tabletHiddenColumns?: string[];
}
```

### 3. 响应式筛选区域组件

```typescript
interface ResponsiveFilterProps {
  children: React.ReactNode;
  // 是否使用垂直布局
  vertical?: boolean;
}
```

### 4. 响应式页面标题组件

```typescript
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}
```

## Data Models

### CSS 变量定义

```css
:root {
  /* 间距变量 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* 移动端间距 */
  --mobile-content-padding: 12px;
  --mobile-card-padding: 12px;
  --mobile-header-height: 56px;

  /* 桌面端间距 */
  --desktop-content-padding: 24px;
  --desktop-card-padding: 24px;
  --desktop-header-height: 64px;

  /* 触摸目标尺寸 */
  --touch-target-min: 44px;
}
```

### 响应式样式类

```css
/* 移动端隐藏 */
.hide-on-mobile {
  @media (max-width: 767px) {
    display: none !important;
  }
}

/* 桌面端隐藏 */
.hide-on-desktop {
  @media (min-width: 768px) {
    display: none !important;
  }
}

/* 移动端全宽 */
.mobile-full-width {
  @media (max-width: 767px) {
    width: 100% !important;
  }
}

/* 移动端垂直堆叠 */
.mobile-stack {
  @media (max-width: 767px) {
    flex-direction: column !important;
    gap: 12px !important;
  }
}
```



## Detailed Component Designs

### 1. 响应式侧边栏导航实现

```tsx
// src/app/(dashboard)/layout.tsx 修改方案

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 处理菜单点击 - 移动端自动关闭抽屉
  const handleMenuClick: MenuProps['onClick'] = (e) => {
    router.push(e.key);
    if (isMobile) {
      setDrawerVisible(false);
    }
  };

  return (
    <Layout className="min-h-screen">
      {/* 桌面端侧边栏 */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          className="!bg-white shadow-sm"
          width={220}
        >
          {/* Logo 和菜单 */}
        </Sider>
      )}

      {/* 移动端抽屉导航 */}
      <Drawer
        placement="left"
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        width={280}
        className="mobile-drawer"
        styles={{ body: { padding: 0 } }}
      >
        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b">
          <span className="text-lg font-semibold">电子签约系统</span>
          <CloseOutlined onClick={() => setDrawerVisible(false)} />
        </div>
        {/* 导航菜单 */}
        <Menu
          mode="inline"
          selectedKeys={getSelectedKeys()}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Drawer>

      <Layout>
        <Header className={`!bg-white shadow-sm ${isMobile ? '!px-3' : '!px-4'}`}>
          {/* 移动端汉堡菜单 */}
          {isMobile ? (
            <MenuOutlined
              className="text-xl cursor-pointer"
              onClick={() => setDrawerVisible(true)}
            />
          ) : (
            <div onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>
          )}
          {/* 用户信息 */}
        </Header>
        <Content className={isMobile ? 'm-2 p-3' : 'm-4 p-6'}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
```

### 2. 响应式表格实现

```tsx
// 响应式表格列配置
const getResponsiveColumns = (isMobile: boolean, isTablet: boolean) => {
  const baseColumns: ColumnsType<ContractListItem> = [
    {
      title: '合同编号',
      dataIndex: 'contractNo',
      key: 'contractNo',
      width: isMobile ? 140 : 180,
      fixed: isMobile ? 'left' : undefined,
    },
    {
      title: '乙方姓名',
      dataIndex: 'partyBName',
      key: 'partyBName',
      width: isMobile ? 80 : 120,
    },
    // 移动端隐藏的列
    ...(!isMobile ? [{
      title: '联系方式',
      dataIndex: 'partyBPhone',
      key: 'partyBPhone',
      width: 130,
    }] : []),
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: isMobile ? 80 : 120,
    },
    // 平板和移动端隐藏的列
    ...(!isMobile && !isTablet ? [{
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
    }] : []),
    {
      title: '操作',
      key: 'action',
      width: isMobile ? 60 : 100,
      fixed: 'right',
    },
  ];
  
  return baseColumns;
};

// 响应式分页配置
const getResponsivePagination = (isMobile: boolean, total: number) => ({
  current: currentPage,
  pageSize,
  total,
  showSizeChanger: !isMobile,
  showQuickJumper: !isMobile,
  showTotal: isMobile ? undefined : (total: number) => `共 ${total} 条`,
  simple: isMobile,
});
```

### 3. 响应式筛选区域实现

```tsx
// 响应式筛选区域样式
<Card className="mb-4">
  <div className={`flex gap-4 items-center ${isMobile ? 'flex-col' : 'flex-wrap'}`}>
    <Input.Search
      placeholder="搜索..."
      style={{ width: isMobile ? '100%' : 250 }}
    />
    
    <RangePicker
      style={{ width: isMobile ? '100%' : 'auto' }}
      placeholder={['开始', '结束']}
    />

    <Button
      icon={<ReloadOutlined />}
      className={isMobile ? 'w-full' : ''}
    >
      {isMobile ? '' : '刷新'}
    </Button>
  </div>
</Card>
```

### 4. 响应式弹窗实现

```tsx
// 响应式 Modal 配置
<Modal
  title={editingUser ? '编辑用户' : '新增用户'}
  open={modalVisible}
  onOk={handleModalOk}
  onCancel={handleModalCancel}
  width={isMobile ? '100%' : 500}
  style={isMobile ? { 
    top: 0, 
    margin: 0, 
    maxWidth: '100vw',
    paddingBottom: 0,
  } : undefined}
  styles={isMobile ? {
    body: { 
      maxHeight: 'calc(100vh - 110px)', 
      overflowY: 'auto' 
    }
  } : undefined}
  className={isMobile ? 'mobile-modal' : ''}
>
  {/* 表单内容 */}
</Modal>
```

### 5. 响应式首页仪表盘实现

```tsx
// 响应式统计卡片布局
<Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}>
  <Col xs={12} sm={8} lg={4}>
    <Card size={isMobile ? 'small' : 'default'}>
      <Statistic
        title="合同总数"
        value={statistics?.total || 0}
        valueStyle={{ fontSize: isMobile ? 20 : 24 }}
      />
    </Card>
  </Col>
  {/* 更多统计卡片 */}
</Row>

// 响应式快捷操作卡片
<Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}>
  {quickActions.map((action, index) => (
    <Col xs={12} sm={12} lg={6} key={index}>
      <Card
        hoverable
        size={isMobile ? 'small' : 'default'}
        className={action.color}
        onClick={action.onClick}
      >
        <div className={`flex flex-col items-center ${isMobile ? 'py-2' : 'py-4'}`}>
          {action.icon}
          <Title level={5} className={isMobile ? '!text-sm !mt-2' : '!mt-3'}>
            {action.title}
          </Title>
          {!isMobile && (
            <Text type="secondary" className="text-sm">
              {action.description}
            </Text>
          )}
        </div>
      </Card>
    </Col>
  ))}
</Row>
```

### 6. 响应式发起签约流程实现

```tsx
// 响应式步骤条
<Steps
  current={currentStep}
  items={steps}
  direction={isMobile ? 'vertical' : 'horizontal'}
  size={isMobile ? 'small' : 'default'}
  className={isMobile ? 'px-2' : 'px-4'}
/>

// 响应式签署链接展示
<div className={isMobile ? 'flex flex-col gap-4' : 'flex gap-6'}>
  <div className={isMobile ? 'flex justify-center' : ''}>
    <QRCode value={signUrl} size={isMobile ? 150 : 200} />
  </div>
  <div className="flex-1">
    <Space direction="vertical" className="w-full">
      <Button 
        type="primary" 
        block={isMobile}
        onClick={handleCopyLink}
      >
        复制链接
      </Button>
      <Button 
        block={isMobile}
        onClick={handleSendSMS}
      >
        发送短信
      </Button>
    </Space>
  </div>
</div>
```

## Global CSS Styles

```css
/* src/app/globals.css 添加响应式样式 */

/* 移动端全局样式 */
@media (max-width: 767px) {
  /* 抽屉导航样式 */
  .mobile-drawer .ant-drawer-body {
    padding: 0 !important;
  }

  /* 弹窗样式 */
  .mobile-modal {
    max-width: 100vw !important;
    margin: 0 !important;
    padding-bottom: 0 !important;
  }

  .mobile-modal .ant-modal-content {
    border-radius: 12px 12px 0 0;
    min-height: 50vh;
  }

  /* 表格样式 */
  .ant-table-wrapper {
    overflow-x: auto;
  }

  .ant-table {
    font-size: 13px;
  }

  /* 卡片样式 */
  .ant-card {
    border-radius: 8px;
  }

  .ant-card-body {
    padding: 12px;
  }

  /* 按钮触摸目标 */
  .ant-btn {
    min-height: 44px;
    min-width: 44px;
  }

  .ant-btn-sm {
    min-height: 36px;
    min-width: 36px;
  }

  /* 输入框触摸目标 */
  .ant-input,
  .ant-select-selector,
  .ant-picker {
    min-height: 44px !important;
  }

  /* 分页简化 */
  .ant-pagination-simple .ant-pagination-simple-pager {
    height: 44px;
    line-height: 44px;
  }

  /* 标签页样式 */
  .ant-tabs-nav {
    margin-bottom: 12px !important;
  }

  .ant-tabs-tab {
    padding: 8px 12px !important;
  }
}

/* 平板端样式 */
@media (min-width: 768px) and (max-width: 1023px) {
  .ant-card-body {
    padding: 16px;
  }
}

/* 触摸设备优化 */
@media (hover: none) and (pointer: coarse) {
  /* 移除 hover 效果依赖 */
  .ant-btn:hover {
    opacity: 1;
  }

  /* 增加点击反馈 */
  .ant-btn:active {
    transform: scale(0.98);
  }

  /* 增加滚动流畅度 */
  .ant-table-body {
    -webkit-overflow-scrolling: touch;
  }
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

基于需求分析，以下是本功能的正确性属性：

### Property 1: 响应式侧边栏可见性

*For any* 屏幕宽度值，当宽度小于 768px 时侧边栏应该隐藏且汉堡菜单按钮可见，当宽度大于等于 768px 时侧边栏应该可见且汉堡菜单按钮隐藏。

**Validates: Requirements 1.1, 1.5**

### Property 2: 触摸目标尺寸合规性

*For any* Dashboard 中的可点击元素（按钮、链接、输入控件），其最小尺寸应该大于等于 44x44 像素，以满足移动端触摸操作的可访问性要求。

**Validates: Requirements 2.4, 7.4, 10.1, 10.2**

### Property 3: 移动端全宽元素

*For any* 移动端屏幕（宽度 < 768px），搜索框、日期选择器、操作按钮等指定元素的宽度应该等于其容器的 100%。

**Validates: Requirements 5.2, 5.3, 6.2, 8.3**

### Property 4: 移动端垂直布局

*For any* 移动端屏幕（宽度 < 768px），筛选区域、页面标题区域、表单、步骤条等指定容器应该使用垂直堆叠布局（flex-direction: column 或 direction: vertical）。

**Validates: Requirements 5.1, 6.1, 7.3, 9.1**

### Property 5: 表格响应式列配置

*For any* 数据表格在移动端屏幕（宽度 < 768px），操作列应该固定在右侧，次要列（创建时间、更新时间等）应该被隐藏，分页应该使用简化模式。

**Validates: Requirements 4.2, 4.4, 4.5**

### Property 6: 移动端内容区域间距

*For any* 移动端屏幕（宽度 < 768px），Content 区域的外边距应该小于桌面端，内边距应该小于桌面端，以最大化可用空间。

**Validates: Requirements 3.1, 3.2**

### Property 7: 移动端弹窗布局

*For any* 移动端屏幕（宽度 < 768px），Modal 弹窗的宽度应该接近 100%，且应该从顶部开始显示（top: 0）。

**Validates: Requirements 7.1, 7.2**

### Property 8: 移动端卡片网格布局

*For any* 移动端屏幕（宽度 < 768px），统计卡片和快捷操作卡片应该使用两列布局（Col xs={12}），产品选择卡片应该使用单列布局（Col xs={24}）。

**Validates: Requirements 8.1, 8.2, 9.2**

## Error Handling

### 屏幕尺寸检测失败

当 `window.innerWidth` 无法获取时（如 SSR 环境），默认使用桌面端布局：

```typescript
const getInitialState = (): ResponsiveState => {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      screenWidth: 1200,
    };
  }
  // 正常检测逻辑
};
```

### 抽屉导航状态异常

当抽屉状态与屏幕尺寸不匹配时，自动修正：

```typescript
useEffect(() => {
  // 切换到桌面端时自动关闭抽屉
  if (!isMobile && drawerVisible) {
    setDrawerVisible(false);
  }
}, [isMobile, drawerVisible]);
```

### 表格列配置错误

当响应式列配置返回空数组时，使用默认列配置：

```typescript
const columns = getResponsiveColumns(isMobile, isTablet);
if (!columns || columns.length === 0) {
  console.warn('响应式列配置为空，使用默认配置');
  return defaultColumns;
}
```

## Testing Strategy

### 单元测试

使用 Jest 和 React Testing Library 进行单元测试：

1. **useResponsive Hook 测试**
   - 测试不同屏幕宽度下的状态返回值
   - 测试窗口 resize 事件的响应

2. **响应式列配置测试**
   - 测试 `getResponsiveColumns` 函数在不同参数下的返回值
   - 测试列的显示/隐藏逻辑

3. **响应式分页配置测试**
   - 测试 `getResponsivePagination` 函数的返回值

### 属性测试

使用 fast-check 进行属性测试，每个测试运行至少 100 次迭代：

1. **Property 1: 响应式侧边栏可见性**
   - 生成随机屏幕宽度值
   - 验证侧边栏和汉堡菜单的可见性状态

2. **Property 2: 触摸目标尺寸合规性**
   - 生成随机的可点击元素配置
   - 验证所有元素尺寸 >= 44px

3. **Property 3-8: 其他响应式属性**
   - 生成随机屏幕宽度和组件配置
   - 验证对应的响应式行为

### 集成测试

使用 Playwright 进行端到端测试：

1. **移动端视口测试**
   - 设置移动端视口尺寸
   - 验证抽屉导航的交互
   - 验证表格的水平滚动

2. **响应式断点测试**
   - 动态调整视口尺寸
   - 验证布局在断点处的切换

### 测试框架配置

```typescript
// jest.config.js 中添加
testEnvironment: 'jsdom',

// 测试文件命名
// __tests__/properties/responsive-layout.property.test.ts
// __tests__/unit/useResponsive.test.ts
// e2e/responsive.spec.ts
```

