"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, CheckCircle2, Globe, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function IntegrationsView({
  clients,
  selectedClientId,
}: {
  clients: Array<{ id: string; name: string }>;
  selectedClientId: string | null;
}) {
  const router = useRouter();
  // Allow explicit selection: "agency" for agency-default, or a clientId
  const [configScope, setConfigScope] = useState<string>(
    selectedClientId ?? "agency"
  );
  const [apiKey, setApiKey] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [agencyHasCredentials, setAgencyHasCredentials] = useState(false);

  // Check credentials for agency default on mount
  useEffect(() => {
    fetch("/api/integrations/instantly")
      .then((r) => r.json())
      .then((d) => setAgencyHasCredentials(!!d.hasCredentials))
      .catch(() => setAgencyHasCredentials(false));
  }, []);

  // Check credentials for selected scope
  useEffect(() => {
    const q = configScope !== "agency" ? `?clientId=${encodeURIComponent(configScope)}` : "";
    fetch(`/api/integrations/instantly${q}`)
      .then((r) => r.json())
      .then((d) => setHasCredentials(!!d.hasCredentials))
      .catch(() => setHasCredentials(false));
  }, [configScope]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/instantly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          workspace_id: workspaceId,
          clientId: configScope === "agency" ? null : configScope,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      setSaved(true);
      setApiKey("");
      setWorkspaceId("");
      if (configScope === "agency") setAgencyHasCredentials(true);
      setHasCredentials(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const isAgencyScope = configScope === "agency";
  const scopeLabel = isAgencyScope
    ? "Agency Default"
    : clients.find((c) => c.id === configScope)?.name ?? "Client";

  return (
    <div className="space-y-6">
      {/* Agency Default Status Card */}
      <Card className={cn(
        "border-border bg-card transition-colors",
        agencyHasCredentials && "border-primary/30 bg-primary/5"
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                agencyHasCredentials ? "bg-primary/20" : "bg-muted"
              )}>
                <Globe className={cn(
                  "h-5 w-5",
                  agencyHasCredentials ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <CardTitle className="text-base">Agency Default Account</CardTitle>
                <CardDescription className="text-xs">
                  Used when clients don't have their own Instantly
                </CardDescription>
              </div>
            </div>
            {agencyHasCredentials ? (
              <Badge className="bg-primary/10 text-primary border-0">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Not configured
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Configuration Form */}
      <Card className="border-border bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
              <Zap className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <CardTitle>Instantly Configuration</CardTitle>
              <CardDescription>
                Configure API credentials for agency or specific clients
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-5">
            {/* Scope Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Configure for</Label>
              <Select value={configScope} onValueChange={setConfigScope}>
                <SelectTrigger className="h-11 rounded-lg bg-muted/50 border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agency">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span>Agency Default</span>
                    </div>
                  </SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span>{client.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {isAgencyScope
                  ? "All clients without their own credentials will use this account"
                  : `Jobs for ${scopeLabel} will use these credentials instead of the agency default`}
              </p>
            </div>

            {/* Credentials */}
            <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Credentials for {scopeLabel}</span>
                {hasCredentials && (
                  <Badge variant="outline" className="text-xs">
                    <CheckCircle2 className="mr-1 h-3 w-3 text-primary" />
                    Already saved
                  </Badge>
                )}
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">API Key</Label>
                  <Input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={hasCredentials ? "••••••••••••" : "Enter Instantly API key"}
                    className="h-10 rounded-lg bg-card border-border"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Workspace ID</Label>
                  <Input
                    value={workspaceId}
                    onChange={(e) => setWorkspaceId(e.target.value)}
                    placeholder={hasCredentials ? "••••••••" : "Enter Workspace ID"}
                    className="h-10 rounded-lg bg-card border-border"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                {hasCredentials
                  ? "Enter new values to update existing credentials"
                  : "Enter credentials to enable Instantly integration"}
              </p>
              <Button
                type="submit"
                disabled={saving || (!apiKey && !workspaceId)}
                className="rounded-lg px-6"
              >
                {saving ? "Saving…" : hasCredentials ? "Update" : "Save"}
              </Button>
            </div>
            {saved && (
              <p className="text-sm text-primary flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Credentials saved successfully
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">How Instantly Integration Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">Same account, different campaigns:</strong> If all your clients use one Instantly account, just configure the Agency Default. When running jobs, you'll select the campaign for each client.
          </p>
          <p>
            <strong className="text-foreground">Different accounts per client:</strong> Configure each client's Instantly credentials individually. Their jobs will use their own account.
          </p>
          <p className="text-xs pt-2 border-t border-border">
            Jobs push leads directly into existing Instantly campaigns (not CRM lists).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
