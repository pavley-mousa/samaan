
import { config } from 'dotenv';
import { resolve } from 'node:path';

config({ path: resolve(process.cwd(), '../../.env') });

import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import { hash } from 'bcryptjs';

async function main(): Promise<void> {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();

  if (!email) {
    throw new Error('Set BOOTSTRAP_ADMIN_EMAIL in the root .env file.');
  }

  const prisma = new PrismaClient();

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerifiedAt: true },
    });

    if (existing) {
      await prisma.user.update({
        where: { email },
        data: {
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
        },
      });

      console.log(`Existing account promoted to ADMIN: ${email}`);
      return;
    }

    const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

    if (!password || password.length < 14) {
      throw new Error(
        'For a new account, set BOOTSTRAP_ADMIN_PASSWORD to at least 14 characters.'
      );
    }

    const passwordHash = await hash(password, 12);

    await prisma.user.create({
      data: {
        name: 'Store Administrator',
        email,
        passwordHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });

    console.log(`Created administrator account: ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
