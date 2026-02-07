"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Client = {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  notes: string | null;
  onboarding_completed: boolean | null;
  onboarding_completed_at: string | null;
  created_at: string;
};

export function ClientsView({ initialClients }: { initialClients: Client[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [notes, setNotes] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteClientId, setInviteClientId] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, industry, website, notes }),
      });
      if (!res.ok) throw new Error(await res.text());
      setName("");
      setIndustry("");
      setWebsite("");
      setNotes("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async (clientId: string) => {
    setInviting(true);
    setInviteClientId(clientId);
    try {
      const res = await fetch("/api/clients/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create invite");
      setInviteLink(data.url);
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Create client</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-muted-foreground">Client name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Corp"
                className="rounded-xl bg-muted border-border text-foreground"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Industry</Label>
              <Input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="B2B SaaS"
                className="rounded-xl bg-muted border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Website</Label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://acme.com"
                className="rounded-xl bg-muted border-border text-foreground"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-muted-foreground">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any helpful context about this client."
                className="rounded-xl bg-muted border-border text-foreground"
              />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={saving} className="rounded-xl">
                {saving ? "Saving…" : "Save client"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>Clients</CardTitle>
        </CardHeader>
        <CardContent>
          {initialClients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clients yet.</p>
          ) : (
            <div className="space-y-3">
              {initialClients.map((client) => (
                <div key={client.id} className="rounded-xl border border-border p-4">
                  <div className="font-medium text-foreground">{client.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {[client.industry ? `Industry: ${client.industry}` : null, client.website]
                      .filter(Boolean)
                      .join(" • ") || "—"}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Onboarding: {client.onboarding_completed ? "Completed" : "Pending"}
                    {client.onboarding_completed_at
                      ? ` • ${new Date(client.onboarding_completed_at).toLocaleDateString()}`
                      : ""}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl border-border"
                      disabled={inviting}
                      onClick={() => handleInvite(client.id)}
                    >
                      {inviting && inviteClientId === client.id ? "Generating…" : "Generate onboarding link"}
                    </Button>
                    {inviteLink && inviteClientId === client.id && (
                      <Input
                        readOnly
                        value={inviteLink}
                        className="h-9 w-full rounded-xl bg-muted border-border text-foreground md:w-[360px]"
                        onFocus={(e) => e.currentTarget.select()}
                      />
                    )}
                  </div>
                  {client.notes && (
                    <p className="mt-2 text-sm text-muted-foreground">{client.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
