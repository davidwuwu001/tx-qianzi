/**
 * 合同导出 API
 * 
 * 导出合同列表为 Excel 格式
 * 
 * Requirements: 13.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// 状态标签映射
const STATUS_LABELS: Record<string, string> = {
  DRAFT: '草稿',
  PENDING_PARTY_B: '待乙方签署',
  PENDING_PARTY_A: '待甲方签署',
  COMPLETED: '已完成签署',
  REJECTED: '已拒签',
  EXPIRED: '已过期',
  CANCELLED: '已取消',
};

// 乙方类型标签
const PARTY_TYPE_LABELS: Record<string, string> = {
  PERSONAL: '个人',
  ENTERPRISE: '企业',
};

/**
 * 格式化日期
 */
function formatDate(date: Date | null): string {
  if (!date) return '';
  return date.toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * 转义 CSV 字段
 */
function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // 如果包含逗号、引号或换行，需要用引号包裹并转义内部引号
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    // 验证登录
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 构建查询条件
    const where: Prisma.ContractWhereInput = {};

    // 城市管理员只能导出本城市数据
    if (session.user.role === 'CITY_ADMIN') {
      if (!session.user.cityId) {
        return NextResponse.json({ error: '用户未分配城市' }, { status: 400 });
      }
      where.cityId = session.user.cityId;
    }

    // 状态筛选
    if (status && status !== 'ALL') {
      where.status = status as Prisma.EnumContract_statusFilter;
    }

    // 搜索
    if (search && search.trim()) {
      where.OR = [
        { partyBName: { contains: search.trim() } },
        { partyBPhone: { contains: search.trim() } },
        { contractNo: { contains: search.trim() } },
      ];
    }

    // 日期范围
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // 查询合同（限制最多导出 10000 条）
    const contracts = await prisma.contract.findMany({
      where,
      include: {
        Product: { select: { name: true } },
        City: { select: { name: true } },
        User_Contract_createdByIdToUser: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    // 生成 CSV 内容
    const headers = [
      '合同编号',
      '产品名称',
      '城市',
      '乙方姓名',
      '乙方手机号',
      '乙方类型',
      '乙方企业名称',
      '状态',
      '创建人',
      '创建时间',
      '完成时间',
    ];

    const rows = contracts.map(contract => [
      escapeCSV(contract.contractNo),
      escapeCSV(contract.Product.name),
      escapeCSV(contract.City.name),
      escapeCSV(contract.partyBName),
      escapeCSV(contract.partyBPhone),
      escapeCSV(PARTY_TYPE_LABELS[contract.partyBType] || contract.partyBType),
      escapeCSV(contract.partyBOrgName),
      escapeCSV(STATUS_LABELS[contract.status] || contract.status),
      escapeCSV(contract.User_Contract_createdByIdToUser.name),
      escapeCSV(formatDate(contract.createdAt)),
      escapeCSV(formatDate(contract.completedAt)),
    ]);

    // 添加 BOM 以支持 Excel 正确识别 UTF-8
    const BOM = '\uFEFF';
    const csvContent = BOM + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');

    // 生成文件名
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `contracts_${timestamp}.csv`;

    // 返回 CSV 文件
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('导出合同失败:', error);
    return NextResponse.json({ error: '导出失败' }, { status: 500 });
  }
}
