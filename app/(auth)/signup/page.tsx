"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { createProfileForUser } from "@/app/(auth)/signup/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error: err } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data.user) {
      await createProfileForUser(data.user.id, fullName || undefined);
    }
    router.push("/onboarding/business-assessment");
    router.refresh();
  }

  return (
    <Card className="border-border bg-card shadow-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-foreground">Create account</CardTitle>
        <CardDescription className="text-muted-foreground">
          Enter your details to get started
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-foreground">Full name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring rounded-xl"
            />
          </div>
          <Button
            type="submit"
            className="w-full rounded-xl"
            disabled={loading}
          >
            {loading ? "Creating account…" : "Sign up"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-foreground underline hover:no-underline">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
