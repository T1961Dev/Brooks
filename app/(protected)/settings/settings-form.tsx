"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormCard } from "@/components/form-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { updateProfile } from "./actions";
import { useDebouncedSave } from "@/lib/use-debounced-save";
import { Upload, Loader2 } from "lucide-react";

export function SettingsForm({
  email,
  initialFullName,
  initialCompanyName,
  initialAvatarUrl,
}: {
  email: string;
  initialFullName: string;
  initialCompanyName: string;
  initialAvatarUrl: string | null;
}) {
  const [fullName, setFullName] = useState(initialFullName);
  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const save = async (p: Record<string, unknown>) => {
    await updateProfile({ full_name: p.fullName as string, company_name: p.company_name as string });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  const { scheduleSave } = useDebouncedSave(save);

  const handleFullNameChange = (value: string) => {
    setFullName(value);
    scheduleSave({ fullName: value, company_name: companyName });
  };
  const handleCompanyChange = (value: string) => {
    setCompanyName(value);
    scheduleSave({ fullName: fullName, company_name: value });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${urlData.publicUrl}?t=${Date.now()}`;
      await updateProfile({ avatar_url: url });
      setAvatarUrl(url);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <FormCard>
        <h3 className="text-lg font-semibold text-foreground mb-4">Profile photo</h3>
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 rounded-xl border-2 border-border">
            <AvatarImage src={avatarUrl ?? undefined} alt="" />
            <AvatarFallback className="rounded-xl bg-muted text-xl text-muted-foreground">
              {(fullName || email).slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-border text-foreground"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {uploading ? "Uploading…" : "Upload photo"}
            </Button>
          </div>
        </div>
      </FormCard>

      <FormCard>
        <h3 className="text-lg font-semibold text-foreground mb-4">Profile details</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground">Email</Label>
            <Input value={email} disabled className="rounded-xl bg-muted border-border text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Email is managed by your account provider.</p>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Full name</Label>
            <Input
              value={fullName}
              onChange={(e) => handleFullNameChange(e.target.value)}
              placeholder="Your name"
              className="rounded-xl bg-muted border-border text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">Company name</Label>
            <Input
              value={companyName}
              onChange={(e) => handleCompanyChange(e.target.value)}
              placeholder="Company"
              className="rounded-xl bg-muted border-border text-foreground"
            />
          </div>
          {saved && <p className="text-sm text-primary">Saved.</p>}
        </div>
      </FormCard>
    </div>
  );
}
