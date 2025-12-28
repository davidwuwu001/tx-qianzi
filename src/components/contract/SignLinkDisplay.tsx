'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  message,
  Tooltip,
  Modal,
  Spin,
  Alert,
} from 'antd';
import {
  CopyOutlined,
  QrcodeOutlined,
  MessageOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import QRCode from 'qrcode';

const { Text, Paragraph, Title } = Typography;

interface SignLinkDisplayProps {
  signUrl: string;
  signUrlExpireAt: Date | string;
  partyBName: string;
  partyBPhone: string;
  contractId?: string; // Reserved for future SMS sending functionality
  onSendSms?: () => void;
  onRegenerateLink?: () => Promise<{ signUrl: string; signUrlExpireAt: Date }>;
}

/**
 * 签署链接展示组件
 * 实现复制链接功能
 * 实现二维码生成
 * 实现发送短信按钮（MVP阶段模拟）
 * Requirements: 2.9, 2.10
 */
export default function SignLinkDisplay({
  signUrl,
  signUrlExpireAt,
  partyBName,
  partyBPhone,
  // contractId reserved for future SMS sending functionality
  onSendSms,
  onRegenerateLink,
}: SignLinkDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [qrCodeModalVisible, setQrCodeModalVisible] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [qrCodeLoading, setQrCodeLoading] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [currentSignUrl, setCurrentSignUrl] = useState(signUrl);
  const [currentExpireAt, setCurrentExpireAt] = useState<Date>(
    typeof signUrlExpireAt === 'string' ? new Date(signUrlExpireAt) : signUrlExpireAt
  );

  // 计算剩余时间
  const [remainingTime, setRemainingTime] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  // 更新剩余时间
  const updateRemainingTime = useCallback(() => {
    const now = new Date();
    const expireTime = currentExpireAt;
    const diff = expireTime.getTime() - now.getTime();

    if (diff <= 0) {
      setIsExpired(true);
      setRemainingTime('已过期');
      return;
    }

    setIsExpired(false);
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    setRemainingTime(`${minutes}分${seconds}秒`);
  }, [currentExpireAt]);

  // 定时更新剩余时间
  useEffect(() => {
    updateRemainingTime();
    const timer = setInterval(updateRemainingTime, 1000);
    return () => clearInterval(timer);
  }, [updateRemainingTime]);

  // 复制链接
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentSignUrl);
      setCopied(true);
      message.success('链接已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      message.error('复制失败，请手动复制');
    }
  };

  // 生成二维码
  const generateQRCode = async () => {
    setQrCodeLoading(true);
    try {
      const dataUrl = await QRCode.toDataURL(currentSignUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrCodeDataUrl(dataUrl);
    } catch (error) {
      console.error('生成二维码失败:', error);
      message.error('生成二维码失败');
    } finally {
      setQrCodeLoading(false);
    }
  };

  // 显示二维码弹窗
  const handleShowQRCode = async () => {
    setQrCodeModalVisible(true);
    if (!qrCodeDataUrl) {
      await generateQRCode();
    }
  };

  // 发送短信（MVP阶段模拟）
  const handleSendSms = async () => {
    setSendingSms(true);
    try {
      // MVP阶段：模拟发送短信
      await new Promise((resolve) => setTimeout(resolve, 1000));
      message.success(`签署链接已发送至 ${partyBPhone}`);
      onSendSms?.();
    } catch {
      message.error('发送短信失败');
    } finally {
      setSendingSms(false);
    }
  };

  // 重新生成链接
  const handleRegenerateLink = async () => {
    if (!onRegenerateLink) return;
    
    setRegenerating(true);
    try {
      const result = await onRegenerateLink();
      setCurrentSignUrl(result.signUrl);
      setCurrentExpireAt(new Date(result.signUrlExpireAt));
      setQrCodeDataUrl(''); // 清除旧的二维码
      message.success('签署链接已重新生成');
    } catch {
      message.error('重新生成链接失败');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Card
      className="bg-green-50 border-green-200"
      title={
        <Space>
          <CheckCircleOutlined className="text-green-500" />
          <span>签署链接已生成</span>
        </Space>
      }
    >
      <div className="space-y-4">
        {/* 乙方信息 */}
        <div className="flex items-center gap-4 text-gray-600">
          <Text>签署人：{partyBName}</Text>
          <Text>手机号：{partyBPhone}</Text>
        </div>

        {/* 链接有效期 */}
        <div className="flex items-center gap-2">
          <ClockCircleOutlined className={isExpired ? 'text-red-500' : 'text-orange-500'} />
          <Text type={isExpired ? 'danger' : 'warning'}>
            链接有效期：{remainingTime}
          </Text>
        </div>

        {/* 过期提示 */}
        {isExpired && (
          <Alert
            type="warning"
            message="签署链接已过期"
            description="请点击下方按钮重新生成签署链接"
            showIcon
          />
        )}

        {/* 签署链接 */}
        <div className="bg-white p-3 rounded border border-gray-200">
          <Text strong className="block mb-2">签署链接：</Text>
          <Paragraph
            copyable={false}
            className="!mb-0 text-sm text-gray-600 break-all"
          >
            {currentSignUrl}
          </Paragraph>
        </div>

        {/* 操作按钮 */}
        <Space wrap>
          <Tooltip title={copied ? '已复制' : '复制链接'}>
            <Button
              icon={copied ? <CheckCircleOutlined /> : <CopyOutlined />}
              onClick={handleCopyLink}
              disabled={isExpired}
            >
              {copied ? '已复制' : '复制链接'}
            </Button>
          </Tooltip>

          <Button
            icon={<QrcodeOutlined />}
            onClick={handleShowQRCode}
            disabled={isExpired}
          >
            显示二维码
          </Button>

          <Button
            icon={<MessageOutlined />}
            onClick={handleSendSms}
            loading={sendingSms}
            disabled={isExpired}
          >
            发送短信
          </Button>

          {onRegenerateLink && (
            <Button
              icon={<ReloadOutlined />}
              onClick={handleRegenerateLink}
              loading={regenerating}
              type={isExpired ? 'primary' : 'default'}
            >
              重新生成链接
            </Button>
          )}
        </Space>

        {/* 提示信息 */}
        <div className="text-gray-500 text-sm">
          <Text type="secondary">
            提示：签署链接有效期为30分钟，过期后需重新生成。
          </Text>
        </div>
      </div>

      {/* 二维码弹窗 */}
      <Modal
        title="签署二维码"
        open={qrCodeModalVisible}
        onCancel={() => setQrCodeModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setQrCodeModalVisible(false)}>
            关闭
          </Button>,
        ]}
        centered
      >
        <div className="flex flex-col items-center py-4">
          {qrCodeLoading ? (
            <div className="flex items-center">
              <Spin size="large" />
              <span className="ml-3 text-gray-600">生成二维码中...</span>
            </div>
          ) : qrCodeDataUrl ? (
            <>
              <img
                src={qrCodeDataUrl}
                alt="签署二维码"
                className="w-64 h-64"
              />
              <div className="mt-4 text-center">
                <Title level={5}>请使用手机扫描二维码</Title>
                <Text type="secondary">签署人：{partyBName}</Text>
              </div>
            </>
          ) : (
            <Text type="secondary">二维码生成失败</Text>
          )}
        </div>
      </Modal>
    </Card>
  );
}
