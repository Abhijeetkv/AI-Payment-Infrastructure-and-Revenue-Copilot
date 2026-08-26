"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, User, Building, Loader2, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/auth/client";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [merchantName, setMerchantName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signUp.email({
        email,
        password,
        name,
      });

      if (result.error) {
        setError(result.error.message || "Failed to create account.");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/90 text-white shadow-2xl backdrop-blur-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-bold tracking-tight text-white">
          Create Merchant Account
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Get started with AI-driven payment orchestration and revenue intelligence.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-300">
              Full Name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                id="name"
                required
                placeholder="Abhijeet Varma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="merchant-name" className="text-zinc-300">
              Business / Merchant Name
            </Label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                id="merchant-name"
                required
                placeholder="Acme Payments Ltd"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                className="pl-9 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">
              Email address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                id="email"
                type="email"
                required
                placeholder="merchant@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-300">
              Password
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                id="password"
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-medium"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>Register & Continue</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-zinc-800/80 pt-4">
          <p className="text-xs text-zinc-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-indigo-400 font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
