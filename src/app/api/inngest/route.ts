import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";

// All Inngest functions will be registered here as they are implemented
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    /* functions will be added in subsequent phases */
  ],
});
