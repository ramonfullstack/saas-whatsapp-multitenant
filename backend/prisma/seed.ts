import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { slug: 'demo' },
    create: {
      name: 'Empresa Demo',
      slug: 'demo',
    },
    update: {},
  });

  const hash = await bcrypt.hash('123456', 10);
  const owner = await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: 'owner@demo.com' } },
    create: {
      companyId: company.id,
      email: 'owner@demo.com',
      password: hash,
      name: 'Admin Demo',
      role: UserRole.OWNER,
    },
    update: {},
  });

  let funnel = await prisma.funnel.findFirst({
    where: { companyId: company.id, isDefault: true },
  });

  if (!funnel) {
    funnel = await prisma.funnel.create({
      data: {
        companyId: company.id,
        name: 'Vendas',
        isDefault: true,
      },
    });

    const steps = [
      { name: 'Novo', order: 0, color: '#3b82f6' },
      { name: 'Qualificando', order: 1, color: '#f59e0b' },
      { name: 'Proposta', order: 2, color: '#8b5cf6' },
      { name: 'Fechado', order: 3, color: '#10b981' },
    ];

    for (const step of steps) {
      await prisma.funnelStep.create({
        data: {
          funnelId: funnel.id,
          name: step.name,
          order: step.order,
          color: step.color,
        },
      });
    }
  }

  console.log('Seed completed:');
  console.log('  Company:', company.slug, company.id);
  console.log('  User:', owner.email, '| Password: 123456');
  console.log('  Funnel:', funnel.name, funnel.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
