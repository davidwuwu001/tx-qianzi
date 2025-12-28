// API 响应基础类型
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 分页参数
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// 分页响应
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 验证结果
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// 腾讯电子签 API 响应
export interface EsignApiResponse<T = unknown> {
  Response: {
    RequestId: string;
    Error?: {
      Code: string;
      Message: string;
    };
  } & T;
}

// CreateFlow 结果
export interface CreateFlowResult {
  FlowId: string;
}

// CreateDocument 结果
export interface CreateDocumentResult {
  DocumentId: string;
}

// StartFlow 结果
export interface StartFlowResult {
  Status: string;
}

// 签署链接结果
export interface SignUrlResult {
  SignUrl: string;
  ExpireTime: number;
}

// 流程信息
export interface FlowInfo {
  FlowId: string;
  FlowStatus: number;
  FlowMessage: string;
  // 签署方信息列表
  FlowApproverInfos?: Array<{
    ApproveStatus: number;  // 0-待签署, 1-待填写, 2-待确认, 3-已签署, 4-已拒签
    ApproveType: string;
    ApproveName: string;
  }>;
}
