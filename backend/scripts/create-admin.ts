import { AccountRole, PrismaClient } from "@prisma/client";
import { config as loadDotenv } from "dotenv";
import { hashPassword } from "../src/lib/password.js";

loadDotenv();

const prisma = new PrismaClient();

function readArg(name: string): string | undefined {
  const flag = `--${name}`;
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main() {
  const email = readArg("email")?.trim().toLowerCase();
  const password = readArg("password");
  const firstName = readArg("first-name")?.trim();
  const lastName = readArg("last-name")?.trim();

  if (!email || !password) {
    throw new Error(
      'Gebruik: npm run admin:create -- --email admin@example.com --password "minimaal-8-tekens"',
    );
  }
  if (password.length < 8) {
    throw new Error("Het beheerderswachtwoord moet minimaal 8 tekens zijn");
  }

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (existing) {
    throw new Error(`Er bestaat al een account voor ${email}`);
  }

  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      role: AccountRole.ADMIN,
      firstName: firstName || null,
      lastName: lastName || null,
    },
  });

  console.log(`Beheerder aangemaakt: ${admin.email}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
