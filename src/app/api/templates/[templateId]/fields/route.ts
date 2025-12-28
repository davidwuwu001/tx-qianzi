import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { EsignApiError } from '@/services/esign.service';
import { 
  getTemplateFields,
} from '@/services/product.service';
import type { FormFieldConfig } from '@/types/form-field';

/**
 * GET /api/templates/[templateId]/fields
 * 获取模板字段配置
 * 
 * 从腾讯电子签获取模板详情，过滤出填写控件，并转换为表单字段配置格式
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> | { templateId: string } }
) {
  try {
    // 1. 验证用户登录
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    // 处理 params（Next.js 15+ 可能需要 await）
    const resolvedParams = params instanceof Promise ? await params : params;
    const { templateId } = resolvedParams;

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: '模板ID不能为空' },
        { status: 400 }
      );
    }

    // 2. 调用服务获取模板字段配置
    // 内部会调用腾讯电子签 API，过滤填写控件，转换为字段配置
    const formFields: FormFieldConfig[] = await getTemplateFields(templateId);

    return NextResponse.json({
      success: true,
      data: {
        templateId,
        fields: formFields,
      },
    });
  } catch (error) {
    console.error('获取模板字段失败:', error);
    
    // 处理 EsignApiError
    if (error instanceof EsignApiError) {
      // 根据错误码返回友好的错误信息和解决建议
      if (error.code === 'ResourceNotFound.Template') {
        return NextResponse.json(
          {
            success: false,
            error: '模板不存在，请检查模板ID是否正确',
            suggestions: [
              '请确认模板ID是否正确',
              '请确认模板是否已发布',
              '请在腾讯电子签控制台查看模板列表',
            ],
          },
          { status: 404 }
        );
      }
      
      if (error.code === 'OperationDenied.Forbid' || error.code === 'OperationDenied.NoPermissionFeature') {
        const operatorId = process.env.TENCENT_ESIGN_OPERATOR_ID || '';
        const hasOperatorId = Boolean(operatorId);
        
        return NextResponse.json(
          {
            success: false,
            error: '无权限访问该模板，请联系管理员',
            suggestions: [
              hasOperatorId 
                ? `当前操作人ID: ${operatorId.substring(0, 8)}...` 
                : '操作人ID未配置，请检查环境变量 TENCENT_ESIGN_OPERATOR_ID',
              '请确认操作人ID在腾讯电子签控制台中有权限访问该模板',
              '请确认操作人ID是否已激活且未被禁用',
              '如果是企业模板，请确认操作人属于该企业',
            ],
          },
          { status: 403 }
        );
      }

      if (error.code === 'InternalError' || error.code === 'InternalError.Api') {
        return NextResponse.json(
          {
            success: false,
            error: '获取模板信息超时，请稍后重试',
            suggestions: [
              '请稍后重试',
              '如果问题持续，请联系管理员',
            ],
          },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        {
          success: false,
          error: error.message || '获取模板字段失败',
          code: error.code,
        },
        { status: 500 }
      );
    }
    
    if (error instanceof Error) {
      // 网络错误
      if (error.message.includes('fetch') || error.message.includes('network')) {
        return NextResponse.json(
          {
            success: false,
            error: '网络连接失败，请检查网络后重试',
            suggestions: [
              '请检查网络连接',
              '请稍后重试',
            ],
          },
          { status: 503 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: '获取模板字段失败',
      },
      { status: 500 }
    );
  }
}
