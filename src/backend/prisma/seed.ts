import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Whitesparrow Cycling Club database...');

  // ── Brugere ─────────────────────────────────────────────
  const adminPassword = await argon2.hash('Admin1234!');
  const memberPassword = await argon2.hash('Member1234!');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@whitesparrow.dk' },
    update: {},
    create: {
      email: 'admin@whitesparrow.dk',
      passwordHash: adminPassword,
      fullName: 'Klub Admin',
      phone: '+45 20 00 00 01',
      role: 'admin',
      bio: 'Ansvarlig for klubarrangementer og administration.',
    },
  });

  const lars = await prisma.user.upsert({
    where: { email: 'lars@example.com' },
    update: {},
    create: {
      email: 'lars@example.com',
      passwordHash: memberPassword,
      fullName: 'Lars Andersen',
      phone: '+45 20 12 34 56',
      bio: 'Passioneret cyklist fra København. Elsker lange ture i bakket terræn.',
    },
  });

  const maja = await prisma.user.upsert({
    where: { email: 'maja@example.com' },
    update: {},
    create: {
      email: 'maja@example.com',
      passwordHash: memberPassword,
      fullName: 'Maja Christensen',
      phone: '+45 21 98 76 54',
      bio: 'Road racer og klatreenthusiast. Styr-klar til næste sæson.',
    },
  });

  const thomas = await prisma.user.upsert({
    where: { email: 'thomas@example.com' },
    update: {},
    create: {
      email: 'thomas@example.com',
      passwordHash: memberPassword,
      fullName: 'Thomas Nielsen',
    },
  });

  console.log(`✅ Oprettet ${[admin, lars, maja, thomas].length} brugere`);

  // ── Aktiviteter ─────────────────────────────────────────
  const now = new Date();

  // 1 – Klubarrangement (sæsonåbning)
  const saesonAabning = await prisma.activity.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      createdBy: admin.id,
      type: 'event',
      title: 'Sæsonåbning 2026',
      description:
        'Kick-off på den nye sæson! Fælles tur fra klubhuset efterfulgt af grill og socialt samvær. Alle er velkomne – uanset niveau.',
      startsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // om 1 uge
      endsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
      startLocation: 'Whitesparrow Klubhus, Strandvejen 42, Hellerup',
      startLat: 55.7260,
      startLng: 12.5826,
      approxKm: 50,
      difficulty: 'moderate',
      maxParticipants: 30,
    },
  });

  // 2 – Tur af Lars
  const dyrehaven = await prisma.activity.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      createdBy: lars.id,
      type: 'ride',
      title: 'Søndagstur til Dyrehaven',
      description:
        'Stille og hyggelig tur gennem Dyrehaven og langs kysten. Vi holder pause ved Bellevue Strandpark.',
      startsAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      startLocation: 'Klampenborg Station',
      startLat: 55.7731,
      startLng: 12.5775,
      approxKm: 35,
      difficulty: 'easy',
      maxParticipants: 12,
      routeUrl: 'https://www.komoot.com/tour/example',
    },
  });

  // 3 – Hård bjergtur af Maja
  const bakkesprinter = await prisma.activity.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      createdBy: maja.id,
      type: 'ride',
      title: 'Bakkesprinter – nordsjælland runde',
      description:
        'Hård runde med +800 hm. Vi angriber Bakkevej og Gurre Bakke. Medbring energigels og godt humør.',
      startsAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      startLocation: 'Hillerød Rådhusplads',
      approxKm: 120,
      difficulty: 'hard',
    },
  });

  // 4 – Overstået tur (historik)
  const historisk = await prisma.activity.upsert({
    where: { id: '00000000-0000-0000-0000-000000000004' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000004',
      createdBy: lars.id,
      type: 'ride',
      title: 'Vinterkondition – Amager Fælled runde',
      description: 'Vinterkonditionstur på fladt terræn.',
      startsAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 dage siden
      startLocation: 'Amager Fælled P-plads',
      approxKm: 25,
      difficulty: 'easy',
    },
  });

  // 5 – Aflyst tur
  const aflyst = await prisma.activity.upsert({
    where: { id: '00000000-0000-0000-0000-000000000005' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000005',
      createdBy: admin.id,
      type: 'event',
      title: 'Forårscup – AFLYST',
      description: 'Planlagt forårscup.',
      startsAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      approxKm: 80,
      difficulty: 'moderate',
      isCancelled: true,
      cancellationReason: 'Vejrudsigten er for dårlig – stærk vind og regn hele dagen.',
    },
  });

  console.log(`✅ Oprettet 5 aktiviteter`);

  // ── Tilmeldinger ─────────────────────────────────────────
  // Sæsonåbning: 3 tilmeldte (admin, lars, maja), thomas på venteliste – simulent ved max=3
  await prisma.activity.update({
    where: { id: saesonAabning.id },
    data: { maxParticipants: 3 },
  });

  const regs = [
    { activityId: saesonAabning.id, userId: admin.id, status: 'registered' as const },
    { activityId: saesonAabning.id, userId: lars.id, status: 'registered' as const },
    { activityId: saesonAabning.id, userId: maja.id, status: 'registered' as const },
    { activityId: saesonAabning.id, userId: thomas.id, status: 'waitlisted' as const },
    { activityId: dyrehaven.id, userId: maja.id, status: 'registered' as const },
    { activityId: dyrehaven.id, userId: thomas.id, status: 'registered' as const },
    { activityId: bakkesprinter.id, userId: lars.id, status: 'registered' as const },
    { activityId: historisk.id, userId: lars.id, status: 'registered' as const },
    { activityId: historisk.id, userId: thomas.id, status: 'registered' as const },
  ];

  for (const reg of regs) {
    await prisma.registration.upsert({
      where: {
        uq_one_registration: { activityId: reg.activityId, userId: reg.userId },
      },
      update: {},
      create: reg,
    });
  }

  // Gensæt max_participants til 30 efter seed
  await prisma.activity.update({
    where: { id: saesonAabning.id },
    data: { maxParticipants: 30 },
  });

  console.log(`✅ Oprettet ${regs.length} tilmeldinger`);

  // ── Kommentarer ──────────────────────────────────────────
  const comments = [
    {
      activityId: saesonAabning.id,
      userId: lars.id,
      body: 'Glæder mig til at se alle igen! Bliver det fælles start kl. 10?',
    },
    {
      activityId: saesonAabning.id,
      userId: admin.id,
      body: 'Ja, vi starter præcis kl. 10 fra klubhuset. Grillmad serveres fra kl. 14.',
    },
    {
      activityId: saesonAabning.id,
      userId: maja.id,
      body: 'Super! Medbringer jeg et lækkert brød til grillaftenen 🥖',
    },
    {
      activityId: dyrehaven.id,
      userId: thomas.id,
      body: 'Kører vi ruten op langs kysten eller igennem skoven?',
    },
    {
      activityId: dyrehaven.id,
      userId: lars.id,
      body: 'Vi kører igennem skoven og hjem langs kysten – den vej er flottere 🌲',
    },
    {
      activityId: bakkesprinter.id,
      userId: lars.id,
      body: '120 km med 800 hm – det bliver en røvfuld 😅 Glæder mig!',
    },
  ];

  for (const c of comments) {
    await prisma.comment.create({ data: c });
  }

  console.log(`✅ Oprettet ${comments.length} kommentarer`);

  console.log('\n🎉 Seed færdig! Test-konti:');
  console.log('   admin@whitesparrow.dk  /  Admin1234!  (admin)');
  console.log('   lars@example.com       /  Member1234! (medlem)');
  console.log('   maja@example.com       /  Member1234! (medlem)');
  console.log('   thomas@example.com     /  Member1234! (medlem)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
