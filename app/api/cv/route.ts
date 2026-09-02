import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/cv - List all CVs for current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cvs = await prisma.cV.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        experiences: { orderBy: { order: "asc" } },
        educations: { orderBy: { order: "asc" } },
        skills: { orderBy: { order: "asc" } },
        projects: { orderBy: { order: "asc" } },
        customSections: { orderBy: { order: "asc" } },
      },
    });

    return NextResponse.json({ cvs });
  } catch (error: unknown) {
    console.error("Fetch CVs error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch CVs" },
      { status: 500 }
    );
  }
}

// POST /api/cv - Create a new CV with starter defaults
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: {
      title?: string;
      templateId?: string;
      seedSample?: boolean;
    } = {};

    try {
      body = await req.json();
    } catch {
      // Empty body allowed
    }

    const title = body.title || "My Resume";
    const templateId = body.templateId || "modern";
    const userName = session.user.name || "Alex Morgan";
    const userEmail = session.user.email || "alex.morgan@example.com";

    // Create CV with starter dummy data so user immediately sees a beautiful preview
    const newCV = await prisma.cV.create({
      data: {
        userId: session.user.id,
        title,
        templateId,
        fullName: userName,
        jobTitle: "Senior Software Engineer",
        email: userEmail,
        phone: "+1 (555) 234-5678",
        address: "San Francisco, CA",
        website: "https://alexmorgan.dev",
        linkedin: "linkedin.com/in/alexmorgan",
        github: "github.com/alexmorgan",
        photoUrl: "",
        summary:
          "Passionate Full-Stack Software Engineer with 5+ years of experience designing and scaling web applications with React, Next.js, Node.js, and cloud architectures. Proven track record in boosting application performance and leading agile teams.",
        bgColor: "#ffffff",
        textColor: "#1e293b",
        accentColor: "#2563eb",
        font: "Inter",
        fontSize: "medium",
        spacing: "normal",
        experiences: {
          create: [
            {
              company: "TechNova Solutions",
              position: "Lead Frontend Engineer",
              location: "San Francisco, CA",
              startDate: "2022-01",
              endDate: "",
              current: true,
              description:
                "• Architected scalable Next.js and TypeScript micro-frontends serving 2M+ monthly active users.\n• Improved Core Web Vitals score by 45% through aggressive SSR caching and dynamic image optimization.\n• Mentored a team of 6 engineers and established automated CI/CD deployment pipelines.",
              order: 0,
            },
            {
              company: "Apex Digital Labs",
              position: "Full Stack Developer",
              location: "Austin, TX",
              startDate: "2019-06",
              endDate: "2021-12",
              current: false,
              description:
                "• Developed RESTful and GraphQL APIs using Node.js, Express, and MongoDB.\n• Built responsive customer dashboards with React, Tailwind CSS, and Redux Toolkit.\n• Reduced database query latency by 35% through efficient MongoDB indexing.",
              order: 1,
            },
          ],
        },
        educations: {
          create: [
            {
              institution: "University of California, Berkeley",
              degree: "B.S. in Computer Science",
              fieldOfStudy: "Computer Science",
              location: "Berkeley, CA",
              startDate: "2015-08",
              endDate: "2019-05",
              current: false,
              grade: "GPA: 3.8 / 4.0",
              description: "Dean's Honor List, President of the Web Development Club.",
              order: 0,
            },
          ],
        },
        skills: {
          create: [
            { name: "TypeScript", category: "Technical", level: 5, order: 0 },
            { name: "React & Next.js", category: "Technical", level: 5, order: 1 },
            { name: "Node.js", category: "Technical", level: 4, order: 2 },
            { name: "MongoDB & Prisma", category: "Technical", level: 4, order: 3 },
            { name: "Tailwind CSS", category: "Technical", level: 5, order: 4 },
            { name: "Docker & AWS", category: "Tools", level: 4, order: 5 },
            { name: "Agile Leadership", category: "Soft Skills", level: 5, order: 6 },
            { name: "System Design", category: "Technical", level: 4, order: 7 },
          ],
        },
        projects: {
          create: [
            {
              title: "CloudFlow DevOps Platform",
              link: "https://cloudflow.io",
              github: "https://github.com/alexmorgan/cloudflow",
              techStack: "Next.js, TypeScript, Tailwind, Docker, Go",
              description:
                "• Designed an open-source visual pipeline orchestrator for containerized workloads.\n• Garnered over 1,500 GitHub stars and adopted by 30+ startup engineering teams.",
              order: 0,
            },
          ],
        },
        customSections: {
          create: [
            {
              title: "Languages",
              items: "English (Native), Spanish (Conversational), German (Basic)",
              order: 0,
            },
          ],
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

    return NextResponse.json({ cv: newCV }, { status: 201 });
  } catch (error: unknown) {
    console.error("Create CV error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create CV" },
      { status: 500 }
    );
  }
}
