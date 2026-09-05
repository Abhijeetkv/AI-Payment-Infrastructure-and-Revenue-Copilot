import "dotenv/config";
import { db } from "@/lib/db";
import { MerchantService } from "@/server/services/merchant.service";
import { createRazorpayOrder } from "@/lib/razorpay/orders";
import { RecoveryService } from "@/server/services/recovery.service";
import {
  OrderStatus,
  PaymentStatus,
  TransactionType,
  TransactionDirection,
  TransactionStatus,
} from "@prisma/client";

interface ScenarioOrder {
  amount: number; // in paise
  receipt: string;
  customerName: string;
  customerEmail: string;
  method: "upi" | "card" | "netbanking";
  status: "SUCCESS" | "FAILED";
  failureReason?: string;
}

const TEST_SCENARIOS: ScenarioOrder[] = [
  {
    amount: 249900, // ₹2,499.00
    receipt: `rcpt_upi_${Date.now()}`,
    customerName: "Aarav Sharma",
    customerEmail: "aarav.sharma@example.com",
    method: "upi",
    status: "FAILED",
    failureReason: "BAD_REQUEST_PAYMENT_TIMED_OUT: Upstream UPI PSP gateway did not respond",
  },
  {
    amount: 149900, // ₹1,499.00
    receipt: `rcpt_card_${Date.now()}`,
    customerName: "Priya Patel",
    customerEmail: "priya.patel@example.com",
    method: "card",
    status: "FAILED",
    failureReason: "BAD_REQUEST_PAYMENT_DECLINED: Issuer bank declined due to temporary card block",
  },
  {
    amount: 499900, // ₹4,999.00
    receipt: `rcpt_nb_${Date.now()}`,
    customerName: "Rohan Gupta",
    customerEmail: "rohan.gupta@example.com",
    method: "netbanking",
    status: "FAILED",
    failureReason: "GATEWAY_ERROR: Netbanking 2FA session expired on bank portal",
  },
  {
    amount: 89900, // ₹899.00
    receipt: `rcpt_upi2_${Date.now()}`,
    customerName: "Ananya Verma",
    customerEmail: "ananya.verma@example.com",
    method: "upi",
    status: "FAILED",
    failureReason: "BAD_REQUEST_PAYMENT_TIMED_OUT: User did not approve UPI collect request",
  },
  {
    amount: 799900, // ₹7,999.00
    receipt: `rcpt_card2_${Date.now()}`,
    customerName: "Vikram Singh",
    customerEmail: "vikram.singh@example.com",
    method: "card",
    status: "SUCCESS",
  },
  {
    amount: 329900, // ₹3,299.00
    receipt: `rcpt_upi3_${Date.now()}`,
    customerName: "Sneha Reddy",
    customerEmail: "sneha.reddy@example.com",
    method: "upi",
    status: "SUCCESS",
  },
];

async function seedRazorpayTestData() {
  console.log("==================================================");
  console.log("🚀 Starting Razorpay Test Data Seeding...");
  console.log("==================================================");

  const merchant = await MerchantService.getOrCreateDefaultMerchant();
  console.log(`✓ Merchant Verified: ${merchant.name} (${merchant.id})\n`);

  let createdOrders = 0;
  let createdPayments = 0;

  for (const s of TEST_SCENARIOS) {
    try {
      console.log(`[Creating Razorpay Order] ₹${(s.amount / 100).toFixed(2)} for ${s.customerName}...`);

      // 1. Call Razorpay Test API to create real test order
      const rzpOrder = await createRazorpayOrder({
        amount: s.amount,
        currency: "INR",
        receipt: s.receipt,
        notes: {
          customer_name: s.customerName,
          customer_email: s.customerEmail,
          payment_method: s.method,
          scenario_status: s.status,
        },
      });

      console.log(`  ✓ Razorpay Order ID: ${rzpOrder.id}`);

      // 2. Persist in database
      const order = await db.order.create({
        data: {
          merchantId: merchant.id,
          amount: s.amount,
          currency: "INR",
          status: s.status === "SUCCESS" ? OrderStatus.PAID : OrderStatus.FAILED,
          razorpayOrderId: rzpOrder.id,
          receipt: s.receipt,
          notes: JSON.stringify({
            customer: s.customerName,
            email: s.customerEmail,
          }),
        },
      });
      createdOrders++;

      // 3. Create Payment record
      const rzpPaymentId = `pay_${rzpOrder.id.replace("order_", "")}_${Math.floor(Math.random() * 1000)}`;
      const payment = await db.payment.create({
        data: {
          merchantId: merchant.id,
          orderId: order.id,
          razorpayPaymentId: rzpPaymentId,
          razorpayOrderId: rzpOrder.id,
          amount: s.amount,
          currency: "INR",
          status: s.status === "SUCCESS" ? PaymentStatus.SUCCESS : PaymentStatus.FAILED,
          paymentMethod: s.method,
          failureReason: s.failureReason || null,
        },
      });
      createdPayments++;

      // 4. If SUCCESS, credit the financial ledger
      if (s.status === "SUCCESS") {
        await db.transaction.create({
          data: {
            merchantId: merchant.id,
            paymentId: payment.id,
            orderId: order.id,
            type: TransactionType.PAYMENT,
            direction: TransactionDirection.CREDIT,
            amount: s.amount,
            currency: "INR",
            status: TransactionStatus.COMPLETED,
            referenceId: rzpPaymentId,
            description: `Payment captured via ${s.method.toUpperCase()} (${s.receipt})`,
          },
        });
        console.log(`  ✓ Ledger Credited: +₹${(s.amount / 100).toFixed(2)}`);
      } else {
        console.log(`  ⚠ Recorded Failure: ${s.failureReason?.split(":")[0]}`);
      }

      console.log("");
    } catch (err: any) {
      console.error(`  ✗ Failed for ${s.receipt}:`, err?.message || err);
    }
  }

  // 5. Automatically trigger Lumina's AI Case Detection
  console.log("--------------------------------------------------");
  console.log("🧠 Running Lumina AI Recovery Case Detection...");
  const cases = await RecoveryService.detectAndCreateCases(merchant.id, {
    since: new Date(Date.now() - 3600000), // last hour
    limit: 10,
  });

  console.log(`✓ Lumina AI generated ${cases.created} active Recovery Cases from failed test orders!`);
  console.log("==================================================");
  console.log("🎉 Seeding Completed Successfully!");
  console.log(`• Real Razorpay Orders Created: ${createdOrders}`);
  console.log(`• Test Payments Recorded: ${createdPayments}`);
  console.log(`• AI Recovery Cases Active: ${cases.created}`);
  console.log("Check your dashboard: http://localhost:3000/recovery/cases");
  console.log("Check your Razorpay dashboard: https://dashboard.razorpay.com/ (Orders tab)");
  console.log("==================================================");
}

seedRazorpayTestData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal Seeding Error:", err);
    process.exit(1);
  });
