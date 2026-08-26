# AI Payment Infrastructure & Revenue Copilot

An enterprise-grade payment operations platform built around **Razorpay Test Mode** that provides deterministic payment orchestration, double-entry financial ledger invariance, multi-tiered idempotency, webhook reliability, anomaly detection, and natural-language revenue intelligence.

---

## 🌟 Overview & Capabilities

Traditional payment integrations often suffer from edge cases: dropped webhooks, race conditions resulting in double charges, silent state desynchronization, and complex financial reconciliation. 

**AI Payment Infrastructure & Revenue Copilot** addresses these challenges by combining:
1. **Deterministic State Machine**: Strict guard transitions across all payment lifecycles preventing invalid states.
2. **Immutable Double-Entry Ledger**: Double-entry accounting principles (`CREDIT` on capture, `DEBIT` on refund) guarantee zero financial discrepancies.
3. **Multi-Tiered Idempotency**: Redis distributed locking + cached responses backed by PostgreSQL unique constraints.
4. **Resilient Webhook Processing**: HMAC-SHA256 signature verification, event deduplication, and durable Inngest background workflows.
5. **Statistical Anomaly Detection**: 7-day moving averages and z-score deviation scoring detecting failure spikes and drop-offs.
6. **Conversational AI Copilot**: Grounded AI assistant (Gemini / OpenAI) with controlled database tool-calling for real-time revenue analytics.

---

## 🏛️ System Architecture

```mermaid
graph TD
    subgraph "Client Layer"
        A[Merchant Dashboard] --> B[Next.js App Router]
        A --> C[Razorpay Test Checkout Modal]
    end

    subgraph "Application Layer"
        B --> D[REST API Routes]
        D --> E[Service Layer]
        E --> F[Payment State Machine]
        E --> G[Double-Entry Ledger]
        E --> H[Razorpay SDK Client]
        E --> I[AI Abstraction Layer]
    end

    subgraph "External Gateway & AI"
        C --> J[Razorpay Test Gateway]
        H --> J
        J --> K[Webhook Events]
        I --> L[Google Gemini / OpenAI]
    end

    subgraph "Durable Infrastructure"
        K --> D
        D --> M[Inngest Event Bus]
        M --> N[Inngest Step Functions]
        N --> E
        G --> O[(PostgreSQL / Prisma 7)]
        E --> P[(Redis Caching & Locks)]
    end

    subgraph "Intelligence & Operations"
        O --> Q[Analytics Engine]
        Q --> R[Daily Metrics Cron]
        Q --> S[Anomaly Detection]
        S --> T[AI Copilot Analysis]
        R --> T
    end
```

---

## 🔄 Payment Lifecycle & State Machine

```mermaid
stateDiagram-v2
    [*] --> CREATED: Order Created
    CREATED --> PROCESSING: Checkout Initiated
    CREATED --> FAILED: Pre-authorization Error
    PROCESSING --> AUTHORIZED: Card/UPI Authorized
    PROCESSING --> CAPTURED: Direct Capture
    PROCESSING --> SUCCESS: Payment Verified
    PROCESSING --> PENDING: Awaiting Bank Confirmation
    PROCESSING --> FAILED: Bank Declined / Timeout
    AUTHORIZED --> CAPTURED: Capture API
    AUTHORIZED --> FAILED: Capture Expired
    CAPTURED --> SUCCESS: Ledger Recorded
    CAPTURED --> FAILED: Post-capture Void
    PENDING --> SUCCESS: Webhook Confirmation
    PENDING --> FAILED: Webhook Failure
    SUCCESS --> PARTIALLY_REFUNDED: Partial Refund
    SUCCESS --> REFUNDED: Full Refund
    PARTIALLY_REFUNDED --> PARTIALLY_REFUNDED: Additional Partial Refund
    PARTIALLY_REFUNDED --> REFUNDED: Balance Depleted
    REFUNDED --> [*]
    FAILED --> [*]
```

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
|---|---|---|
| **Framework** | Next.js 16 (App Router + Turbopack) | Full-stack React 19 architecture |
| **Language** | TypeScript (Strict Mode) | End-to-end type safety |
| **Database & ORM** | PostgreSQL + Prisma 7 | Schema modeling, driver adapters & migrations |
| **Caching & Locking** | Redis (`ioredis`) | Distributed mutex locks and idempotency cache |
| **Auth & Sessions** | Better Auth | Session management & PostgreSQL adapter |
| **Payment Gateway** | Razorpay Node.js SDK | Order creation, signatures & Test Mode checkout |
| **Background Workflows** | Inngest | Durable async execution & retries |
| **AI Intelligence** | Gemini / OpenAI (`ai` SDK) | Tool-calling financial reasoning |
| **Visual Analytics** | Recharts & Lucide React | High-performance dashboard visualizations |
| **Validation** | Zod | Runtime API request & response validation |

---

## 🔐 Security & Test Mode Policy

> [!CAUTION]
> **Zero Real Money Guarantee**:
> - All Razorpay integrations strictly mandate keys starting with `rzp_test_`. Any attempt to load live production credentials will halt instantiation.
> - No card numbers, CVVs, PINs, OTPs, or customer credentials are ever transmitted or stored on application servers.
> - HMAC-SHA256 signature verification is strictly enforced on both client checkout returns and webhook ingestion.

---

## 🗄️ Database Schema (14 Models)

```mermaid
erDiagram
    User ||--o{ Session : has
    User ||--o{ Account : has
    User ||--|| Merchant : owns
    Merchant ||--o{ Order : creates
    Merchant ||--o{ Payment : receives
    Merchant ||--o{ Transaction : records
    Merchant ||--o{ Refund : issues
    Merchant ||--o{ WebhookEvent : logs
    Merchant ||--o{ PaymentEvent : tracks
    Merchant ||--o{ AuditLog : audits
    Merchant ||--o{ Anomaly : detects
    Merchant ||--o{ DailyMetric : computes
    Merchant ||--o{ AIConversation : consults
    Merchant ||--o{ IdempotencyRecord : locks
    Order ||--o{ Payment : fulfills
    Payment ||--o{ Transaction : logs
    Payment ||--o{ Refund : allows
    Payment ||--o{ PaymentEvent : generates
    AIConversation ||--o{ AIMessage : contains
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js 20+
- PostgreSQL database (Local, Docker, Neon, Supabase, or Railway)
- Redis instance (Local, Docker, or Upstash)
- Razorpay Test Account (`rzp_test_...`)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Abhijeetkv/AI-Payment-Infrastructure-and-Revenue-Copilot.git
cd AI-Payment-Infrastructure-and-Revenue-Copilot

# Install dependencies
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Configure your environment variables:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/payment_copilot?schema=public"
REDIS_URL="redis://localhost:6379"
BETTER_AUTH_SECRET="generate-a-strong-32-char-random-secret"
BETTER_AUTH_URL="http://localhost:3000"
RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxx"
RAZORPAY_KEY_SECRET="your_test_key_secret"
RAZORPAY_WEBHOOK_SECRET="your_webhook_secret"
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxx"
AI_PROVIDER="gemini"
GEMINI_API_KEY="your-gemini-api-key"
```

### 4. Database Setup & Prisma Generation
```bash
npx prisma generate
```

### 5. Running the Application
```bash
# Start development server
npm run dev

# Start Inngest local dev server (in separate terminal)
npx inngest-cli@latest dev
```
Open [http://localhost:3000](http://localhost:3000) to view the merchant dashboard.

---

## 🧪 Testing & Verification

```bash
# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Production bundle build
npm run build
```

## 📄 License
MIT License. Built for resilient, AI-powered payment infrastructure operations.
