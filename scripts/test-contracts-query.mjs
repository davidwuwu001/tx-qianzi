import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testContractsQuery() {
  try {
    console.log('1. 测试数据库连接...');
    await prisma.$connect();
    console.log('✓ 数据库连接成功');

    console.log('2. 测试查询用户...');
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ['SYSTEM_ADMIN', 'CITY_ADMIN'],
        },
      },
      select: {
        id: true,
        username: true,
        role: true,
        cityId: true,
      },
    });
    console.log(`✓ 找到 ${users.length} 个管理员用户:`, users);

    console.log('3. 测试查询合同...');
    const contracts = await prisma.contract.findMany({
      take: 5,
      include: {
        Product: {
          select: {
            name: true,
          },
        },
      },
    });
    console.log(`✓ 找到 ${contracts.length} 个合同`);

    console.log('4. 测试完整查询（模拟 getContracts）...');
    const where = {};
    const [testContracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        include: {
          Product: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 10,
      }),
      prisma.contract.count({ where }),
    ]);
    console.log(`✓ 查询成功: ${testContracts.length} 条记录，总计 ${total} 条`);

    console.log('\n所有测试通过！');
  } catch (error) {
    console.error('✗ 测试失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testContractsQuery();


