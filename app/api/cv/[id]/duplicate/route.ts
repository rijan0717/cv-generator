import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const sourceCV = await prisma.cV.findUnique({
      where: { id },
      include: {
        experiences: true,
        educations: true,
        skills: true,
        projects: true,
        customSections: true,
      },
    });

    if (!sourceCV) {
      return NextResponse.json({ error: "CV not found" }, { status: 404 });
    }

    if (sourceCV.userId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const clonedCV = await prisma.cV.create({
      data: {
        userId: session.user.id,
        title: `${sourceCV.title} (Copy)`,
        fullName: sourceCV.fullName,
        jobTitle: sourceCV.jobTitle,
        email: sourceCV.email,
        phone: sourceCV.phone,
        address: sourceCV.address,
        website: sourceCV.website,
        linkedin: sourceCV.linkedin,
        github: sourceCV.github,
        photoUrl: sourceCV.photoUrl,
        summary: sourceCV.summary,
        templateId: sourceCV.templateId,
        bgColor: sourceCV.bgColor,
        textColor: sourceCV.textColor,
        accentColor: sourceCV.accentColor,
        font: sourceCV.font,
        fontSize: sourceCV.fontSize,
        spacing: sourceCV.spacing,
        experiences: {
          create: sourceCV.experiences.map((exp) => ({
            company: exp.company,
            position: exp.position,
            location: exp.location,
            startDate: exp.startDate,
            endDate: exp.endDate,
            current: exp.current,
            description: exp.description,
            order: exp.order,
          })),
        },
        educations: {
          create: sourceCV.educations.map((edu) => ({
            institution: edu.institution,
            degree: edu.degree,
            fieldOfStudy: edu.fieldOfStudy,
            location: edu.location,
            startDate: edu.startDate,
            endDate: edu.endDate,
            current: edu.current,
            grade: edu.grade,
            description: edu.description,
            order: edu.order,
          })),
        },
        skills: {
          create: sourceCV.skills.map((s) => ({
            name: s.name,
            category: s.category,
            level: s.level,
            order: s.order,
          })),
        },
        projects: {
          create: sourceCV.projects.map((p) => ({
            title: p.title,
            link: p.link,
            github: p.github,
            techStack: p.techStack,
            description: p.description,
            order: p.order,
          })),
        },
        customSections: {
          create: sourceCV.customSections.map((sec) => ({
            title: sec.title,
            items: sec.items,
            order: sec.order,
          })),
        },
      },
      include: {
        experiences: true,
        educations: true,
        skills: true,
        projects: true,
        customSections: true,
      },
    });

    return NextResponse.json({ cv: clonedCV }, { status: 201 });
  } catch (error: unknown) {
    console.error("Duplicate CV error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to duplicate CV" },
      { status: 500 }
    );
  }
}
