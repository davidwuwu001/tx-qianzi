'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card, Row, Col, Button, Typography, Space, Statistic, Spin, DatePicker } from 'antd';
import {
  PlusCircleOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { getContractStatisticsAction } from './actions';

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;

// 统计数据类型
interface ContractStatistics {
  total: number;
  draft: number;
  pendingPartyB: number;
  pendingPartyA: number;
  completed: number;
  rejected: number;
  expired: number;
  cancelled: number;
  rejectionRate: number;
  completionRate: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user;

  // 统计数据状态
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<ContractStatistics | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  // 加载统计数据
  const loadStatistics = useCallback(async () => {
    setLoading(true);
    try {
      const filters: { startDate?: string; endDate?: string } = {};
      if (dateRange && dateRange[0] && dateRange[1]) {
        filters.startDate = dateRange[0].startOf('day').toISOString();
        filters.endDate = dateRange[1].endOf('day').toISOString();
      }

      const result = await getContractStatisticsAction(filters);
      if (result.success && result.data) {
        setStatistics(result.data);
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  // 初始加载
  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  // 快捷操作卡片
  const quickActions = [
    {
      title: '发起签约',
      description: '创建新的合同签署流程',
      icon: <PlusCircleOutlined className="text-3xl text-blue-500" />,
      onClick: () => router.push('/contracts/new'),
      color: 'bg-blue-50 hover:bg-blue-100',
    },
    {
      title: '签约管理',
      description: '查看和管理所有合同',
      icon: <FileTextOutlined className="text-3xl text-green-500" />,
      onClick: () => router.push('/contracts'),
      color: 'bg-green-50 hover:bg-green-100',
    },
    {
      title: '待处理',
      description: '查看待审批的合同',
      icon: <ClockCircleOutlined className="text-3xl text-orange-500" />,
      onClick: () => router.push('/contracts?status=PENDING_PARTY_A'),
      color: 'bg-orange-50 hover:bg-orange-100',
    },
    {
      title: '已完成',
      description: '查看已完成的合同',
      icon: <CheckCircleOutlined className="text-3xl text-emerald-500" />,
      onClick: () => router.push('/contracts?status=COMPLETED'),
      color: 'bg-emerald-50 hover:bg-emerald-100',
    },
  ];

  // 获取问候语
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '早上好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  // 获取角色显示名称
  const getRoleLabel = (role: string) => {
    return role === 'SYSTEM_ADMIN' ? '系统管理员' : '城市管理员';
  };

  return (
    <div className="space-y-6">
      {/* 欢迎区域 */}
      <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 border-0">
        <div className="text-white">
          <Title level={3} className="!text-white !mb-2">
            {getGreeting()}，{user?.name || '用户'}！
          </Title>
          <Paragraph className="!text-blue-100 !mb-0">
            欢迎使用腾讯电子签便捷签约系统
            {user?.cityName && `，当前管理城市：${user.cityName}`}
          </Paragraph>
          <Text className="text-blue-200 text-sm">
            角色：{getRoleLabel(user?.role || '')}
          </Text>
        </div>
      </Card>

      {/* 统计概览 */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <Title level={4} className="!mb-0">
            数据概览
          </Title>
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates)}
            placeholder={['开始日期', '结束日期']}
            allowClear
          />
        </div>
        <Spin spinning={loading}>
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={8} lg={4}>
              <Card>
                <Statistic
                  title="合同总数"
                  value={statistics?.total || 0}
                  valueStyle={{ color: '#1677ff' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card>
                <Statistic
                  title="待乙方签署"
                  value={statistics?.pendingPartyB || 0}
                  valueStyle={{ color: '#1677ff' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card>
                <Statistic
                  title="待甲方签署"
                  value={statistics?.pendingPartyA || 0}
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card>
                <Statistic
                  title="已完成"
                  value={statistics?.completed || 0}
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card>
                <Statistic
                  title="完成率"
                  value={statistics?.completionRate || 0}
                  suffix="%"
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<RiseOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} sm={8} lg={4}>
              <Card>
                <Statistic
                  title="拒签率"
                  value={statistics?.rejectionRate || 0}
                  suffix="%"
                  valueStyle={{ color: '#ff4d4f' }}
                  prefix={<FallOutlined />}
                />
              </Card>
            </Col>
          </Row>
        </Spin>
      </div>

      {/* 快捷操作 */}
      <div>
        <Title level={4} className="!mb-4">
          快捷操作
        </Title>
        <Row gutter={[16, 16]}>
          {quickActions.map((action, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <Card
                hoverable
                className={`${action.color} border-0 transition-all duration-200 cursor-pointer`}
                onClick={action.onClick}
              >
                <div className="flex flex-col items-center text-center py-4">
                  {action.icon}
                  <Title level={5} className="!mt-3 !mb-1">
                    {action.title}
                  </Title>
                  <Text type="secondary" className="text-sm">
                    {action.description}
                  </Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* 系统说明 */}
      <Card title="系统说明" className="mt-6">
        <div className="space-y-4">
          <div>
            <Title level={5}>签约流程</Title>
            <Paragraph type="secondary" className="!mb-0">
              1. 选择产品模板 → 2. 填写乙方信息 → 3. 发送签署链接 → 4. 乙方签署 → 5. 审批通过 → 6. 甲方自动签署 → 7. 合同完成
            </Paragraph>
          </div>
          <div>
            <Title level={5}>合同状态说明</Title>
            <Space wrap>
              <span className="px-2 py-1 bg-gray-100 rounded text-gray-600 text-sm">草稿</span>
              <span className="px-2 py-1 bg-blue-100 rounded text-blue-600 text-sm">待乙方签署</span>
              <span className="px-2 py-1 bg-orange-100 rounded text-orange-600 text-sm">待甲方签署</span>
              <span className="px-2 py-1 bg-green-100 rounded text-green-600 text-sm">已完成签署</span>
              <span className="px-2 py-1 bg-red-100 rounded text-red-600 text-sm">已拒签</span>
              <span className="px-2 py-1 bg-gray-100 rounded text-gray-500 text-sm">已过期</span>
            </Space>
          </div>
        </div>
      </Card>
    </div>
  );
}
