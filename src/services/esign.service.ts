/**
 * 腾讯电子签 API 服务
 *
 * 封装腾讯电子签 API 调用，包括：
 * - 创建签署流程 (CreateFlow)
 * - 创建电子文档 (CreateDocument)
 * - 发起签署流程 (StartFlow)
 * - 获取签署链接 (CreateFlowSignUrl)
 * - 查询流程状态 (DescribeFlowInfo)
 */

import { signRequest, type SignedRequest } from "@/lib/tencent-cloud-sign";
import type {
  EsignApiResponse,
  CreateFlowResult,
  CreateDocumentResult,
  StartFlowResult,
  SignUrlResult,
  FlowInfo,
} from "@/types/api";

// API 版本
const API_VERSION = "2020-11-11";

// 环境变量
const OPERATOR_ID = process.env.TENCENT_ESIGN_OPERATOR_ID || "";

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1秒
  maxDelay: 10000, // 10秒
  retryableErrors: ["InternalError", "InternalError.Api"],
};

// 频率限制配置
const RATE_LIMIT = {
  maxRequestsPerSecond: 20,
  windowMs: 1000,
};

// 请求队列（用于频率限制）
let requestTimestamps: number[] = [];

/**
 * E-Sign API 错误
 */
export class EsignApiError extends Error {
  code: string;
  requestId: string;

  constructor(code: string, message: string, requestId: string) {
    super(message);
    this.name = "EsignApiError";
    this.code = code;
    this.requestId = requestId;
  }
}

/**
 * 错误消息映射
 */
const ERROR_MESSAGES: Record<string, string> = {
  FailedOperation: "操作失败，请稍后重试",
  InvalidParameter: "参数错误，请检查输入",
  "ResourceNotFound.Flow": "签署流程不存在",
  "OperationDenied.NoPermissionFeature": "功能权限不足，请联系管理员",
  InternalError: "系统内部错误，请稍后重试",
  "InternalError.Api": "第三方接口失败，请稍后重试",
  MissingParameter: "缺少必要参数",
  "OperationDenied.ErrNoResourceAccess": "此企业无该资源使用权限",
  "OperationDenied.Forbid": "禁止此项操作",
  "OperationDenied.NoIdentityVerify": "未通过个人实名认证",
  "OperationDenied.NoLogin": "用户未登录",
  ResourceNotFound: "资源不存在",
  "UnauthorizedOperation.NoPermissionFeature": "请升级到对应版本后使用",
};

/**
 * 获取友好的错误消息
 */
function getFriendlyErrorMessage(code: string): string {
  return ERROR_MESSAGES[code] || `未知错误: ${code}`;
}

/**
 * 等待指定时间
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 计算指数退避延迟
 */
function calculateBackoffDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
}

/**
 * 检查是否可重试的错误
 */
function isRetryableError(code: string): boolean {
  return RETRY_CONFIG.retryableErrors.some(
    (retryable) => code === retryable || code.startsWith(retryable)
  );
}

/**
 * 频率限制检查
 */
async function checkRateLimit(): Promise<void> {
  const now = Date.now();

  // 清理过期的时间戳
  requestTimestamps = requestTimestamps.filter(
    (ts) => now - ts < RATE_LIMIT.windowMs
  );

  // 如果达到限制，等待
  if (requestTimestamps.length >= RATE_LIMIT.maxRequestsPerSecond) {
    const oldestTimestamp = requestTimestamps[0];
    const waitTime = RATE_LIMIT.windowMs - (now - oldestTimestamp);
    if (waitTime > 0) {
      await sleep(waitTime);
    }
  }

  // 记录当前请求时间戳
  requestTimestamps.push(Date.now());
}

/**
 * 发送 HTTP 请求
 */
async function sendRequest<T>(signedRequest: SignedRequest): Promise<T> {
  const response = await fetch(signedRequest.url, {
    method: signedRequest.method,
    headers: signedRequest.headers,
    body: signedRequest.body,
  });

  if (!response.ok) {
    throw new Error(`HTTP 错误: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as EsignApiResponse<T>;

  // 检查 API 错误
  if (data.Response.Error) {
    const { Code, Message } = data.Response.Error;
    throw new EsignApiError(Code, Message, data.Response.RequestId);
  }

  return data.Response as T;
}

/**
 * 带重试的 API 调用
 */
async function callApiWithRetry<T>(
  action: string,
  payload: Record<string, unknown>
): Promise<T & { RequestId: string }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      // 频率限制检查
      await checkRateLimit();

      // 签名请求
      const signedRequest = signRequest({
        action,
        version: API_VERSION,
        payload,
      });

      // 发送请求
      return await sendRequest<T & { RequestId: string }>(signedRequest);
    } catch (error) {
      lastError = error as Error;

      // 如果是 EsignApiError，检查是否可重试
      if (error instanceof EsignApiError) {
        if (!isRetryableError(error.code)) {
          // 不可重试的错误，直接抛出
          throw new EsignApiError(
            error.code,
            getFriendlyErrorMessage(error.code),
            error.requestId
          );
        }
      }

      // 如果还有重试次数，等待后重试
      if (attempt < RETRY_CONFIG.maxRetries) {
        const delay = calculateBackoffDelay(attempt);
        console.warn(
          `API 调用失败，${delay}ms 后重试 (${attempt + 1}/${RETRY_CONFIG.maxRetries}):`,
          error
        );
        await sleep(delay);
      }
    }
  }

  // 所有重试都失败
  throw lastError;
}

/**
 * 签署方类型
 */
export enum ApproverType {
  /** 企业签署方 */
  ENTERPRISE = 0,
  /** 个人签署方 */
  PERSONAL = 1,
}

/**
 * 签署意愿确认方式
 */
export enum SignComponents {
  /** 人脸识别 */
  FACE = "FACE",
  /** 手写签名 */
  SIGN = "SIGN",
  /** 短信验证码 */
  SMS = "SMS",
  /** 密码 */
  PASSWORD = "PASSWORD",
}

/**
 * 签署方信息
 */
export interface FlowApprover {
  /** 签署方类型 */
  ApproverType: ApproverType;
  /** 签署人姓名 */
  ApproverName: string;
  /** 签署人手机号 */
  ApproverMobile: string;
  /** 企业名称（企业签署方必填） */
  OrganizationName?: string;
  /** 签署人身份证号 */
  ApproverIdCardNumber?: string;
  /** 签署人身份证类型 */
  ApproverIdCardType?: string;
  /** 是否自动签署（仅企业签署方支持） */
  AutoSign?: boolean;
  /** 签署意愿确认方式 */
  SignComponents?: SignComponents[];
  /** 签署顺序（从0开始） */
  SignOrder?: number;
}

/**
 * 创建签署流程参数
 */
export interface CreateFlowParams {
  /** 流程名称 */
  FlowName: string;
  /** 签署方列表 */
  Approvers: FlowApprover[];
  /** 是否无序签署 */
  Unordered?: boolean;
  /** 流程描述 */
  FlowDescription?: string;
  /** 流程类型 */
  FlowType?: string;
  /** 自动签署配置（企业自动签署时需要） */
  AutoSignScene?: string;
}

/**
 * 表单字段
 */
export interface FormField {
  /** 控件ID（与ComponentName二选一） */
  ComponentId?: string;
  /** 控件名称（与ComponentId二选一） */
  ComponentName?: string;
  /** 控件值 */
  ComponentValue: string;
}

/**
 * 创建电子文档参数
 */
export interface CreateDocumentParams {
  /** 流程ID */
  FlowId: string;
  /** 模板ID */
  TemplateId: string;
  /** 文件名称 */
  FileNames?: string[];
  /** 表单字段 */
  FormFields?: FormField[];
}

/**
 * 创建签署链接参数
 */
export interface CreateSignUrlParams {
  /** 流程ID */
  FlowId: string;
  /** 签署方信息 */
  FlowApproverInfos?: Array<{
    ApproverName: string;
    ApproverMobile: string;
    ApproverType: ApproverType;
    OrganizationName?: string;
  }>;
  /** 签署完成跳转链接 */
  JumpUrl?: string;
  /** 链接类型：0-签署链接，1-预览链接 */
  UrlType?: number;
}

/**
 * 签署链接信息
 */
export interface FlowApproverUrlInfo {
  /** 签署链接 */
  SignUrl: string;
  /** 签署人类型 */
  ApproverType: number;
  /** 签署人姓名 */
  ApproverName: string;
  /** 签署人手机号 */
  ApproverMobile: string;
  /** 链接过期时间戳 */
  SignUrlExpireTime: number;
}

/**
 * 腾讯电子签服务
 */
export const esignService = {
  /**
   * 创建签署流程
   *
   * @param params 创建流程参数
   * @returns 流程ID
   */
  async createFlow(params: CreateFlowParams): Promise<CreateFlowResult> {
    const payload: Record<string, unknown> = {
      Operator: {
        UserId: OPERATOR_ID,
      },
      FlowName: params.FlowName,
      Approvers: params.Approvers.map((approver) => {
        const approverData: Record<string, unknown> = {
          ApproverType: approver.ApproverType,
          ApproverName: approver.ApproverName,
          ApproverMobile: approver.ApproverMobile,
        };

        if (approver.OrganizationName) {
          approverData.OrganizationName = approver.OrganizationName;
        }
        if (approver.ApproverIdCardNumber) {
          approverData.ApproverIdCardNumber = approver.ApproverIdCardNumber;
        }
        if (approver.ApproverIdCardType) {
          approverData.ApproverIdCardType = approver.ApproverIdCardType;
        }
        if (approver.SignComponents && approver.SignComponents.length > 0) {
          approverData.SignComponents = approver.SignComponents;
        }
        if (approver.SignOrder !== undefined) {
          approverData.SignOrder = approver.SignOrder;
        }

        return approverData;
      }),
    };

    if (params.Unordered !== undefined) {
      payload.Unordered = params.Unordered;
    }
    if (params.FlowDescription) {
      payload.FlowDescription = params.FlowDescription;
    }
    if (params.FlowType) {
      payload.FlowType = params.FlowType;
    }
    if (params.AutoSignScene) {
      payload.AutoSignScene = params.AutoSignScene;
    }

    const response = await callApiWithRetry<{ FlowId: string }>(
      "CreateFlow",
      payload
    );

    return {
      FlowId: response.FlowId,
    };
  },

  /**
   * 创建电子文档
   *
   * @param params 创建文档参数
   * @returns 文档ID
   */
  async createDocument(
    params: CreateDocumentParams
  ): Promise<CreateDocumentResult> {
    const payload: Record<string, unknown> = {
      Operator: {
        UserId: OPERATOR_ID,
      },
      FlowId: params.FlowId,
      TemplateId: params.TemplateId,
    };

    if (params.FileNames && params.FileNames.length > 0) {
      payload.FileNames = params.FileNames;
    }
    if (params.FormFields && params.FormFields.length > 0) {
      payload.FormFields = params.FormFields;
    }

    const response = await callApiWithRetry<{ DocumentId: string }>(
      "CreateDocument",
      payload
    );

    return {
      DocumentId: response.DocumentId,
    };
  },

  /**
   * 发起签署流程
   *
   * @param flowId 流程ID
   * @returns 发起结果
   */
  async startFlow(flowId: string): Promise<StartFlowResult> {
    const payload = {
      Operator: {
        UserId: OPERATOR_ID,
      },
      FlowId: flowId,
    };

    const response = await callApiWithRetry<{ Status: string }>(
      "StartFlow",
      payload
    );

    return {
      Status: response.Status,
    };
  },

  /**
   * 获取签署链接
   *
   * @param params 创建签署链接参数
   * @returns 签署链接信息
   */
  async createFlowSignUrl(params: CreateSignUrlParams): Promise<SignUrlResult> {
    const payload: Record<string, unknown> = {
      Operator: {
        UserId: OPERATOR_ID,
      },
      FlowId: params.FlowId,
    };

    if (params.FlowApproverInfos && params.FlowApproverInfos.length > 0) {
      payload.FlowApproverInfos = params.FlowApproverInfos;
    }
    if (params.JumpUrl) {
      payload.JumpUrl = params.JumpUrl;
    }
    if (params.UrlType !== undefined) {
      payload.UrlType = params.UrlType;
    }

    const response = await callApiWithRetry<{
      FlowApproverUrlInfos: FlowApproverUrlInfo[];
    }>("CreateFlowSignUrl", payload);

    // 返回第一个签署方的链接信息
    const urlInfo = response.FlowApproverUrlInfos[0];
    return {
      SignUrl: urlInfo.SignUrl,
      ExpireTime: urlInfo.SignUrlExpireTime,
    };
  },

  /**
   * 查询流程状态
   *
   * @param flowId 流程ID
   * @returns 流程信息
   */
  async describeFlowInfo(flowId: string): Promise<FlowInfo> {
    const payload = {
      Operator: {
        UserId: OPERATOR_ID,
      },
      FlowIds: [flowId],
    };

    const response = await callApiWithRetry<{
      FlowInfos: Array<{
        FlowId: string;
        FlowStatus: number;
        FlowMessage: string;
      }>;
    }>("DescribeFlowInfo", payload);

    const flowInfo = response.FlowInfos[0];
    return {
      FlowId: flowInfo.FlowId,
      FlowStatus: flowInfo.FlowStatus,
      FlowMessage: flowInfo.FlowMessage,
    };
  },

  /**
   * 获取所有签署方的签署链接
   *
   * @param params 创建签署链接参数
   * @returns 所有签署方的链接信息
   */
  async createFlowSignUrls(
    params: CreateSignUrlParams
  ): Promise<FlowApproverUrlInfo[]> {
    const payload: Record<string, unknown> = {
      Operator: {
        UserId: OPERATOR_ID,
      },
      FlowId: params.FlowId,
    };

    if (params.FlowApproverInfos && params.FlowApproverInfos.length > 0) {
      payload.FlowApproverInfos = params.FlowApproverInfos;
    }
    if (params.JumpUrl) {
      payload.JumpUrl = params.JumpUrl;
    }
    if (params.UrlType !== undefined) {
      payload.UrlType = params.UrlType;
    }

    const response = await callApiWithRetry<{
      FlowApproverUrlInfos: FlowApproverUrlInfo[];
    }>("CreateFlowSignUrl", payload);

    return response.FlowApproverUrlInfos;
  },

  /**
   * 查询模板详情
   *
   * @param templateId 模板ID
   * @returns 模板信息
   */
  async describeFlowTemplates(templateId: string): Promise<{
    TemplateId: string;
    TemplateName: string;
    Components: Array<{
      ComponentId: string;
      ComponentName: string;
      ComponentType: string;
      ComponentRequired: boolean;
      ComponentValue?: string;
      ComponentExtra?: string;
    }>;
  }> {
    const payload = {
      Operator: {
        UserId: OPERATOR_ID,
      },
      Filters: [
        {
          Key: "template-id",
          Values: [templateId],
        },
      ],
    };

    const response = await callApiWithRetry<{
      Templates: Array<{
        TemplateId: string;
        TemplateName: string;
        Components: Array<{
          ComponentId: string;
          ComponentName: string;
          ComponentType: string;
          ComponentRequired: boolean;
          ComponentValue?: string;
          ComponentExtra?: string;
        }>;
      }>;
    }>("DescribeFlowTemplates", payload);

    const template = response.Templates?.[0];
    if (!template) {
      throw new EsignApiError(
        "ResourceNotFound.Template",
        "模板不存在，请检查模板ID是否正确",
        response.RequestId || ""
      );
    }

    return {
      TemplateId: template.TemplateId,
      TemplateName: template.TemplateName,
      Components: template.Components || [],
    };
  },
};

// 导出类型
export type { CreateFlowResult, CreateDocumentResult, StartFlowResult, SignUrlResult, FlowInfo };
