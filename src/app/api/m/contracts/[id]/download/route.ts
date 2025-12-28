/**
 * 合同文件下载 API
 * 
 * 获取签署完成的合同 PDF 下载链接
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import { esignService } from '@/services/esign.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { id } = await params;

    // 查询合同
    const contract = await prisma.contract.findUnique({
      where: { id },
      select: {
        id: true,
        flowId: true,
        status: true,
        createdById: true,
      },
    });

    if (!contract) {
      return NextResponse.json({ error: '合同不存在' }, { status: 404 });
    }

    // 验证权限：只能下载自己创建的合同
    if (contract.createdById !== session.user.id) {
      return NextResponse.json({ error: '无权访问此合同' }, { status: 403 });
    }

    // 验证状态：只有已完成的合同才能下载
    if (contract.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: '合同尚未签署完成，无法下载' },
        { status: 400 }
      );
    }

    // 验证 flowId
    if (!contract.flowId) {
      return NextResponse.json(
        { error: '合同未关联签署流程' },
        { status: 400 }
      );
    }

    // 获取下载链接
    const result = await esignService.getContractFileUrl(contract.flowId);

    return NextResponse.json({
      success: true,
      data: {
        downloadUrl: result.FileUrl,
        expireTime: result.ExpireTime,
      },
    });
  } catch (error) {
    console.error('获取合同下载链接失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '获取下载链接失败' },
      { status: 500 }
    );
  }
}
