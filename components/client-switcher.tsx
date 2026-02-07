"use client";

import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { CLIENT_COOKIE_NAME } from "@/lib/constants";

const COOKIE_NAME = CLIENT_COOKIE_NAME;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function setClientCookie(clientId: string) {
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(clientId)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function ClientSwitcher({
  clients,
  selectedClientId,
}: {
  clients: Array<{ id: string; name: string }>;
  selectedClientId: string | null;
}) {
  const router = useRouter();
  const value = selectedClientId ?? (clients[0]?.id ?? "");

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextId = e.target.value;
    setClientCookie(nextId);
    router.refresh();
  };

  if (clients.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <Label className="text-sm text-muted-foreground whitespace-nowrap">Client:</Label>
        <span className="text-sm text-muted-foreground">No clients</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm text-muted-foreground whitespace-nowrap">Client:</Label>
      <select
        value={value}
        onChange={handleChange}
        className="h-9 w-[220px] rounded-lg border border-border bg-muted px-3 text-sm text-foreground"
      >
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
