"use server";

import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emailFromFullName } from "@/lib/user-email";

export type UserActionState = { error?: string; success?: string } | null;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
});

export async function createFrontDeskUserAction(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  await requireAdmin();

  const parsed = createSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: "Enter the front desk person's full name." };
  }

  const email = emailFromFullName(parsed.data.name);
  if (!email.endsWith("@catkomprints.local") || email.startsWith("@")) {
    return { error: "That name cannot be turned into a login email." };
  }

  const passwordHash = await bcrypt.hash("password123", 10);

  try {
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash,
        role: Role.staff,
      },
    });
  } catch {
    return { error: "A login with that name or email already exists." };
  }

  revalidatePath("/users");
  return {
    success: `Created ${parsed.data.name} · ${email} · password123`,
  };
}

export async function deleteFrontDeskUserAction(userId: string) {
  const session = await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "staff") return;
  if (user.id === session.user.id) return;

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/users");
  revalidatePath("/services");
}
