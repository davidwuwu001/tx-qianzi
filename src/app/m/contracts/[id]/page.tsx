'use client';

import { useState, useEffect } from 'react';
import { Card, Tag, Button, Spin, message, Modal, Collapse, Timeline } from 'antd';
import { 
  ArrowLeftOutlined, 
  CopyOutlined, 
  QrcodeOutlined, 
  MessageOutlined,
  ShareAltOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import QRCode from 'qrcode';

interface ContractDetail {
  id: string;
  contractNo: string;
  partyBName: string;
  partyBPhone: string;
  partyBIdCard: string | null;
  status: string;
  signUrl: string | null;
  signUrlExpireAt: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  rejectionReason: string | null;
  product: { name: string };
  statusLogs: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    operatorName: string | null;
    remark: string | null;
    createdAt: string;
  }>;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: '草稿', color: 'default' },
  PENDING_PARTY_B: { label: '待乙方签署', color: 'processing' },
  PENDING_PARTY_A: { label: '待审批', color: 'warning' },
  COMPLETED: { label: '已完成', color: 'success' },
  REJECTED: { label: '已拒签', color: 'error' },
  EXPIRED: { label: '已过期', color: 'default' },
  CANCELLED: { label: '已取消', color: 'default' },
};

export default function MobileContractDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { status: authStatus } = useSession();
  const contractId = params.id as string;

  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/m/login');
      return;
    }
    if (authStatus === 'authenticated') {
      fetchContract();
    }
  }, [authStatus, contractId, router]);

  const fetchContract = async () => {
    try {
      const response = await fetch(`/api/m/contracts/${contractId}`);
      if (response.ok) {
        const data = await response.json();
        setContract(data);
        if (data.signUrl) {
          const qr = await QRCode.toDataURL(data.signUrl, { width: 200 });
          setQrCodeUrl(qr);
        }
      } else if (response.status === 404) {
        message.error('合同不存在');
        router.push('/m/contracts');
      }
    } catch (error) {
      console.error('获取合同详情失败:', error);
      message.error('获取合同详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (contract?.signUrl) {
      navigator.clipboard.writeText(contract.signUrl);
      message.success('链接已复制');
    }
  };

  const handleSendSms = async () => {
    if (!contract) return;
    try {
      const response = await fetch('/api/m/contracts/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId: contract.id,
          phone: contract.partyBPhone,
        }),
      });
      const data = await response.json();
      if (data.success) {
        message.success('短信发送成功');
      } else {
        message.error(data.error || '短信发送失败');
      }
    } catch {
      message.error('短信发送失败');
    }
  };

  const handleRegenerateLink = async () => {
    if (!contract) return;
    setRegenerating(true);
    try {
      const response = await fetch(`/api/m/contracts/${contract.id}/regenerate-link`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        message.success('链接已重新生成');
        fetchContract();
      } else {
        message.error(data.error || '重新生成失败');
      }
    } catch {
      message.error('重新生成失败');
    } finally {
      setRegenerating(false);
    }
  };

  const handleShare = async () => {
    if (!contract?.signUrl) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: '签署邀请',
          text: `${contract.partyBName}，请点击链接完成合同签署`,
          url: contract.signUrl,
        });
      } catch {
        // 用户取消分享
      }
    } else {
      handleCopyLink();
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
    return null;
  }

  const isLinkExpired = contract.signUrlExpireAt && new Date(contract.signUrlExpireAt) < new Date();
  const canRegenerate = contract.status === 'PENDING_PARTY_B';

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 顶部导航 */}
      <div className="bg-white px-4 py-3 flex items-center border-b sticky top-0 z-10">
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => router.back()}
          className="mr-2"
        />
        <h1 className="text-lg font-medium">签约详情</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* 状态卡片 */}
        <Card className="rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">合同状态</p>
              <Tag 
                color={statusConfig[contract.status]?.color || 'default'}
                className="mt-1 text-base px-3 py-1"
              >
                {statusConfig[contract.status]?.label || contract.status}
              </Tag>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-sm">合同编号</p>
              <p className="text-gray-800 font-mono text-sm mt-1">{contract.contractNo}</p>
            </div>
          </div>
          
          {contract.rejectionReason && (
            <div className="mt-3 p-3 bg-red-50 rounded-lg">
              <p className="text-red-600 text-sm">拒签原因: {contract.rejectionReason}</p>
            </div>
          )}
        </Card>

        {/* 签署链接 */}
        {contract.signUrl && canRegenerate && (
          <Card className="rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">签署链接</h4>
              {isLinkExpired && (
                <Tag color="error">已过期</Tag>
              )}
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 break-all mb-4">
              {contract.signUrl}
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              <Button 
                icon={<CopyOutlined />} 
                onClick={handleCopyLink}
                size="small"
                className="flex flex-col items-center h-auto py-2"
              >
                <span className="text-xs mt-1">复制</span>
              </Button>
              <Button 
                icon={<QrcodeOutlined />} 
                onClick={() => setShowQrModal(true)}
                size="small"
                className="flex flex-col items-center h-auto py-2"
              >
                <span className="text-xs mt-1">二维码</span>
              </Button>
              <Button 
                icon={<MessageOutlined />} 
                onClick={handleSendSms}
                size="small"
                className="flex flex-col items-center h-auto py-2"
              >
                <span className="text-xs mt-1">短信</span>
              </Button>
              <Button 
                icon={<ShareAltOutlined />} 
                onClick={handleShare}
                size="small"
                className="flex flex-col items-center h-auto py-2"
              >
                <span className="text-xs mt-1">分享</span>
              </Button>
            </div>

            {(isLinkExpired || canRegenerate) && (
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                onClick={handleRegenerateLink}
                loading={regenerating}
                block
                className="mt-4"
              >
                重新生成链接
              </Button>
            )}
          </Card>
        )}

        {/* 乙方信息 */}
        <Collapse
          defaultActiveKey={['partyB']}
          className="rounded-xl overflow-hidden"
          items={[
            {
              key: 'partyB',
              label: '乙方信息',
              children: (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">姓名</span>
                    <span className="text-gray-800">{contract.partyBName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">手机号</span>
                    <span className="text-gray-800">{contract.partyBPhone}</span>
                  </div>
                  {contract.partyBIdCard && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">身份证号</span>
                      <span className="text-gray-800">{contract.partyBIdCard}</span>
                    </div>
                  )}
                </div>
              ),
            },
          ]}
        />

        {/* 产品信息 */}
        <Collapse
          className="rounded-xl overflow-hidden"
          items={[
            {
              key: 'product',
              label: '产品信息',
              children: (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">产品名称</span>
                    <span className="text-gray-800">{contract.product.name}</span>
                  </div>
                </div>
              ),
            },
          ]}
        />

        {/* 签署时间线 */}
        <Collapse
          className="rounded-xl overflow-hidden"
          items={[
            {
              key: 'timeline',
              label: '签署进度',
              children: (
                <Timeline
                  items={contract.statusLogs.map(log => ({
                    color: log.toStatus === 'COMPLETED' ? 'green' : 
                           log.toStatus === 'REJECTED' ? 'red' : 'blue',
                    children: (
                      <div>
                        <p className="text-gray-800">
                          {statusConfig[log.toStatus]?.label || log.toStatus}
                        </p>
                        {log.operatorName && (
                          <p className="text-gray-500 text-xs">操作人: {log.operatorName}</p>
                        )}
                        {log.remark && (
                          <p className="text-gray-500 text-xs">备注: {log.remark}</p>
                        )}
                        <p className="text-gray-400 text-xs">
                          {new Date(log.createdAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    ),
                  }))}
                />
              ),
            },
          ]}
        />
      </div>

      {/* 二维码弹窗 */}
      <Modal
        title="签署二维码"
        open={showQrModal}
        onCancel={() => setShowQrModal(false)}
        footer={null}
        centered
      >
        <div className="text-center py-4">
          {qrCodeUrl && (
            <img src={qrCodeUrl} alt="签署二维码" className="mx-auto" />
          )}
          <p className="text-gray-500 text-sm mt-4">请乙方扫描二维码进行签署</p>
        </div>
      </Modal>
    </div>
  );
}
