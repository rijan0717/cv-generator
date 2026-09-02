import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/cvs - List all CVs
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const cvs = await prisma.cV.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        experiences: true,
        educations: true,
        skills: true,
        projects: true,
        customSections: true,
      },
    });

    return NextResponse.json({ cvs });
  } catch (error: unknown) {
    console.error("Admin list CVs error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch CVs" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/cvs - Delete any CV
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const cvId = searchParams.get("cvId");

    if (!cvId) {
      return NextResponse.json({ error: "cvId query param required" }, { status: 400 });
    }

    await prisma.cV.delete({
      where: { id: cvId },
    });

    return NextResponse.json({ message: "CV deleted successfully" });
  } catch (error: unknown) {
    console.error("Admin delete CV error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete CV" },
      { status: 500 }
    );
  }
}
