'use client';

/**
 * 字段配置编辑器组件
 * 
 * 用于在产品管理中配置模板字段，支持：
 * - 表格形式展示字段列表
 * - 编辑：显示名称、填写方、类型、必填、默认值
 * - select 类型时显示选项编辑
 * - 重新获取模板字段
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.5
 */

import React, { useState } from 'react';
import {
  Table,
  Input,
  Select,
  Switch,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  message,
  Tooltip,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  ReloadOutlined,
  EditOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type {
  FormFieldConfig,
  FieldType,
  FieldFiller,
  SelectOption,
} from '@/types/form-field';

interface FormFieldsEditorProps {
  value?: FormFieldConfig[];
  onChange?: (fields: FormFieldConfig[]) => void;
  loading?: boolean;
  onRefresh?: () => void;
}

// 字段类型选项
const fieldTypeOptions = [
  { label: '文本', value: 'text' },
  { label: '数字', value: 'number' },
  { label: '日期', value: 'date' },
  { label: '下拉选择', value: 'select' },
];

// 填写方选项
const fillerOptions = [
  { label: '发起方填写', value: 'INITIATOR' },
  { label: '签署方填写', value: 'SIGNER' },
];

// 字段类型标签颜色
const typeColors: Record<FieldType, string> = {
  text: 'blue',
  number: 'green',
  date: 'orange',
  select: 'purple',
};

// 填写方标签颜色
const fillerColors: Record<FieldFiller, string> = {
  INITIATOR: 'cyan',
  SIGNER: 'magenta',
};

export default function FormFieldsEditor({
  value = [],
  onChange,
  loading = false,
  onRefresh,
}: FormFieldsEditorProps) {
  // 选项编辑弹窗状态
  const [optionsModalVisible, setOptionsModalVisible] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [editingOptions, setEditingOptions] = useState<SelectOption[]>([]);
  const [optionsForm] = Form.useForm();

  // 更新字段
  const updateField = (index: number, updates: Partial<FormFieldConfig>) => {
    const newFields = [...value];
    newFields[index] = { ...newFields[index], ...updates };
    
    // 如果类型改为 select 且没有 options，初始化空数组
    if (updates.type === 'select' && !newFields[index].options) {
      newFields[index].options = [];
    }
    
    onChange?.(newFields);
  };

  // 打开选项编辑弹窗
  const openOptionsModal = (index: number) => {
    const field = value[index];
    setEditingFieldIndex(index);
    setEditingOptions(field.options || []);
    setOptionsModalVisible(true);
  };

  // 保存选项
  const saveOptions = () => {
    if (editingFieldIndex !== null) {
      updateField(editingFieldIndex, { options: editingOptions });
      setOptionsModalVisible(false);
      setEditingFieldIndex(null);
      setEditingOptions([]);
      message.success('选项保存成功');
    }
  };

  // 添加选项
  const addOption = () => {
    setEditingOptions([...editingOptions, { label: '', value: '' }]);
  };

  // 更新选项
  const updateOption = (index: number, updates: Partial<SelectOption>) => {
    const newOptions = [...editingOptions];
    newOptions[index] = { ...newOptions[index], ...updates };
    setEditingOptions(newOptions);
  };

  // 删除选项
  const deleteOption = (index: number) => {
    const newOptions = editingOptions.filter((_, i) => i !== index);
    setEditingOptions(newOptions);
  };

  // 表格列定义
  const columns: ColumnsType<FormFieldConfig> = [
    {
      title: '字段名',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name: string, record) => (
        <Tooltip title={`控件ID: ${record.componentId || '无'}`}>
          <span style={{ fontFamily: 'monospace' }}>{name}</span>
        </Tooltip>
      ),
    },
    {
      title: '显示名称',
      dataIndex: 'label',
      key: 'label',
      width: 150,
      render: (label: string, record, index) => (
        <Input
          value={label}
          onChange={(e) => updateField(index, { label: e.target.value })}
          placeholder="请输入显示名称"
          size="small"
        />
      ),
    },
    {
      title: '填写方',
      dataIndex: 'filler',
      key: 'filler',
      width: 130,
      render: (filler: FieldFiller, record, index) => (
        <Select
          value={filler}
          onChange={(value) => updateField(index, { filler: value })}
          options={fillerOptions}
          size="small"
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: FieldType, record, index) => (
        <Select
          value={type}
          onChange={(value) => updateField(index, { type: value })}
          options={fieldTypeOptions}
          size="small"
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '必填',
      dataIndex: 'required',
      key: 'required',
      width: 70,
      align: 'center',
      render: (required: boolean, record, index) => (
        <Switch
          checked={required}
          onChange={(checked) => updateField(index, { required: checked })}
          size="small"
        />
      ),
    },
    {
      title: '默认值',
      dataIndex: 'defaultValue',
      key: 'defaultValue',
      width: 120,
      render: (defaultValue: string | undefined, record, index) => (
        <Input
          value={defaultValue || ''}
          onChange={(e) => updateField(index, { defaultValue: e.target.value || undefined })}
          placeholder="默认值"
          size="small"
        />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      align: 'center',
      render: (_, record, index) => (
        <Space size="small">
          {record.type === 'select' && (
            <Tooltip title="编辑选项">
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={() => openOptionsModal(index)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  // 当前编辑的字段
  const editingField = editingFieldIndex !== null ? value[editingFieldIndex] : null;

  return (
    <div>
      {/* 工具栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <Tag color="cyan">发起方字段: {value.filter(f => f.filler === 'INITIATOR').length}</Tag>
          <Tag color="magenta">签署方字段: {value.filter(f => f.filler === 'SIGNER').length}</Tag>
        </Space>
        {onRefresh && (
          <Button
            icon={<ReloadOutlined />}
            onClick={onRefresh}
            loading={loading}
            size="small"
          >
            重新获取
          </Button>
        )}
      </div>

      {/* 字段表格 */}
      {value.length > 0 ? (
        <Table
          columns={columns}
          dataSource={value}
          rowKey="name"
          size="small"
          pagination={false}
          loading={loading}
          scroll={{ x: 800 }}
        />
      ) : (
        <Empty
          description={loading ? '正在加载...' : '暂无字段配置，请先获取模板字段'}
          style={{ padding: '40px 0' }}
        />
      )}

      {/* 选项编辑弹窗 */}
      <Modal
        title={`编辑选项 - ${editingField?.label || ''}`}
        open={optionsModalVisible}
        onOk={saveOptions}
        onCancel={() => {
          setOptionsModalVisible(false);
          setEditingFieldIndex(null);
          setEditingOptions([]);
        }}
        width={500}
      >
        <div style={{ marginBottom: 16 }}>
          <Button
            type="dashed"
            onClick={addOption}
            icon={<PlusOutlined />}
            block
          >
            添加选项
          </Button>
        </div>
        
        {editingOptions.length > 0 ? (
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            {editingOptions.map((option, index) => (
              <div key={index} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <Input
                  value={option.label}
                  onChange={(e) => updateOption(index, { label: e.target.value })}
                  placeholder="显示文本"
                  style={{ flex: 1 }}
                />
                <Input
                  value={option.value}
                  onChange={(e) => updateOption(index, { value: e.target.value })}
                  placeholder="选项值"
                  style={{ flex: 1 }}
                />
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => deleteOption(index)}
                />
              </div>
            ))}
          </div>
        ) : (
          <Empty description="暂无选项，请添加" />
        )}
      </Modal>
    </div>
  );
}
