"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const quickAccessUsers = [
  { role: "Staff", email: "staff@neoconnect.local" },
  { role: "Secretariat", email: "secretariat@neoconnect.local" },
  { role: "Case Manager", email: "manager@neoconnect.local" },
  { role: "Admin", email: "admin@neoconnect.local" },
];

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("staff@neoconnect.local");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }
      toast.success("Signed in successfully.");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-10">
      <div className="grid w-full gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-white/60 bg-white/75 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-3xl">Sign in to NeoConnect</CardTitle>
            <CardDescription>Use one of the starter accounts below or sign in with your own account once user setup is complete.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {quickAccessUsers.map((user) => (
              <button
                key={user.email}
                type="button"
                className="rounded-xl border bg-slate-50 px-4 py-3 text-left transition hover:bg-cyan-50"
                onClick={() => setEmail(user.email)}
              >
                <div className="font-medium">{user.role}</div>
                <div className="text-sm text-muted-foreground">{user.email}</div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Use your work email and password to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              </div>
              <Button disabled={loading} type="submit">
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
