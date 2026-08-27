"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, User, Building, Loader2, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp, signIn } from "@/lib/auth/client";

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

    // Client-side pre-validation
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const result = await signUp.email({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
      });

      if (result.error) {
        // If user already exists, attempt automatic sign-in with the credentials
        if (
          result.error.status === 422 ||
          result.error.message?.toLowerCase().includes("exist") ||
          result.error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
        ) {
          try {
            const signInRes = await signIn.email({
              email: email.trim().toLowerCase(),
              password,
            });

            if (!signInRes.error) {
              router.push("/dashboard");
              return;
            }
          } catch {
            // Ignore sign-in failure and display user-friendly message
          }

          setError("An account with this email already exists. Please sign in with your password or use Instant Demo Access.");
          return;
        }

        setError(result.error.message || "Failed to create account. Please try again.");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred during registration";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-[#c7c4d8] bg-white text-[#191c1d] shadow-sm rounded-xl overflow-hidden">
      <CardHeader className="space-y-1 p-6 border-b border-[#e9ecef]">
        <CardTitle className="text-xl font-bold tracking-tight text-[#191c1d]">
          Create Merchant Account
        </CardTitle>
        <CardDescription className="text-xs text-[#464555]">
          Get started with AI-driven payment orchestration and revenue intelligence.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-3.5 p-6">
          {error && (
            <div className="p-3 rounded-lg bg-[#ffdad6] border border-[#ba1a1a]/20 text-[#93000a] text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-semibold text-[#464555]">
              Full Name
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#777587]" />
              <Input
                id="name"
                required
                placeholder="Abhijeet Varma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-8 bg-[#f8f9fa] border-[#c7c4d8] text-xs text-[#191c1d] placeholder:text-[#777587] focus-visible:ring-1 focus-visible:ring-[#2a21d2]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="merchant-name" className="text-xs font-semibold text-[#464555]">
              Business / Organization Name
            </Label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#777587]" />
              <Input
                id="merchant-name"
                required
                placeholder="Acme Payments Ltd"
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                className="pl-8 bg-[#f8f9fa] border-[#c7c4d8] text-xs text-[#191c1d] placeholder:text-[#777587] focus-visible:ring-1 focus-visible:ring-[#2a21d2]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-semibold text-[#464555]">
              Email address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#777587]" />
              <Input
                id="email"
                type="email"
                required
                placeholder="merchant@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-8 bg-[#f8f9fa] border-[#c7c4d8] text-xs text-[#191c1d] placeholder:text-[#777587] focus-visible:ring-1 focus-visible:ring-[#2a21d2]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-semibold text-[#464555]">
              Password (min. 6 characters)
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#777587]" />
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-8 bg-[#f8f9fa] border-[#c7c4d8] text-xs text-[#191c1d] placeholder:text-[#777587] focus-visible:ring-1 focus-visible:ring-[#2a21d2]"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2a21d2] hover:bg-[#2a21d2]/90 text-white gap-2 font-semibold text-xs h-9 shadow-xs mt-2 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>Register &amp; Continue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>

          {/* Quick Demo Access Option */}
          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard")}
              className="w-full border-[#c7c4d8] bg-[#f8f9fa] hover:bg-[#f3f4f5] text-[#191c1d] text-xs font-semibold h-9 gap-1.5 shadow-xs cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#2a21d2]" />
              <span>Instant Demo Access (Skip Setup)</span>
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-[#e9ecef] p-4 bg-[#f8f9fa]">
          <p className="text-xs text-[#464555]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[#2a21d2] font-semibold hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
