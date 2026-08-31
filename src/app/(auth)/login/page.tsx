"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/auth/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("merchant@example.com");
  const [password, setPassword] = React.useState("password123");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn.email({
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message || "Failed to sign in. Please check credentials.");
      } else {
        router.push("/");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-zinc-200/80 bg-white text-zinc-900 shadow-sm rounded-xl">
      <CardHeader className="space-y-1 p-6 border-b border-zinc-100">
        <CardTitle className="text-xl font-bold tracking-tight text-zinc-900">
          Sign In to Workspace
        </CardTitle>
        <CardDescription className="text-xs text-zinc-500">
          Enter your merchant credentials to access payment infrastructure &amp; copilot.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 p-6">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-zinc-700">
              Email address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <Input
                id="email"
                type="email"
                required
                placeholder="merchant@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-8 bg-zinc-50/70 border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-400"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-xs font-semibold text-zinc-700">
                Password
              </Label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <Input
                id="password"
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-8 bg-zinc-50/70 border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-400"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2a21d2] hover:bg-[#2a21d2]/90 text-white gap-2 font-semibold text-xs h-9 shadow-xs cursor-pointer"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>Sign In with Credentials</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>

          {/* Quick Demo Login Option */}
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/")}
              className="w-full border-[#c7c4d8] bg-[#f8f9fa] hover:bg-[#f3f4f5] text-[#191c1d] text-xs font-semibold h-9 gap-1.5 shadow-xs cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#2a21d2]" />
              <span>Instant Demo Login (No Password Required)</span>
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-[#e9ecef] p-4 bg-[#f8f9fa]">
          <p className="text-xs text-[#464555]">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-[#2a21d2] font-semibold hover:underline"
            >
              Register merchant
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
