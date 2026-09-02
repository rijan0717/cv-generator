import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const [totalUsers, totalCVs, recentUsers, recentCVs, templateDistribution] =
      await Promise.all([
        prisma.user.count(),
        prisma.cV.count(),
        prisma.user.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
            _count: { select: { cvs: true } },
          },
        }),
        prisma.cV.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { name: true, email: true } },
          },
        }),
        prisma.cV.groupBy({
          by: ["templateId"],
          _count: { templateId: true },
        }),
      ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        totalCVs,
        recentUsers,
        recentCVs,
        templateDistribution,
      },
    });
  } catch (error: unknown) {
    console.error("Admin stats error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch admin stats" },
      { status: 500 }
    );
  }
}
