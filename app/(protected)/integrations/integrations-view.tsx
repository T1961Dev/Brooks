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
import { Zap, CheckCircle2, Globe, Building2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export function IntegrationsView({
  clients,
  selectedClientId,
}: {
  clients: Array<{ id: string; name: string }>;
  selectedClientId: string | null;
}) {
  const router = useRouter();
  const [configScope, setConfigScope] = useState<string>(
    selectedClientId ?? "agency"
  );
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [connStatus, setConnStatus] = useState<{
    connected: boolean;
    source: string | null;
    hasStoredKey: boolean;
    hasEnvKey: boolean;
  } | null>(null);
  const [agencyConnected, setAgencyConnected] = useState(false);

  // Check agency-level connection on mount
  useEffect(() => {
    fetch("/api/integrations/instantly")
      .then((r) => r.json())
      .then((d) => setAgencyConnected(!!d.connected))
      .catch(() => setAgencyConnected(false));
  }, []);

  // Check credentials for selected scope
  useEffect(() => {
    const q =
      configScope !== "agency"
        ? `?clientId=${encodeURIComponent(configScope)}`
        : "";
    fetch(`/api/integrations/instantly${q}`)
      .then((r) => r.json())
      .then((d) => setConnStatus(d))
      .catch(() => setConnStatus(null));
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
          clientId: configScope === "agency" ? null : configScope,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSaved(true);
      setApiKey("");
      if (configScope === "agency") setAgencyConnected(true);
      setConnStatus((prev) =>
        prev ? { ...prev, connected: true, hasStoredKey: true } : prev
      );
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const isAgencyScope = configScope === "agency";
  const scopeLabel = isAgencyScope
    ? "Agency Default"
    : clients.find((c) => c.id === configScope)?.name ?? "Client";
  const isConnected = connStatus?.connected ?? false;

  return (
    <div className="space-y-6">
      {/* Agency Default Status Card */}
      <Card
        className={cn(
          "border-border bg-card transition-colors",
          agencyConnected && "border-primary/30 bg-primary/5"
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  agencyConnected ? "bg-primary/20" : "bg-muted"
                )}
              >
                <Globe
                  className={cn(
                    "h-5 w-5",
                    agencyConnected
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                />
              </div>
              <div>
                <CardTitle className="text-base">
                  Instantly Connection
                </CardTitle>
                <CardDescription className="text-xs">
                  {connStatus?.hasEnvKey
                    ? "Using API key from environment"
                    : connStatus?.hasStoredKey
                      ? "Using saved API key"
                      : "Not configured"}
                </CardDescription>
              </div>
            </div>
            {agencyConnected ? (
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
              <CardTitle>Instantly API Key</CardTitle>
              <CardDescription>
                Connect your Instantly account using an API V2 key.{" "}
                <a
                  href="https://app.instantly.ai/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-primary hover:underline"
                >
                  Get your key
                  <ExternalLink className="h-3 w-3" />
                </a>
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
                  ? "All clients without their own key will use this account"
                  : `Jobs for ${scopeLabel} will use this key instead of the agency default`}
              </p>
            </div>

            {/* API Key Input */}
            <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  API Key for {scopeLabel}
                </span>
                {isConnected && (
                  <Badge variant="outline" className="text-xs">
                    <CheckCircle2 className="mr-1 h-3 w-3 text-primary" />
                    {connStatus?.source === "env" ? "From .env" : "Saved"}
                  </Badge>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Instantly API V2 Key
                </Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    isConnected
                      ? "••••••••••••••••"
                      : "Enter your Instantly API V2 key"
                  }
                  className="h-10 rounded-lg bg-card border-border font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  V2 API key — found in Instantly → Settings → API Keys.
                  No workspace ID needed with V2.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                {isConnected
                  ? "Enter a new key to update"
                  : "The key will be validated with Instantly before saving"}
              </p>
              <Button
                type="submit"
                disabled={saving || !apiKey.trim()}
                className="rounded-lg px-6"
              >
                {saving
                  ? "Validating…"
                  : isConnected
                    ? "Update Key"
                    : "Connect"}
              </Button>
            </div>
            {saved && (
              <p className="text-sm text-primary flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                API key validated and saved
              </p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            How Instantly Integration Works
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>
            <strong className="text-foreground">
              1. Run a lead job without Instantly:
            </strong>{" "}
            You can run lead jobs (scrape, verify, dedupe, enrich) without
            connecting Instantly. Leads are stored in your database.
          </p>
          <p>
            <strong className="text-foreground">
              2. Push to Instantly when ready:
            </strong>{" "}
            After a job completes, click &ldquo;Push to Instantly&rdquo; to add
            leads to an existing campaign or create a new one.
          </p>
          <p>
            <strong className="text-foreground">
              3. Per-client or shared key:
            </strong>{" "}
            If all clients share one Instantly account, set an Agency Default
            key. For clients with their own accounts, set a client-specific
            key.
          </p>
          <p>
            <strong className="text-foreground">
              4. .env fallback:
            </strong>{" "}
            You can also set <code className="text-xs bg-muted px-1 py-0.5 rounded">INSTANTLY_API_KEY</code> in
            your .env file as a global fallback.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
