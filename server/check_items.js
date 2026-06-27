const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.item.findMany();
  console.log(items.map(i => ({ id: i.id, code: i.code, name: i.name, active: i.active })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
