import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExperienceItem, EducationItem, SkillItem, ProjectItem, CustomSectionItem } from "@/types/cv";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/cv/[id]
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const cv = await prisma.cV.findUnique({
      where: { id },
      include: {
        experiences: { orderBy: { order: "asc" } },
        educations: { orderBy: { order: "asc" } },
        skills: { orderBy: { order: "asc" } },
        projects: { orderBy: { order: "asc" } },
        customSections: { orderBy: { order: "asc" } },
      },
    });

    if (!cv) {
      return NextResponse.json({ error: "CV not found" }, { status: 404 });
    }

    // Ensure user owns this CV or is an admin
    if (cv.userId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ cv });
  } catch (error: unknown) {
    console.error("Get CV by ID error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch CV" },
      { status: 500 }
    );
  }
}

// PUT /api/cv/[id]
export async function PUT(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existingCV = await prisma.cV.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingCV) {
      return NextResponse.json({ error: "CV not found" }, { status: 404 });
    }

    if (existingCV.userId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      fullName,
      jobTitle,
      email,
      phone,
      address,
      website,
      linkedin,
      github,
      photoUrl,
      summary,
      templateId,
      bgColor,
      textColor,
      accentColor,
      font,
      fontSize,
      spacing,
      experiences,
      educations,
      skills,
      projects,
      customSections,
    } = body;

    // Execute atomic sync: update CV details and recreate nested relation items
    const updatedCV = await prisma.cV.update({
      where: { id },
      data: {
        title: title !== undefined ? title : undefined,
        fullName: fullName !== undefined ? fullName : undefined,
        jobTitle: jobTitle !== undefined ? jobTitle : undefined,
        email: email !== undefined ? email : undefined,
        phone: phone !== undefined ? phone : undefined,
        address: address !== undefined ? address : undefined,
        website: website !== undefined ? website : undefined,
        linkedin: linkedin !== undefined ? linkedin : undefined,
        github: github !== undefined ? github : undefined,
        photoUrl: photoUrl !== undefined ? photoUrl : undefined,
        summary: summary !== undefined ? summary : undefined,
        templateId: templateId !== undefined ? templateId : undefined,
        bgColor: bgColor !== undefined ? bgColor : undefined,
        textColor: textColor !== undefined ? textColor : undefined,
        accentColor: accentColor !== undefined ? accentColor : undefined,
        font: font !== undefined ? font : undefined,
        fontSize: fontSize !== undefined ? fontSize : undefined,
        spacing: spacing !== undefined ? spacing : undefined,

        // Replace nested collections atomically if provided
        ...(experiences !== undefined && {
          experiences: {
            deleteMany: {},
            create: (experiences as ExperienceItem[]).map((exp, idx) => ({
              company: exp.company || "",
              position: exp.position || "",
              location: exp.location || "",
              startDate: exp.startDate || "",
              endDate: exp.endDate || "",
              current: Boolean(exp.current),
              description: exp.description || "",
              order: idx,
            })),
          },
        }),
        ...(educations !== undefined && {
          educations: {
            deleteMany: {},
            create: (educations as EducationItem[]).map((edu, idx) => ({
              institution: edu.institution || "",
              degree: edu.degree || "",
              fieldOfStudy: edu.fieldOfStudy || "",
              location: edu.location || "",
              startDate: edu.startDate || "",
              endDate: edu.endDate || "",
              current: Boolean(edu.current),
              grade: edu.grade || "",
              description: edu.description || "",
              order: idx,
            })),
          },
        }),
        ...(skills !== undefined && {
          skills: {
            deleteMany: {},
            create: (skills as SkillItem[]).map((skill, idx) => ({
              name: skill.name || "",
              category: skill.category || "Technical",
              level: typeof skill.level === "number" ? skill.level : 4,
              order: idx,
            })),
          },
        }),
        ...(projects !== undefined && {
          projects: {
            deleteMany: {},
            create: (projects as ProjectItem[]).map((proj, idx) => ({
              title: proj.title || "",
              link: proj.link || "",
              github: proj.github || "",
              techStack: proj.techStack || "",
              description: proj.description || "",
              order: idx,
            })),
          },
        }),
        ...(customSections !== undefined && {
          customSections: {
            deleteMany: {},
            create: (customSections as CustomSectionItem[]).map((sec, idx) => ({
              title: sec.title || "",
              items: sec.items || "",
              order: idx,
            })),
          },
        }),
      },
      include: {
        experiences: { orderBy: { order: "asc" } },
        educations: { orderBy: { order: "asc" } },
        skills: { orderBy: { order: "asc" } },
        projects: { orderBy: { order: "asc" } },
        customSections: { orderBy: { order: "asc" } },
      },
    });

    return NextResponse.json({ cv: updatedCV });
  } catch (error: unknown) {
    console.error("Update CV error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update CV" },
      { status: 500 }
    );
  }
}

// DELETE /api/cv/[id]
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existingCV = await prisma.cV.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existingCV) {
      return NextResponse.json({ error: "CV not found" }, { status: 404 });
    }

    if (existingCV.userId !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.cV.delete({
      where: { id },
    });

    return NextResponse.json({ message: "CV deleted successfully" });
  } catch (error: unknown) {
    console.error("Delete CV error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete CV" },
      { status: 500 }
    );
  }
}
