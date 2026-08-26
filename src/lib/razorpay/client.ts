import Razorpay from "razorpay";

const globalForRazorpay = globalThis as unknown as {
  razorpay: Razorpay | undefined;
};

function createRazorpayClient(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

  if (process.env.NODE_ENV === "production" || keyId.length > 0) {
    if (keyId && !keyId.startsWith("rzp_test_")) {
      throw new Error(
        "[Security Violation] Razorpay Key ID must start with 'rzp_test_'. Production live mode keys are strictly prohibited!"
      );
    }
  }

  // If keys are not set yet during early dev/build, instantiate with dummy test key to prevent build break
  const safeKeyId = keyId || "rzp_test_dummy_key_id";
  const safeKeySecret = keySecret || "dummy_secret";

  return new Razorpay({
    key_id: safeKeyId,
    key_secret: safeKeySecret,
  });
}

export const razorpay = globalForRazorpay.razorpay ?? createRazorpayClient();

if (process.env.NODE_ENV !== "production") {
  globalForRazorpay.razorpay = razorpay;
}

export function validateTestMode(): boolean {
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) return false;
  return keyId.startsWith("rzp_test_");
}

export default razorpay;
