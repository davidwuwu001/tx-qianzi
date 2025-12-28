# API 概览

腾讯电子签 API 提供了合同全生命周期的管理能力。

## 1. 模板与文件接口
- `DescribeFlowTemplates`：查询模板信息。
- `UploadFiles`：上传 PDF 文件。
- `DescribeFileUrls`：查询文件下载链接。

## 2. 签署流程创建接口
- `CreateFlowByFiles`：使用 PDF 文件创建签署流程。
- `CreateFlow`：使用模板创建签署流程。
- `StartFlow`：发起签署流程。

## 3. 查询与控制接口
- `DescribeFlowBriefs`：查询流程基础信息。
- `DescribeFlowInfo`：查询合同详情。
- `CancelFlow`：撤销合同流程。
- `ModifyFlowDeadline`：修改签署截止时间。

## 4. 可嵌入页面接口
- `CreateFlowSignUrl`：获取 H5 签署链接。
- `CreateEmbedWebUrl`：获取可嵌入的 Web 页面链接。

## 5. 频率限制
大多数查询类接口频率限制为 300次/秒，发起类接口通常为 20-50次/秒。

## 6. 公共参数
所有 API 调用均需包含：
- `Action`：接口名称。
- `Version`：版本号（如 `2020-11-11`）。
- `Region`：地域。
- `Timestamp`：当前时间戳。
