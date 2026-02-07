"use server";

import { createProfileForUser as createProfile } from "@/lib/auth";

export async function createProfileForUser(
  userId: string,
  fullName?: string,
  companyName?: string
) {
  await createProfile(userId, fullName, companyName);
}
