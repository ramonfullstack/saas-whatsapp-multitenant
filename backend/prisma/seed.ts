import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...\n');

  // ─── 1. Company ───────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { slug: 'demo' },
    create: { name: 'Empresa Demo', slug: 'demo' },
    update: {},
  });
  console.log('✅ Company:', company.slug, `(${company.id})`);

  // ─── 2. Users ─────────────────────────────────────────────────
  const hash = await bcrypt.hash('123456', 10);

  const owner = await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: 'owner@demo.com' } },
    create: {
      companyId: company.id,
      email: 'owner@demo.com',
      password: hash,
      name: 'Carlos Souza',
      role: UserRole.OWNER,
    },
    update: {},
  });

  const agent1 = await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: 'ana@demo.com' } },
    create: {
      companyId: company.id,
      email: 'ana@demo.com',
      password: hash,
      name: 'Ana Silva',
      role: UserRole.AGENT,
    },
    update: {},
  });

  const agent2 = await prisma.user.upsert({
    where: { companyId_email: { companyId: company.id, email: 'pedro@demo.com' } },
    create: {
      companyId: company.id,
      email: 'pedro@demo.com',
      password: hash,
      name: 'Pedro Santos',
      role: UserRole.AGENT,
    },
    update: {},
  });

  console.log('✅ Users: owner@demo.com, ana@demo.com, pedro@demo.com  (senha: 123456)');

  // ─── 3. WhatsApp Account ─────────────────────────────────────
  const whatsApp = await prisma.whatsAppAccount.upsert({
    where: {
      companyId_evolutionId: {
        companyId: company.id,
        evolutionId: 'Sessao_01',
      },
    },
    create: {
      companyId: company.id,
      evolutionId: 'Sessao_01',
      sessionName: 'Sessao_01',
      status: 'DISCONNECTED',
      phoneNumber: '5511999990000',
    },
    update: {},
  });
  console.log('✅ WhatsApp account: Sessao_01');

  // ─── 4. Funnel + Steps ───────────────────────────────────────
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
  }

  const stepDefs = [
    { name: 'Novo', order: 0, color: '#3b82f6' },
    { name: 'Qualificando', order: 1, color: '#f59e0b' },
    { name: 'Proposta', order: 2, color: '#8b5cf6' },
    { name: 'Fechado', order: 3, color: '#10b981' },
  ];

  const steps: Record<string, { id: string }> = {};
  for (const s of stepDefs) {
    const existing = await prisma.funnelStep.findFirst({
      where: { funnelId: funnel.id, name: s.name },
    });
    if (existing) {
      steps[s.name] = existing;
    } else {
      steps[s.name] = await prisma.funnelStep.create({
        data: { funnelId: funnel.id, name: s.name, order: s.order, color: s.color },
      });
    }
  }
  console.log('✅ Funnel: Vendas (Novo → Qualificando → Proposta → Fechado)');

  // ─── 5. Contacts (5 fictícios) ───────────────────────────────
  const contactsData = [
    { phone: '5511988881111', name: 'Maria Oliveira' },
    { phone: '5511988882222', name: 'João Ferreira' },
    { phone: '5511988883333', name: 'Fernanda Costa' },
    { phone: '5511988884444', name: 'Ricardo Lima' },
    { phone: '5511988885555', name: 'Camila Alves' },
  ];

  const contacts: Array<{ id: string; phone: string; name: string | null }> = [];
  for (const c of contactsData) {
    const contact = await prisma.contact.upsert({
      where: { companyId_phone: { companyId: company.id, phone: c.phone } },
      create: { companyId: company.id, phone: c.phone, name: c.name },
      update: {},
    });
    contacts.push(contact);
  }
  console.log(`✅ Contacts: ${contacts.map((c) => c.name).join(', ')}`);

  // ─── 6. Tickets (3 abertos + 1 em proposta + 1 fechado) ─────
  const ticketDefs = [
    { contact: contacts[0], step: 'Novo', agent: null },
    { contact: contacts[1], step: 'Novo', agent: agent1.id },
    { contact: contacts[2], step: 'Qualificando', agent: agent1.id },
    { contact: contacts[3], step: 'Proposta', agent: agent2.id },
    { contact: contacts[4], step: 'Fechado', agent: owner.id },
  ];

  const tickets: Array<{ id: string; contactName: string | null; step: string }> = [];
  for (const t of ticketDefs) {
    const existing = await prisma.ticket.findFirst({
      where: {
        companyId: company.id,
        contactId: t.contact.id,
        whatsAppAccountId: whatsApp.id,
      },
    });
    if (existing) {
      tickets.push({ id: existing.id, contactName: t.contact.name, step: t.step });
    } else {
      const ticket = await prisma.ticket.create({
        data: {
          companyId: company.id,
          contactId: t.contact.id,
          whatsAppAccountId: whatsApp.id,
          funnelStepId: steps[t.step].id,
          assignedToId: t.agent,
          lastMessageAt: new Date(Date.now() - Math.random() * 3600000),
        },
      });
      tickets.push({ id: ticket.id, contactName: t.contact.name, step: t.step });
    }
  }
  console.log(`✅ Tickets: ${tickets.length} criados/encontrados`);

  // ─── 7. Messages (conversas simuladas) ───────────────────────
  const conversations: Array<{
    ticketId: string;
    msgs: Array<{ content: string; fromMe: boolean; minutesAgo: number }>;
  }> = [
    {
      ticketId: tickets[0].id,
      msgs: [
        { content: 'Oi, boa tarde! Vi o anúncio de vocês no Instagram.', fromMe: false, minutesAgo: 45 },
        { content: 'Olá Maria! Tudo bem? 😊 Que bom que nos encontrou. Como posso te ajudar?', fromMe: true, minutesAgo: 43 },
        { content: 'Quero saber mais sobre o plano premium. Qual o valor?', fromMe: false, minutesAgo: 40 },
        { content: 'Nosso plano premium custa R$199/mês e inclui suporte prioritário, integrações ilimitadas e relatórios avançados.', fromMe: true, minutesAgo: 38 },
        { content: 'Interessante! Vocês fazem teste grátis?', fromMe: false, minutesAgo: 35 },
      ],
    },
    {
      ticketId: tickets[1].id,
      msgs: [
        { content: 'Bom dia! Estou com problema no meu boleto.', fromMe: false, minutesAgo: 120 },
        { content: 'Bom dia João! Pode me informar o número do pedido?', fromMe: true, minutesAgo: 118 },
        { content: 'Pedido #4521', fromMe: false, minutesAgo: 115 },
        { content: 'Encontrei aqui. O boleto foi atualizado, vou enviar o novo link agora.', fromMe: true, minutesAgo: 110 },
        { content: 'Aqui está o link atualizado: https://pagamento.exemplo.com/boleto/4521', fromMe: true, minutesAgo: 109 },
        { content: 'Obrigado! Vou pagar hoje.', fromMe: false, minutesAgo: 105 },
      ],
    },
    {
      ticketId: tickets[2].id,
      msgs: [
        { content: 'Olá! Gostaria de um orçamento para 50 licenças.', fromMe: false, minutesAgo: 200 },
        { content: 'Oi Fernanda! Para 50 licenças temos condições especiais. Posso agendar uma call?', fromMe: true, minutesAgo: 195 },
        { content: 'Pode ser amanhã às 14h?', fromMe: false, minutesAgo: 190 },
        { content: 'Perfeito! Agendado. Vou enviar o convite por e-mail.', fromMe: true, minutesAgo: 188 },
      ],
    },
    {
      ticketId: tickets[3].id,
      msgs: [
        { content: 'Boa tarde, recebi a proposta. Preciso discutir com meu sócio.', fromMe: false, minutesAgo: 500 },
        { content: 'Sem problemas Ricardo! Fico no aguardo. Qualquer dúvida estou à disposição.', fromMe: true, minutesAgo: 495 },
        { content: 'Conseguimos fechar se derem 10% de desconto.', fromMe: false, minutesAgo: 60 },
        { content: 'Vou verificar com a diretoria e te retorno ainda hoje!', fromMe: true, minutesAgo: 55 },
      ],
    },
    {
      ticketId: tickets[4].id,
      msgs: [
        { content: 'Oi! Quero contratar o plano básico.', fromMe: false, minutesAgo: 1440 },
        { content: 'Oi Camila! Ótima escolha. Vou gerar o link de pagamento.', fromMe: true, minutesAgo: 1435 },
        { content: 'Prontinho! Aqui o link: https://pagamento.exemplo.com/checkout/basico', fromMe: true, minutesAgo: 1430 },
        { content: 'Pago! ✅', fromMe: false, minutesAgo: 1400 },
        { content: 'Confirmado! Bem-vinda ao nosso time. Vou enviar o acesso por e-mail.', fromMe: true, minutesAgo: 1395 },
      ],
    },
  ];

  let totalMessages = 0;
  for (const conv of conversations) {
    for (const msg of conv.msgs) {
      const createdAt = new Date(Date.now() - msg.minutesAgo * 60 * 1000);
      const externalId = `seed_${conv.ticketId}_${msg.minutesAgo}`;

      const exists = await prisma.message.findFirst({
        where: { companyId: company.id, externalId },
      });
      if (!exists) {
        await prisma.message.create({
          data: {
            companyId: company.id,
            ticketId: conv.ticketId,
            externalId,
            content: msg.content,
            fromMe: msg.fromMe,
            status: msg.fromMe ? 'SENT' : 'RECEIVED',
            createdAt,
          },
        });
        totalMessages++;
      }
    }
  }
  console.log(`✅ Messages: ${totalMessages} mensagens criadas`);

  // ─── Resumo ───────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════');
  console.log('  🎉  SEED CONCLUÍDO COM SUCESSO!');
  console.log('══════════════════════════════════════════════════');
  console.log(`  Company:   ${company.name} (${company.slug})`);
  console.log(`  Usuários:`);
  console.log(`    → owner@demo.com  (OWNER)  senha: 123456`);
  console.log(`    → ana@demo.com    (AGENT)  senha: 123456`);
  console.log(`    → pedro@demo.com  (AGENT)  senha: 123456`);
  console.log(`  WhatsApp:  Sessao_01 (DISCONNECTED)`);
  console.log(`  Funnel:    Vendas (4 etapas)`);
  console.log(`  Contatos:  ${contacts.length}`);
  console.log(`  Tickets:   ${tickets.length}`);
  console.log(`  Mensagens: ${totalMessages}`);
  console.log('══════════════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
