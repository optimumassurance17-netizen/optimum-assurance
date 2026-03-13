import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Health check pour monitoring (UptimeRobot, Vercel, etc.)
 * GET /api/health
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: "connected",
    })
  } catch (error) {
    console.error("Health check failed:", error)
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        database: "disconnected",
      },
      { status: 503 }
    )
  }
}
