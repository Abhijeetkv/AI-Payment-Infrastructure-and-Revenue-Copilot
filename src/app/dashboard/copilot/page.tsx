import { Bot, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CopilotPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              AI Revenue Copilot
            </h1>
            <Badge variant="default" className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-0">
              <Sparkles className="h-3 w-3 mr-1" />
              Phase 8
            </Badge>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Natural-language financial intelligence powered by tool-calling AI (Gemini / OpenAI) with direct PostgreSQL metrics.
          </p>
        </div>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Bot className="h-6 w-6" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Conversational Payment Analyst
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Interactive chat interface with tool call inspection, streaming responses, and verified DB queries will activate in Phase 8.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
