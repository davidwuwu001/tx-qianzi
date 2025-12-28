import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 检查产品数据 ===\n');
  
  // 1. 查询所有产品
  const products = await prisma.product.findMany();
  console.log('产品列表:');
  products.forEach(p => {
    console.log(`  - ${p.id}: ${p.name} (模板: ${p.templateId}, 活跃: ${p.isActive})`);
  });
  
  // 2. 查询城市产品关联
  console.log('\n城市产品关联:');
  const cityProducts = await prisma.cityProduct.findMany({
    include: {
      City: true,
      Product: true,
    },
  });
  
  if (cityProducts.length === 0) {
    console.log('  ⚠️ 没有城市产品关联数据！');
  } else {
    cityProducts.forEach(cp => {
      console.log(`  - 城市: ${cp.City.name} (${cp.cityId}) -> 产品: ${cp.Product.name} (${cp.productId})`);
    });
  }
  
  // 3. 查询所有城市
  console.log('\n城市列表:');
  const cities = await prisma.city.findMany();
  cities.forEach(c => {
    console.log(`  - ${c.id}: ${c.name} (活跃: ${c.isActive})`);
  });
  
  // 4. 查询用户
  console.log('\n用户列表:');
  const users = await prisma.user.findMany({
    include: { City: true },
  });
  users.forEach(u => {
    console.log(`  - ${u.id}: ${u.name} (${u.role}, 城市: ${u.City?.name || '无'})`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
