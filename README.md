# Lumina — Autonomous AI Revenue Recovery Agent

An enterprise-grade autonomous AI Revenue Recovery Agent built for the **Razorpay AI Buildathon 2026 (AI Revenue Recovery Track)**.

Lumina actively monitors payment infrastructure, detects at-risk revenue from failures and check-out drop-offs, calculates recovery probabilities, determines policy-guarded recovery interventions, executes durable workflows via Razorpay Test Mode and Inngest, and measures the money actually recovered in an immutable double-entry financial ledger.

---

## The Core Problem

Online businesses routinely lose 5% to 15% of top-line revenue due to:
1. **Payment Failures**: Transient bank declines, issuer timeouts, and network interruptions.
2. **Payment Method Degradation**: Sudden reliability drops across specific payment routes (e.g., temporary UPI downtime).
3. **Checkout Drop-offs**: High-intent customers abandoning failed transactions without targeted, friction-free alternative routes.
4. **Passive Infrastructure**: Traditional systems log failed revenue after the loss is permanent, lacking autonomous recovery mechanisms.

---

## The Central Recovery Loop

```text
Payment Failure / Webhook Event
              ↓
Deterministic Revenue-at-Risk Engine (Risk Amount Computed)
              ↓
Failure & Customer Telemetry Analysis (Historical conversion, route health)
              ↓
AI Recovery Agent (Advisory recommendation + confidence score + evidence factors)
              ↓
Recovery Policy Engine (Deterministic gatekeeper — 5 strict safety rules)
              ↓
Bounded Workflow Execution (Inngest Durable Async Runner)
              ↓
Outcome Detection (Razorpay Webhook Verification)
              ↓
Double-Entry Ledger Credit (Immutable Transaction Record)
              ↓
Audit Trail & Revenue Impact Analytics
```

---

## System Architecture

```mermaid
graph TD
    subgraph "Merchant Command Center"
        A["Overview Command Center (/)"] --> B["Next.js App Router"]
        C["Recovery Pipeline (/recovery)"] --> B
        D["AI Copilot (/copilot)"] --> B
        E["Agent Stream (/agent)"] --> B
        F["Chaos Simulator (/simulator)"] --> B
    end

    subgraph "Core AI & Recovery Layer"
        B --> G["RevenueRiskService"]
        B --> H["RecoveryService"]
        B --> I["RecoveryPolicyEngine"]
        B --> J["AI Agent & Copilot (Gemini 2.0 / OpenAI)"]
    end

    subgraph "Financial & State Infrastructure"
        H --> K["Payment State Machine"]
        H --> L["Immutable Double-Entry Ledger"]
        H --> M["Audit Log Service"]
        H --> N["Statistical Anomaly Engine"]
    end

    subgraph "Durable Execution & Gateway"
        H --> O["Inngest Durable Step Functions"]
        O --> P["Razorpay Client"]
        P --> Q["Razorpay Webhook Ingestion"]
        Q --> O
    end
```

---

## Key Architectural Principles

1. **Deterministic Financial Truth**: AI models never compute financial balances or ledger states. All revenue numbers, amounts at risk, and recovered balances are calculated deterministically from PostgreSQL transactions.
2. **AI with Bounded Authority**: The AI recommends interventions (`PAYMENT_RETRY`, `ALTERNATE_METHOD`, `SCHEDULED_RETRY`, `MERCHANT_ESCALATION`, `STOP_RECOVERY`), while the deterministic `RecoveryPolicyEngine` strictly validates whether the action is permitted.
3. **Strict Stopping Rules**: Recovery workflows enforce hard limits on retry attempts (<= 3), expiration windows, minimum probability thresholds (>= 15%), and duplicate prevention.
4. **Customer Recovery Touchpoints**: For scenarios requiring alternative payment methods, Lumina automatically generates customized, secure payment recovery links (WhatsApp, SMS, Email).
5. **Audited Double-Entry Ledger**: Every recovered transaction produces an immutable CREDIT record, ensuring financial invariance across all operations.

---

## Application Route Map

| Route | Module | Purpose |
|---|---|---|
| `/` | **Overview Command Center** | Real-time recovery KPI metrics, 5-stage pipeline funnel, and impact comparisons. |
| `/recovery` | **Recovery Cases Pipeline** | Live stream of detected payment failures with recovery probabilities, failure reasons, and filters. |
| `/recovery/[id]` | **Case Detail Inspector** | In-depth explainability: AI reasoning, confidence gauge, deterministic policy checks, customer touchpoint preview, and audit timeline. |
| `/recovery/campaigns` | **Recovery Campaigns** | Batch processing across failed payment cohorts (1h, 6h, 24h, 48h). |
| `/copilot` | **AI Financial Copilot** | Multi-threaded conversational copilot powered by 10 database-grounded tools. |
| `/agent` | **Agent Activity Stream** | Real-time event log of autonomous recovery evaluations, policy checks, and retry executions. |
| `/anomalies` | **Anomaly Monitor** | 7-day rolling statistical anomaly detector (z-score) for payment failures and revenue drops. |
| `/analytics` | **Financial Analytics** | Period-over-period revenue trends, method distribution breakdown, and daily rollups. |
| `/simulator` | **Fault & Chaos Simulator** | Interactive fault injection for network timeouts, bank declines, HMAC tampering, duplicate replays, and concurrent refund races. |
| `/settings` | **Settings & Seed Generator** | System configuration, credentials inspector, and one-click 90-day telemetry seed generator. |

---

## Technology Stack

- **Framework**: Next.js 16 (App Router, Turbopack, React 19)
- **Language**: TypeScript (Strict Mode)
- **Database & ORM**: PostgreSQL via Prisma ORM (14 data models)
- **Payment Gateway**: Razorpay Node.js SDK (Orders, Payments, Refunds, Webhook Signatures)
- **Durable Async Execution**: Inngest (Step functions, scheduled crons, automated retries)
- **AI Models**: Google Gemini 2.0 Flash (`@google/generative-ai`) / OpenAI GPT-4o-mini (`openai`) with deterministic fallback
- **Caching & Locks**: Redis (`ioredis`) for multi-tiered idempotency and distributed mutexes
- **Charts & Visualization**: Recharts & Lucide React
- **Testing**: Vitest

---

## Quick Start

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Abhijeetkv/AI-Payment-Infrastructure-and-Revenue-Copilot.git
cd AI-Payment-Infrastructure-and-Revenue-Copilot
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```env
# Database & Cache
DATABASE_URL="postgresql://user:password@localhost:5432/payment_copilot?schema=public"
REDIS_URL="redis://localhost:6379"

# Razorpay Credentials
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
RAZORPAY_WEBHOOK_SECRET="..."

# AI Engine Configuration
GEMINI_API_KEY="your-gemini-api-key"
OPENAI_API_KEY="optional-openai-key"
AI_PROVIDER="gemini"

# Inngest Configuration
INNGEST_EVENT_KEY="test"
INNGEST_SIGNING_KEY="test"

# Authentication
BETTER_AUTH_SECRET="your-32-char-random-secret"
BETTER_AUTH_URL="http://localhost:3000"
```

### 3. Initialize Database & Run Development Server
```bash
npx prisma generate
npx prisma db push
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Test Suite & Verification

The test suite covers financial invariance, state transitions, and recovery policy guardrails:

```bash
npx vitest run
```

| Test Suite | Coverage Area | Assertions | Status |
|---|---|---|---|
| `tests/recovery-policy.test.ts` | Policy guardrails, max attempt limits, stopping rules, probability gates | 8 tests | Passed |
| `tests/recovery.test.ts` | Recovery domain models, probability scoring, deterministic fallback | 9 tests | Passed |
| `tests/state-machine.test.ts` | Deterministic payment lifecycle transitions & invariant guards | 6 tests | Passed |
| `tests/ledger.test.ts` | Double-entry accounting invariance (CREDIT / DEBIT) & balance safety | 3 tests | Passed |
| `tests/idempotency.test.ts` | Multi-tiered idempotency hashing & replay protection | 2 tests | Passed |
| `tests/refund.test.ts` | Safe refund bounds against live ledger balance | 3 tests | Passed |
