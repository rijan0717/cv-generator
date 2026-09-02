export interface ExperienceItem {
  id?: string;
  company: string;
  position: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  description: string;
  order?: number;
}

export interface EducationItem {
  id?: string;
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  grade?: string;
  description?: string;
  order?: number;
}

export interface SkillItem {
  id?: string;
  name: string;
  category?: string; // 'Technical' | 'Soft Skills' | 'Tools' | 'Languages'
  level?: number; // 1 to 5
  order?: number;
}

export interface ProjectItem {
  id?: string;
  title: string;
  link?: string;
  github?: string;
  techStack?: string;
  description: string;
  order?: number;
}

export interface CustomSectionItem {
  id?: string;
  title: string;
  items: string; // multiline strings or tags
  order?: number;
}

export interface CVData {
  id?: string;
  userId?: string;
  title: string;
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  address: string;
  website?: string;
  linkedin?: string;
  github?: string;
  photoUrl?: string;
  summary: string;

  // Customization styling
  templateId: "modern" | "classic" | "creative" | "tech";
  bgColor: string;
  textColor: string;
  accentColor: string;
  font: string;
  fontSize: "compact" | "medium" | "relaxed";
  spacing: "compact" | "normal" | "spacious";

  // Nested relations
  experiences: ExperienceItem[];
  educations: EducationItem[];
  skills: SkillItem[];
  projects: ProjectItem[];
  customSections: CustomSectionItem[];

  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface TemplateProps {
  data: CVData;
}
