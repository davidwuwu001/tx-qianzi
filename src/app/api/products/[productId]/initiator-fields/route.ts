/**
 * 获取产品的发起方字段配置 API
 * 
 * 这个 API 就像一个"字段配置查询器"：
 * - 根据产品 ID 查询该产品的字段配置
 * - 只返回发起方需要填写的字段（INITIATOR）
 * - 用于移动端发起签约时动态渲染表单
 * 
 * Requirements: 4.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import type { ProductFormFields, FormFieldConfig } from '@/types/form-field';

// 定义路由参数类型
interface RouteParams {
  params: Promise<{ productId: string }>;
}

/**
 * GET /api/products/[productId]/initiator-fields
 * 获取产品的发起方字段配置
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    // 验证用户登录
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      );
    }

    const { productId } = await params;

    if (!productId) {
      return NextResponse.json(
        { success: false, error: '产品ID不能为空' },
        { status: 400 }
      );
    }

    // 查询产品
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        formFields: true,
        isActive: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: '产品不存在' },
        { status: 404 }
      );
    }

    if (!product.isActive) {
      return NextResponse.json(
        { success: false, error: '该产品已禁用' },
        { status: 400 }
      );
    }

    // 解析字段配置
    let initiatorFields: FormFieldConfig[] = [];

    if (product.formFields) {
      try {
        const formFields = product.formFields as unknown as ProductFormFields;
        // 只返回发起方字段
        initiatorFields = formFields.initiatorFields || [];
      } catch (error) {
        console.error('解析字段配置失败:', error);
        // 如果解析失败，返回空数组
        initiatorFields = [];
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        productId: product.id,
        productName: product.name,
        fields: initiatorFields,
      },
    });
  } catch (error) {
    console.error('获取发起方字段失败:', error);
    return NextResponse.json(
      { success: false, error: '获取字段配置失败' },
      { status: 500 }
    );
  }
}
