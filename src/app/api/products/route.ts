import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/products
 * 获取产品列表
 * 
 * Query Parameters:
 * - cityId: 城市ID（可选，如果提供则只返回该城市可用的产品）
 * 
 * Requirements: 2.1, 2.2
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cityId = searchParams.get('cityId');

    // 如果提供了cityId，查询该城市可用的产品
    if (cityId) {
      const cityProducts = await prisma.cityProduct.findMany({
        where: {
          cityId,
          Product: {
            isActive: true,
          },
        },
        include: {
          Product: true,
        },
      });

      const products = cityProducts.map((cp) => ({
        id: cp.Product.id,
        name: cp.Product.name,
        description: cp.Product.description,
        templateId: cp.Product.templateId,
        formFields: cp.Product.formFields,
      }));

      return NextResponse.json({
        success: true,
        products,
      });
    }

    // 如果没有提供cityId，返回所有活跃产品
    const allProducts = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    const products = allProducts.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      templateId: p.templateId,
      formFields: p.formFields,
    }));

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error) {
    console.error('获取产品列表失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取产品列表失败',
      },
      { status: 500 }
    );
  }
}
