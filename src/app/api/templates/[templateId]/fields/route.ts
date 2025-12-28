import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { esignService, EsignApiError } from '@/services/esign.service';
import type { FormFieldConfig } from '@/services/product.service';

/**
 * GET /api/templates/[templateId]/fields
 * 获取模板字段配置
 * 
 * 从腾讯电子签获取模板详情，并转换为表单字段配置格式
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

    // 2. 调用腾讯电子签API获取模板详情
    const templateInfo = await esignService.describeFlowTemplates(templateId);

    // 3. 提取需要填写的控件（过滤掉签署控件）
    const fillComponents = templateInfo.Components.filter(
      (comp) =>
        comp.ComponentType === 'TEXT' ||
        comp.ComponentType === 'MULTI_LINE_TEXT' ||
        comp.ComponentType === 'DATE' ||
        comp.ComponentType === 'SELECT'
    );

    // 4. 转换为 FormFieldConfig 格式
    const formFields: FormFieldConfig[] = fillComponents.map((comp) => {
      // 根据控件类型映射到表单字段类型
      let fieldType: 'text' | 'number' | 'date' | 'select' = 'text';
      
      if (comp.ComponentType === 'DATE') {
        fieldType = 'date';
      } else if (comp.ComponentType === 'SELECT') {
        fieldType = 'select';
      } else if (comp.ComponentType === 'MULTI_LINE_TEXT') {
        fieldType = 'text'; // 多行文本也使用 text 类型
      }

      const fieldConfig: FormFieldConfig = {
        name: comp.ComponentName,
        label: comp.ComponentName,
        type: fieldType,
        required: comp.ComponentRequired || false,
      };

      // 解析 ComponentExtra（JSON 字符串）获取额外信息
      if (comp.ComponentExtra) {
        try {
          const extra = JSON.parse(comp.ComponentExtra);
          
          // 提取占位符或提示信息
          if (extra.Placeholder || extra.placeholder) {
            fieldConfig.defaultValue = extra.Placeholder || extra.placeholder;
          }
          
          // SELECT 类型：从 ComponentExtra 中提取选项
          if (comp.ComponentType === 'SELECT') {
            // 选项可能在 Options 或 options 字段中
            if (extra.Options && Array.isArray(extra.Options)) {
              fieldConfig.options = extra.Options;
            } else if (extra.options && Array.isArray(extra.options)) {
              fieldConfig.options = extra.options;
            } else if (extra.SelectOptions && Array.isArray(extra.SelectOptions)) {
              fieldConfig.options = extra.SelectOptions;
            }
          }
        } catch (e) {
          // ComponentExtra 不是有效的 JSON，忽略
          console.warn(`解析 ComponentExtra 失败 (${comp.ComponentName}):`, e);
        }
      }

      // 如果有默认值（ComponentValue），可以作为提示
      if (comp.ComponentValue && !fieldConfig.defaultValue) {
        fieldConfig.defaultValue = comp.ComponentValue;
      }

      return fieldConfig;
    });

    return NextResponse.json({
      success: true,
      data: {
        templateId: templateInfo.TemplateId,
        templateName: templateInfo.TemplateName,
        formFields,
      },
    });
  } catch (error) {
    console.error('获取模板字段失败:', error);
    
    // 处理 EsignApiError
    if (error instanceof EsignApiError) {
      // 根据错误码返回友好的错误信息
      if (error.code === 'ResourceNotFound.Template') {
        return NextResponse.json(
          {
            success: false,
            error: '模板不存在，请检查模板ID是否正确',
          },
          { status: 404 }
        );
      }
      
      if (error.code === 'OperationDenied.Forbid') {
        const operatorId = process.env.TENCENT_ESIGN_OPERATOR_ID || '';
        const hasOperatorId = Boolean(operatorId);
        
        return NextResponse.json(
          {
            success: false,
            error: '禁止此项操作，请检查操作人权限或模板访问权限',
            details: {
              code: error.code,
              message: error.message,
              suggestions: [
                hasOperatorId 
                  ? `当前操作人ID: ${operatorId.substring(0, 8)}...` 
                  : '操作人ID未配置，请检查环境变量 TENCENT_ESIGN_OPERATOR_ID',
                '请确认操作人ID在腾讯电子签控制台中有权限访问该模板',
                '请确认模板ID是否正确',
                '请确认操作人ID是否已激活且未被禁用',
                '如果是企业模板，请确认操作人属于该企业',
              ],
            },
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        {
          success: false,
          error: error.message || '获取模板字段失败',
        },
        { status: 500 }
      );
    }
    
    if (error instanceof Error) {
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

