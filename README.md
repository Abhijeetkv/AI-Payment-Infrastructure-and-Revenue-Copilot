# Lumina — AI Revenue Recovery Agent

An enterprise-grade autonomous AI Revenue Recovery Agent built for the **Razorpay AI Buildathon 2026 (AI Revenue Recovery Track)**.

Lumina actively monitors payment infrastructure, detects at-risk revenue from failures and check-out drop-offs, calculates recovery probabilities, determines policy-guarded recovery interventions, executes durable workflows via Razorpay Test Mode and Inngest, and measures the money actually recovered in an immutable double-entry financial ledger.

---

## 🌟 The Core Problem

Merchants lose significant top-line revenue because of:
1. **Payment Failures**: Transient bank declines and gateway drops.
2. **Payment Method Degradation**: Sudden drops in route reliability (e.g., UPI route down).
3. **Checkout Drop-offs**: Customers abandoning failed transactions without retry.
4. **Untracked Leakage**: Standard dashboards merely report historical failures without actively recovering money.

Lumina transforms payment infrastructure from passive reporting into an **active revenue recovery agent**:

> **Detect what is at risk → Reason why it is at risk → Recommend bounded intervention → Enforce deterministic policy guardrails → Execute durable workflow → Measure ₹ actually recovered.**

---

## 🔄 The Central Recovery Loop

```text
Payment Failure Event
         ↓
Revenue At Risk Detection (Deterministic)
         ↓
Failure & Customer Telemetry Analysis
         ↓
AI Recovery Recommendation (Advisory)
         ↓
Policy Engine Guardrails (Deterministic Gatekeeper)
         ↓
Bounded Recovery Workflow (Inngest Durable Execution)
         ↓
Outcome Detection (Razorpay Test Mode Webhook)
         ↓
Double-Entry Transaction Ledger Credit
         ↓
Measure ₹ Actually Recovered & Audit Trail
```

---

## 🏛️ System Architecture

```mermaid
graph TD
    subgraph "Merchant Experience"
        A[Command Center Dashboard] --> B[Next.js App Router]
        A --> C[Recovery Cases Pipeline]
        A --> D[Agent Activity Stream]
    end

    subgraph "Core Recovery Layer"
        B --> E[RevenueRiskEngine]
        B --> F[RecoveryService]
        B --> G[RecoveryPolicyEngine]
        B --> H[AI Recovery Agent]
    end

    subgraph "Financial & State Infrastructure"
        F --> I[Payment State Machine]
        F --> J[Immutable Double-Entry Ledger]
        F --> K[Audit Log Service]
    end

    subgraph "Durable Execution & Gateway"
        F --> L[Inngest Durable Step Functions]
        L --> M[Razorpay Test Mode Client]
        M --> N[Razorpay Webhook Events]
        N --> L
    end
```

---

## 🛡️ Key Architectural Principles

1. **Deterministic Financial Truth**: AI agents never calculate financial numbers or ledger balances. Revenue at risk and recovered revenue are computed deterministically from PostgreSQL transactions.
2. **AI with Bounded Authority**: The AI recommends actions (`PAYMENT_RETRY`, `ALTERNATE_METHOD`, `SCHEDULED_RETRY`, `MERCHANT_ESCALATION`, `STOP_RECOVERY`), but the deterministic `RecoveryPolicyEngine` strictly decides whether actions are permitted.
3. **Strict Stopping Rules**: Recovery cases enforce maximum attempt thresholds, expiration limits, minimum recovery probability bounds, and duplicate prevention. Runaway retries are strictly impossible.
4. **Auditability & Explainability**: Every AI recommendation details *"Why this action?"* with verified customer history, method performance, and clear policy check results.

---

## 🚀 Quick Start & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Copy `.env.example` to `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/payment_copilot?schema=public"
REDIS_URL="redis://localhost:6379"
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
RAZORPAY_WEBHOOK_SECRET="..."
GEMINI_API_KEY="your-gemini-api-key"
AI_PROVIDER="gemini"
```

### 3. Generate Database Client & Seed Data
```bash
npx prisma generate
npm run dev
```

### 4. Run Automated Test Suite
```bash
npx vitest run
```

---

## 📊 Verification & Test Coverage

| Test Suite | Coverage Area | Status |
|---|---|---|
| `tests/recovery-policy.test.ts` | Policy guardrails, max attempts, stopping rules, probability thresholds | ✅ Passed (6/6) |
| `tests/recovery.test.ts` | Recovery domain models, probability calculations, financial metrics | ✅ Passed (6/6) |
| `tests/state-machine.test.ts` | Deterministic payment lifecycle transitions & invariant guards | ✅ Passed (6/6) |
| `tests/ledger.test.ts` | Double-entry accounting invariance (CREDIT / DEBIT) & balance safety | ✅ Passed (3/3) |
| `tests/idempotency.test.ts` | Multi-tiered idempotency hashing & replay protection | ✅ Passed (2/2) |
| `tests/refund.test.ts` | Safe refund bounds against live ledger balances | ✅ Passed (3/3) |

---

## 🏆 Built for Razorpay AI Buildathon 2026
Track: **AI Revenue Recovery**
Lumina — AI Revenue Recovery Agent
