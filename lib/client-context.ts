import { cookies } from "next/headers";
import { CLIENT_COOKIE_NAME } from "@/lib/constants";

/** Server-only: read the currently selected client ID from the dashboard cookie. */
export async function getSelectedClientId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CLIENT_COOKIE_NAME)?.value ?? null;
}
