'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Timeline,
  Typography,
  Spin,
  Space,
  Modal,
  Input,
  message,
  Result,
} from 'antd';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  UserOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import SignLinkDisplay from '@/components/contract/SignLinkDisplay';
import { getContractDetailAction, regenerateSignUrlAction, approveContractAction } from './actions';

const { Title, Text } = Typography;
const { TextArea } = Input;

// 合同状态配置
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '草稿', color: 'default' },
  PENDING_PARTY_B: { label: '待乙方签署', color: 'processing' },
  PENDING_PARTY_A: { label: '待甲方签署', color: 'warning' },
  COMPLETED: { label: '已完成签署', color: 'success' },
  REJECTED: { label: '已拒签', color: 'error' },
  EXPIRED: { label: '已过期', color: 'default' },
  CANCELLED: { label: '已取消', color: 'default' },
};

// 合同详情类型
interface ContractDetail {
  id: string;
  contractNo: string;
  flowId: string | null;
  productId: string;
  productName: string;
  cityId: string;
  cityName: string;
  partyBName: string;
  partyBPhone: string;
  partyBIdCard: string | null;
  partyBType: string;
  partyBOrgName: string | null;
  formData: Record<string, unknown> | null;
  status: string;
  signUrl: string | null;
  signUrlExpireAt: string | null;
  approvedAt: string | null;
  approvedByName: string | null;
  rejectionReason: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  statusLogs: StatusLogItem[];
}

// 状态日志项
interface StatusLogItem {
  id: string;
  fromStatus: string | null;
  toStatus: string;
  operatorName: string | null;
  remark: string | null;
  createdAt: string;
}

/**
 * 合同详情页面
 * Requirements: 3.6, 3.7, 4.2, 4.3
 */
export default function ContractDetailPage() {
  const { status: sessionStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const contractId = params.id as string;

  // 状态
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 审批弹窗状态
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [approvalType, setApprovalType] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [approving, setApproving] = useState(false);

  // 加载合同详情
  const loadContractDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getContractDetailAction(contractId);
      if (result.success && result.data) {
        setContract(result.data);
      } else {
        setError(result.error || '加载合同详情失败');
      }
    } catch (err) {
      console.error('加载合同详情失败:', err);
      setError('加载合同详情失败');
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  // 初始加载
  useEffect(() => {
    if (sessionStatus === 'authenticated' && contractId) {
      loadContractDetail();
    }
  }, [sessionStatus, contractId, loadContractDetail]);

  // 返回列表
  const handleBack = () => {
    router.push('/contracts');
  };

  // 重新生成签署链接
  const handleRegenerateLink = async () => {
    if (!contract) {
      throw new Error('合同信息不存在');
    }

    const result = await regenerateSignUrlAction(contract.id);
    
    if (result.success && result.data) {
      setContract({
        ...contract,
        signUrl: result.data.signUrl,
        signUrlExpireAt: result.data.signUrlExpireAt,
      });
      return {
        signUrl: result.data.signUrl,
        signUrlExpireAt: new Date(result.data.signUrlExpireAt),
      };
    }
    
    throw new Error(result.error || '重新生成链接失败');
  };

  // 打开审批弹窗
  const handleOpenApprovalModal = (type: 'approve' | 'reject') => {
    setApprovalType(type);
    setRejectionReason('');
    setApprovalModalVisible(true);
  };

  // 处理审批
  const handleApproval = async () => {
    if (approvalType === 'reject' && !rejectionReason.trim()) {
      message.error('请输入拒绝原因');
      return;
    }

    if (!contract) {
      message.error('合同信息不存在');
      return;
    }

    setApproving(true);
    try {
      const result = await approveContractAction(
        contract.id,
        approvalType === 'approve',
        approvalType === 'reject' ? rejectionReason.trim() : undefined
      );

      if (result.success) {
        message.success(approvalType === 'approve' ? '审批通过成功' : '审批拒绝成功');
        setApprovalModalVisible(false);
        // 重新加载合同详情以更新状态
        await loadContractDetail();
      } else {
        message.error(result.error || '审批失败');
      }
    } catch (err) {
      console.error('审批失败:', err);
      message.error('审批失败，请稍后重试');
    } finally {
      setApproving(false);
    }
  };

  // 获取时间线图标
  const getTimelineIcon = (toStatus: string) => {
    switch (toStatus) {
      case 'COMPLETED':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'REJECTED':
      case 'CANCELLED':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'EXPIRED':
        return <ClockCircleOutlined style={{ color: '#d9d9d9' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#1677ff' }} />;
    }
  };

  // 加载中状态
  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" />
        <span className="ml-3 text-gray-600">加载中...</span>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <Result
        status="error"
        title="加载失败"
        subTitle={error}
        extra={[
          <Button key="back" onClick={handleBack}>
            返回列表
          </Button>,
          <Button key="retry" type="primary" onClick={loadContractDetail}>
            重试
          </Button>,
        ]}
      />
    );
  }

  // 合同不存在
  if (!contract) {
    return (
      <Result
        status="404"
        title="合同不存在"
        subTitle="您访问的合同不存在或已被删除"
        extra={
          <Button type="primary" onClick={handleBack}>
            返回列表
          </Button>
        }
      />
    );
  }

  const statusConfig = STATUS_CONFIG[contract.status] || { label: contract.status, color: 'default' };

  return (
    <div>
      {/* 页面标题 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleBack}
          >
            返回
          </Button>
          <div>
            <Title level={4} className="!mb-1">
              合同详情
            </Title>
            <Text type="secondary">
              合同编号：{contract.contractNo}
            </Text>
          </div>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={loadContractDetail}
          >
            刷新
          </Button>
          {/* 待甲方签署状态显示审批按钮 */}
          {contract.status === 'PENDING_PARTY_A' && (
            <>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => handleOpenApprovalModal('approve')}
              >
                审批通过
              </Button>
              <Button
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => handleOpenApprovalModal('reject')}
              >
                审批拒绝
              </Button>
            </>
          )}
        </Space>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：合同信息 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本信息 */}
          <Card title={<><FileTextOutlined className="mr-2" />基本信息</>}>
            <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
              <Descriptions.Item label="合同编号">{contract.contractNo}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="产品名称">{contract.productName}</Descriptions.Item>
              <Descriptions.Item label="所属城市">{contract.cityName}</Descriptions.Item>
              <Descriptions.Item label="创建人">{contract.createdByName}</Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {dayjs(contract.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {dayjs(contract.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              {contract.completedAt && (
                <Descriptions.Item label="完成时间">
                  {dayjs(contract.completedAt).format('YYYY-MM-DD HH:mm:ss')}
                </Descriptions.Item>
              )}
              {contract.flowId && (
                <Descriptions.Item label="电子签流程ID" span={2}>
                  <Text copyable>{contract.flowId}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* 乙方信息 */}
          <Card title={<><UserOutlined className="mr-2" />乙方信息</>}>
            <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
              <Descriptions.Item label="乙方类型">
                {contract.partyBType === 'PERSONAL' ? '个人' : '企业'}
              </Descriptions.Item>
              {contract.partyBType === 'ENTERPRISE' && contract.partyBOrgName && (
                <Descriptions.Item label="企业名称">{contract.partyBOrgName}</Descriptions.Item>
              )}
              <Descriptions.Item label={contract.partyBType === 'ENTERPRISE' ? '签署人姓名' : '姓名'}>
                {contract.partyBName}
              </Descriptions.Item>
              <Descriptions.Item label="手机号">{contract.partyBPhone}</Descriptions.Item>
              {contract.partyBIdCard && (
                <Descriptions.Item label="身份证号">{contract.partyBIdCard}</Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* 审批信息（如果有） */}
          {(contract.approvedAt || contract.rejectionReason) && (
            <Card title="审批信息">
              <Descriptions column={1} bordered size="small">
                {contract.approvedAt && (
                  <>
                    <Descriptions.Item label="审批人">{contract.approvedByName}</Descriptions.Item>
                    <Descriptions.Item label="审批时间">
                      {dayjs(contract.approvedAt).format('YYYY-MM-DD HH:mm:ss')}
                    </Descriptions.Item>
                  </>
                )}
                {contract.rejectionReason && (
                  <Descriptions.Item label="拒绝原因">
                    <Text type="danger">{contract.rejectionReason}</Text>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          )}

          {/* 签署链接（待乙方签署状态显示） */}
          {contract.status === 'PENDING_PARTY_B' && contract.signUrl && (
            <Card title={<><LinkOutlined className="mr-2" />签署链接</>}>
              <SignLinkDisplay
                signUrl={contract.signUrl}
                signUrlExpireAt={contract.signUrlExpireAt || ''}
                partyBName={contract.partyBName}
                partyBPhone={contract.partyBPhone}
                contractId={contract.id}
                onRegenerateLink={handleRegenerateLink}
              />
            </Card>
          )}
        </div>

        {/* 右侧：状态时间线 */}
        <div>
          <Card title="签署时间线" className="sticky top-4">
            {contract.statusLogs.length > 0 ? (
              <Timeline
                items={contract.statusLogs.map((log) => {
                  const toStatusConfig = STATUS_CONFIG[log.toStatus] || { label: log.toStatus, color: 'default' };
                  return {
                    dot: getTimelineIcon(log.toStatus),
                    children: (
                      <div>
                        <div className="font-medium">
                          <Tag color={toStatusConfig.color}>
                            {toStatusConfig.label}
                          </Tag>
                        </div>
                        {log.remark && (
                          <div className="text-gray-500 text-sm mt-1">{log.remark}</div>
                        )}
                        <div className="text-gray-400 text-xs mt-1">
                          {dayjs(log.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                          {log.operatorName && ` · ${log.operatorName}`}
                        </div>
                      </div>
                    ),
                  };
                })}
              />
            ) : (
              <div className="text-center text-gray-400 py-8">
                暂无状态变更记录
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* 审批弹窗 */}
      <Modal
        title={approvalType === 'approve' ? '审批通过' : '审批拒绝'}
        open={approvalModalVisible}
        onCancel={() => setApprovalModalVisible(false)}
        onOk={handleApproval}
        confirmLoading={approving}
        okText={approvalType === 'approve' ? '确认通过' : '确认拒绝'}
        okButtonProps={{ danger: approvalType === 'reject' }}
      >
        {approvalType === 'approve' ? (
          <div>
            <p>确认审批通过此合同吗？</p>
            <p className="text-gray-500 text-sm mt-2">
              审批通过后，系统将自动完成甲方签署。
            </p>
          </div>
        ) : (
          <div>
            <p className="mb-4">请输入拒绝原因：</p>
            <TextArea
              rows={4}
              placeholder="请输入拒绝原因"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              maxLength={500}
              showCount
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
