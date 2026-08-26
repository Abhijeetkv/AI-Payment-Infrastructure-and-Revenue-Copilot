import { Inngest } from "inngest";

export type Events = {
  "payment/created": {
    data: {
      paymentId: string;
      merchantId: string;
    };
  };
  "payment/process": {
    data: {
      paymentId: string;
      merchantId: string;
    };
  };
  "payment/status.changed": {
    data: {
      paymentId: string;
      merchantId: string;
      fromStatus: string;
      toStatus: string;
    };
  };
  "refund/created": {
    data: {
      refundId: string;
      merchantId: string;
    };
  };
  "refund/process": {
    data: {
      refundId: string;
      paymentId: string;
      merchantId: string;
    };
  };
  "webhook/received": {
    data: {
      webhookEventId: string;
    };
  };
  "webhook/process": {
    data: {
      webhookEventId: string;
    };
  };
  "analytics/daily": {
    data: {
      merchantId: string;
      date: string;
    };
  };
  "anomaly/detected": {
    data: {
      anomalyId: string;
      merchantId: string;
    };
  };
};

export const inngest = new Inngest({
  id: "ai-payment-copilot",
  eventKey: process.env.INNGEST_EVENT_KEY || "local",
});
