import { prisma } from '../src/prisma/client.js';

afterAll(async () => {
  await prisma.$disconnect();
});
