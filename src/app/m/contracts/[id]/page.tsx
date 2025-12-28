'use client';

/**
 * 移动端合同详情页面
 * 
 * 显示合同详细信息，已完成的合同可以下载 PDF
 */

import { useState, useEffect, use } from 'react';
import { Card, Tag, Button, Spin, message, Descriptions } from 'antd';
import { 
  ArrowLeftOutlined, 
  DownloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface ContractDetail {
  id: string;
  contractNo: string;
  partyBName: string;
  partyBPhone: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  productName: string;
  formData: Record<string, unknown> | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { label: '草稿', color: 'default', icon: <ClockCircleOutlined /> },
  PENDING_PARTY_B: { label: '待乙方签署', color: 'processing', icon: <ClockCircleOutlined /> },
  PENDING_PARTY_A: { label: '待审批', color: 'warning', icon: <ClockCircleOutlined /> },
  COMPLETED: { label: '已完成', color: 'success', icon: <CheckCircleOutlined /> },
  REJECTED: { label: '已拒签', color: 'error', icon: <CloseCircleOutlined /> },
  EXPIRED: { label: '已过期', color: 'default', icon: <CloseCircleOutlined /> },
  CANCELLED: { label: '已取消', color: 'default', icon: <CloseCircleOutlined /> },
};

export default function MobileContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { status: authStatus } = useSession();
  
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/m/login');
      return;
    }
    if (authStatus === 'authenticated') {
      fetchContract();
    }
  }, [authStatus, id, router]);

  const fetchContract = async () => {
    try {
      const response = await fetch(`/api/m/contracts/${id}`);
      if (response.ok) {
        const data = await response.json();
        setContract(data.data);
      } else {
        message.error('获取合同详情失败');
      }
    } catch (error) {
      console.error('获取合同详情失败:', error);
      message.error('获取合同详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 下载合同 PDF
  const handleDownload = async () => {
    if (!contract) return;
    
    setDownloading(true);
    try {
      const response = await fetch(`/api/m/contracts/${id}/download`);
      const data = await response.json();
      
      if (data.success && data.data?.downloadUrl) {
        // 打开下载链接
        window.open(data.data.downloadUrl, '_blank');
        message.success('正在下载合同...');
      } else {
        message.error(data.error || '获取下载链接失败');
      }
    } catch (error) {
      console.error('下载合同失败:', error);
      message.error('下载合同失败');
    } finally {
      setDownloading(false);
    }
  };

  // 刷新合同状态（从腾讯电子签同步最新状态）
  const handleSyncStatus = async () => {
    if (!contract) return;
    
    setSyncing(true);
    try {
      const response = await fetch(`/api/m/contracts/${id}/sync`, {
        method: 'POST',
      });
      const data = await response.json();
      
      if (data.success) {
        if (data.data?.updated) {
          message.success(`状态已更新: ${statusConfig[data.data.toStatus]?.label || data.data.toStatus}`);
          // 重新获取合同详情
          fetchContract();
        } else {
          message.info('状态无变化');
        }
      } else {
        message.error(data.error || '同步状态失败');
      }
    } catch (error) {
      console.error('同步状态失败:', error);
      message.error('同步状态失败');
    } finally {
      setSyncing(false);
    }
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">合同不存在</p>
          <Button onClick={() => router.back()}>返回</Button>
        </div>
      </div>
    );
  }

  const statusInfo = statusConfig[contract.status] || statusConfig.DRAFT;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* 顶部导航 */}
      <div className="bg-white px-4 py-3 flex items-center border-b sticky top-0 z-10">
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => router.back()}
          className="mr-2"
        />
        <h1 className="text-lg font-medium">合同详情</h1>
      </div>

      {/* 状态卡片 */}
      <div className="px-4 py-4">
        <Card className="rounded-xl text-center">
          <div className="text-4xl mb-2" style={{ color: statusInfo.color === 'success' ? '#52c41a' : statusInfo.color === 'error' ? '#ff4d4f' : '#1890ff' }}>
            {statusInfo.icon}
          </div>
          <Tag color={statusInfo.color} className="text-base px-4 py-1">
            {statusInfo.label}
          </Tag>
          <p className="text-gray-400 text-sm mt-2">合同编号: {contract.contractNo}</p>
        </Card>
      </div>

      {/* 甲方（客户）信息 */}
      <div className="px-4 pb-4">
        <Card className="rounded-xl" title="甲方信息">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="姓名">{contract.partyBName}</Descriptions.Item>
            <Descriptions.Item label="手机号">{contract.partyBPhone}</Descriptions.Item>
          </Descriptions>
        </Card>
      </div>

      {/* 合同信息 */}
      <div className="px-4 pb-4">
        <Card className="rounded-xl" title="合同信息">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="产品">{contract.productName}</Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(contract.createdAt).toLocaleString('zh-CN')}
            </Descriptions.Item>
            {contract.completedAt && (
              <Descriptions.Item label="完成时间">
                {new Date(contract.completedAt).toLocaleString('zh-CN')}
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      </div>

      {/* 表单数据 */}
      {contract.formData && Object.keys(contract.formData).length > 0 && (
        <div className="px-4 pb-4">
          <Card className="rounded-xl" title="填写内容">
            <Descriptions column={1} size="small">
              {Object.entries(contract.formData).map(([key, value]) => (
                <Descriptions.Item key={key} label={key}>
                  {String(value || '-')}
                </Descriptions.Item>
              ))}
            </Descriptions>
          </Card>
        </div>
      )}

      {/* 底部操作按钮 */}
      {contract.status === 'COMPLETED' && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t p-4">
          <Button 
            type="primary" 
            size="large" 
            block
            icon={<DownloadOutlined />}
            loading={downloading}
            onClick={handleDownload}
            className="h-12"
          >
            下载合同 PDF
          </Button>
        </div>
      )}

      {/* 待签署状态显示刷新按钮 */}
      {(contract.status === 'PENDING_PARTY_B' || contract.status === 'PENDING_PARTY_A') && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t p-4">
          <Button 
            type="primary" 
            size="large" 
            block
            icon={<SyncOutlined spin={syncing} />}
            loading={syncing}
            onClick={handleSyncStatus}
            className="h-12"
          >
            刷新签署状态
          </Button>
        </div>
      )}
    </div>
  );
}
