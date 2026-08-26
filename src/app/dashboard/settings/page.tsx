import { Shield, Key } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Account & Gateway Settings
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage your merchant profile, Razorpay Test Mode keys, and webhook endpoints.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <CardTitle>Razorpay Test Credentials</CardTitle>
            </div>
            <CardDescription>
              Test Mode credentials used to process simulated transactions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key-id">Key ID</Label>
              <Input
                id="key-id"
                defaultValue="rzp_test_••••••••••••"
                readOnly
                className="font-mono text-xs bg-zinc-50 dark:bg-zinc-900"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook-secret">Webhook Secret</Label>
              <Input
                id="webhook-secret"
                defaultValue="••••••••••••••••••••••••"
                readOnly
                type="password"
                className="font-mono text-xs bg-zinc-50 dark:bg-zinc-900"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <CardTitle>Environment Protection</CardTitle>
            </div>
            <CardDescription>
              Security validations enforced by the application core.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm py-1">
              <span className="text-zinc-600 dark:text-zinc-300">Live Mode Prevention</span>
              <Badge variant="success">Enforced</Badge>
            </div>
            <div className="flex items-center justify-between text-sm py-1">
              <span className="text-zinc-600 dark:text-zinc-300">HMAC Webhook Signature Checking</span>
              <Badge variant="success">Strict</Badge>
            </div>
            <div className="flex items-center justify-between text-sm py-1">
              <span className="text-zinc-600 dark:text-zinc-300">Double-Entry Ledger Invariance</span>
              <Badge variant="success">Enabled</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
