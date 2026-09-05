import { NextRequest, NextResponse } from "next/server";
import { SimulatorService, SimulationScenarioType } from "@/server/services/simulator.service";
import { MerchantService } from "@/server/services/merchant.service";
import { AppError } from "@/server/errors";
import { z } from "zod";

const simulationSchema = z.object({
  scenario: z.enum([
    "PAYMENT_FAILURE_RECOVERY",
    "UPI_DEGRADATION_RECOVERY",
    "REPEATED_FAILURE_ESCALATION",
    "NETWORK_TIMEOUT",
    "BANK_DECLINE",
    "WEBHOOK_HMAC_TAMPER",
    "WEBHOOK_DEDUPLICATION_REPLAY",
    "CONCURRENT_RECOVERY_RACE",
  ]),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = simulationSchema.parse(body);

    const merchant = await MerchantService.getOrCreateDefaultMerchant();
    const result = await SimulatorService.runSimulation(
      merchant.id,
      validated.scenario as SimulationScenarioType
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(error.toJSON(), { status: error.statusCode });
    }
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Failed to run simulation scenario",
        },
      },
      { status: 500 }
    );
  }
}
