"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export async function operatorLoginAction(
  _prev: { error?: string } | null,
  formData: FormData,
) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const callbackUrl = String(formData.get("callbackUrl") || "/operator");

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl.startsWith("/operator")
        ? callbackUrl
        : "/operator",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }

  return null;
}
