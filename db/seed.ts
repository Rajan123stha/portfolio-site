import { config } from "dotenv";

config({ path: ".env.local" });

import { hash } from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

import * as schema from "./schema";

/**
 * Bootstraps a fresh database with the content the site previously hardcoded.
 *
 * Idempotent by design: singletons upsert, collections are only populated when
 * their table is empty. Re-running after you've edited content in the admin
 * panel is therefore a no-op rather than a rollback. Pass `--reset` to wipe
 * content tables first (the admin account is never touched).
 */

const RESET = process.argv.includes("--reset");

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set — see .env.example");

const db = drizzle(neon(url), { schema, casing: "snake_case" });

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Seeding is a bootstrap, not a restore — populated tables are left alone. */
async function isEmpty(table: PgTable): Promise<boolean> {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(table);
  return (row?.count ?? 0) === 0;
}

/** Attaches an ascending `sortOrder` so seed order becomes display order. */
function ordered<T extends object>(rows: T[]): (T & { sortOrder: number })[] {
  return rows.map((row, index) => ({ ...row, sortOrder: index }));
}

function log(message: string) {
  console.log(`  ${message}`);
}

// ── Admin account ────────────────────────────────────────────────────────────

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Admin";

  if (!email || !password) {
    log("· skipped admin (set ADMIN_EMAIL and ADMIN_PASSWORD to create one)");
    return;
  }

  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters");
  }

  const existing = await db.select({ id: schema.adminUsers.id }).from(schema.adminUsers).limit(1);
  if (existing.length > 0) {
    log("· admin account already exists — left untouched");
    return;
  }

  await db.insert(schema.adminUsers).values({
    email: email.toLowerCase(),
    name,
    passwordHash: await hash(password, 12),
  });
  log(`✓ admin account created for ${email}`);
}

// ── Singletons ───────────────────────────────────────────────────────────────

async function seedSiteSettings() {
  await db
    .insert(schema.siteSettings)
    .values({
      id: 1,
      brandPrefix: "dev",
      brandName: "Rajan",
      footerBrand: "DevRajan",
      footerTagline:
        "Frontend & fullstack developer building scalable, CMS-driven web applications with clean architecture.",
      metaTitle: "Rajan Shrestha — Frontend & Fullstack Developer",
      metaDescription:
        "Portfolio of Rajan Shrestha — Frontend & Fullstack Developer specializing in React, Next.js, CMS architectures, and AWS deployments.",
      metaKeywords: [
        "Rajan Shrestha",
        "Frontend Developer",
        "Fullstack Developer",
        "React",
        "Next.js",
        "Tailwind CSS",
        "AWS",
        "Payload CMS",
        "Wagtail",
        "Portfolio",
        "Kathmandu",
        "Nepal",
      ],
      gaMeasurementId: "G-6YX0QRV1BJ",
    })
    .onConflictDoNothing();
  log("✓ site settings");
}

async function seedProfile() {
  await db
    .insert(schema.profile)
    .values({
      id: 1,
      greeting: "Hi 👋, I'm",
      fullName: "Rajan Shrestha",
      typewriterWords: [
        { text: "Build." },
        { text: "Design." },
        { text: "Deploy." },
        { text: "Innovate." },
      ],
      availabilityLabel: "Available for work",
      availabilityVisible: true,
      heroBio:
        "I specialize in React & Next.js, modern CMS architectures (Wagtail / Payload), and AWS deployment — helping businesses launch fast, manage content easily, and scale reliably.",
      openTo: ["Frontend / Fullstack roles", "Freelance projects"],
      heroBadges: [
        { label: "React", color: "sky", position: "top-right" },
        { label: "TypeScript", color: "blue", position: "left" },
        { label: "Next.js", color: "foreground", position: "bottom-left" },
        { label: "AWS", color: "orange", position: "bottom-right" },
      ],
      // The old hero pointed at `placeholder.svg` while the real headshot sat
      // unused in /public/image. Seeding the real one.
      avatarUrl: "/image/MyProfile.png",
      location: "Kathmandu, Nepal",
      experienceYears: "1+",
      experienceLabel: "yr frontend experience",
      cvUrl: "/Rajan_CV.pdf",
      aboutParagraphs: [
        "Frontend developer with expertise in HTML, CSS, and JavaScript, proficient in React, and a solid foundation in Express and MongoDB. Experienced in building websites with WordPress and Wagtail as backends and deploying them on AWS.",
        "Passionate about creating polished interfaces, staying current with industry trends, and thriving in collaborative, fast-moving teams.",
      ],
      coreStackTitle: "Core Stack",
    })
    .onConflictDoNothing();
  log("✓ profile");
}

async function seedSections() {
  const rows: (typeof schema.sections.$inferInsert)[] = ordered([
    { key: "hero" as const, eyebrow: "", heading: "", headingAccent: null, subheading: null, note: null },
    {
      key: "about" as const,
      eyebrow: "About Me",
      heading: "Crafting seamless",
      headingAccent: "web experiences",
      subheading: null,
      note: null,
    },
    {
      key: "services" as const,
      eyebrow: "What I Offer",
      heading: "What you get when",
      headingAccent: "we work together",
      subheading:
        "From a single landing page to a full internal system — here is what I take on, and what is included.",
      note: null,
    },
    {
      key: "skills" as const,
      eyebrow: "Expertise",
      heading: "My Skills",
      headingAccent: null,
      subheading:
        "Technologies and tools I work with — from frontend frameworks to cloud deployments.",
      note: null,
    },
    {
      key: "experience" as const,
      eyebrow: "Career",
      heading: "Work Experience",
      headingAccent: null,
      subheading: null,
      note: null,
    },
    {
      key: "projects" as const,
      eyebrow: "Portfolio",
      heading: "Featured Projects",
      headingAccent: null,
      subheading:
        "A selection of things I've built — from CMS-driven platforms to AI-powered tools.",
      note: null,
    },
    {
      key: "value" as const,
      eyebrow: "The Full Picture",
      heading: "Why Work With Me",
      headingAccent: null,
      subheading:
        "What I bring to the table today — and where I'm actively pushing my craft.",
      note: "🚀 Actively leveling up — not just maintaining.",
    },
    {
      key: "contact" as const,
      eyebrow: "Contact",
      heading: "Get In Touch",
      headingAccent: null,
      subheading:
        "I'm currently open to opportunities in frontend and fullstack development. If you're looking for someone who can build scalable, CMS-driven web applications with clean architecture — let's talk.",
      note: "Let's build something impactful.",
    },
  ]);

  await db.insert(schema.sections).values(rows).onConflictDoNothing();
  log(`✓ sections (${rows.length})`);
}

// ── Collections ──────────────────────────────────────────────────────────────

async function seedCoreStack() {
  if (!(await isEmpty(schema.coreStackItems))) return log("· core stack — already populated");

  await db.insert(schema.coreStackItems).values(
    ordered([
      { icon: "Code2" as const, label: "React / Next.js & JavaScript / TypeScript" },
      { icon: "Globe" as const, label: "WordPress & Wagtail CMS" },
      { icon: "Database" as const, label: "Express & MongoDB" },
      { icon: "Cloud" as const, label: "AWS Cloud Deployments" },
    ]),
  );
  log("✓ core stack (4)");
}

async function seedSkills() {
  if (!(await isEmpty(schema.skillGroups))) return log("· skills — already populated");

  const groups = await db
    .insert(schema.skillGroups)
    .values(
      ordered([
        { icon: "Code2" as const, label: "Programming", title: "Dev Stack" },
        { icon: "Globe" as const, label: "Tools & Platforms", title: "Tools & Platforms" },
      ]),
    )
    .returning({ id: schema.skillGroups.id, title: schema.skillGroups.title });

  const groupId = (title: string) => {
    const match = groups.find((group) => group.title === title);
    if (!match) throw new Error(`Seed error: missing skill group "${title}"`);
    return match.id;
  };

  const dev = groupId("Dev Stack");
  const tools = groupId("Tools & Platforms");

  await db.insert(schema.skills).values(
    ordered([
      { groupId: dev, name: "React" },
      { groupId: dev, name: "TypeScript" },
      { groupId: dev, name: "Tailwind CSS" },
      { groupId: dev, name: "Next.js" },
      { groupId: dev, name: "Node.js" },
      { groupId: dev, name: "Express.js" },
      { groupId: dev, name: "Redux" },
      { groupId: dev, name: "MongoDB" },
      { groupId: tools, name: "UI/UX Design" },
      { groupId: tools, name: "Figma" },
      { groupId: tools, name: "WordPress" },
      { groupId: tools, name: "Wagtail / Payload CMS" },
      { groupId: tools, name: "AWS" },
      { groupId: tools, name: "Git / GitHub" },
      { groupId: tools, name: "Jest & Cypress" },
    ]),
  );
  log("✓ skills (2 groups, 15 skills)");
}

async function seedServices() {
  if (!(await isEmpty(schema.services))) return log("· services — already populated");

  await db.insert(schema.services).values(
    ordered([
      {
        icon: "Monitor" as const,
        title: "Website development",
        summary:
          "Marketing sites, landing pages and company websites built to load fast, rank well, and stay easy to update.",
        deliverables: [
          "Responsive design from mobile to desktop",
          "CMS so you can edit content yourself",
          "SEO, analytics and performance tuning",
        ],
        note: "From 2 weeks",
        featured: true,
      },
      {
        icon: "Smartphone" as const,
        title: "Web & mobile apps",
        summary:
          "Product-style applications with authentication, dashboards and real data behind them — not just screens.",
        deliverables: [
          "React / Next.js frontend",
          "REST or server-action APIs",
          "Role-based auth and secure workflows",
        ],
        note: "From 4 weeks",
      },
      {
        icon: "Boxes" as const,
        title: "Internal systems",
        summary:
          "Admin panels and business tools that replace the spreadsheet — booking flows, inventory, enquiry pipelines.",
        deliverables: [
          "Custom admin dashboard",
          "PostgreSQL data modelling",
          "Reporting and exports",
        ],
      },
      {
        icon: "Cloud" as const,
        title: "Deployment & maintenance",
        summary:
          "Getting it live on AWS or Vercel with SSL, CI and monitoring — then keeping it healthy.",
        deliverables: [
          "AWS S3 / CloudFront or Vercel setup",
          "Custom domain and SSL",
          "Ongoing fixes and improvements",
        ],
        note: "Retainer available",
      },
    ]),
  );
  log("✓ services (4)");
}

async function seedExperiences() {
  if (!(await isEmpty(schema.experiences))) return log("· experience — already populated");

  await db.insert(schema.experiences).values(
    ordered([
      {
        title: "Frontend Developer",
        company: "dgMarket",
        period: "June 2025 — Present",
        employmentType: "Full-time",
        summary:
          "Working on building and scaling web platforms for tender management and internal business operations. Focused on developing responsive frontend systems, integrating backend APIs, and collaborating with cross-functional teams to deliver production-ready applications.",
        bullets: [
          "Developed and maintained the dgMarket platform, enabling users to browse and publish tenders with a structured and user-friendly interface.",
          "Implemented role-based workflows by integrating frontend with backend APIs, supporting multiple user roles and secure data handling.",
          "Collaborated with backend developers and product teams to build and improve internal tools for business operations and workflow management.",
          "Worked closely with SEO and performance teams to optimize application speed, accessibility, and search engine visibility.",
          "Integrated Google Analytics to track user behavior, monitor traffic, and support data-driven decisions for improving user experience and performance.",
        ],
      },
      {
        title: "Fullstack Developer Intern",
        company: "HiddenLayer Pvt. Ltd.",
        period: "Aug 2024 — Feb 2025",
        employmentType: "Full-time Internship",
        summary:
          "Worked on a web app for AI model monitoring and management, built with React.js, Tailwind CSS, and Payload CMS. Deployed on AWS S3 with CloudFront and SSL.",
        bullets: [
          "Designed and developed a fast, responsive frontend using React.js and Tailwind CSS, integrated with Payload CMS for dynamic content updates.",
          "Deployed the app on AWS S3 with CloudFront and SSL, optimizing performance, security, and editorial workflows.",
          "Translated Figma designs into pixel-perfect UI, enhancing UX and reducing overall development time.",
        ],
      },
      {
        title: "Assistant Website Manager",
        company: "Thames International College",
        period: "Apr 2023 — Nov 2023",
        employmentType: "Part-time",
        summary:
          "Responsible for managing and maintaining the college's website, ensuring optimal performance and user experience.",
        bullets: [
          "Tracked and reported website bugs to developers for timely resolution.",
          "Collaborated with the Marketing Manager to execute SEO strategies and improve website visibility.",
        ],
      },
    ]),
  );
  log("✓ experience (3)");
}

async function seedProjects() {
  if (!(await isEmpty(schema.projectCategories))) return log("· projects — already populated");

  const categories = await db
    .insert(schema.projectCategories)
    .values(
      ordered([
        { slug: "react", label: "React" },
        { slug: "fullstack", label: "Full Stack" },
        { slug: "ai", label: "AI / ML" },
      ]),
    )
    .returning({ id: schema.projectCategories.id, slug: schema.projectCategories.slug });

  const categoryId = (slug: string) => {
    const match = categories.find((category) => category.slug === slug);
    if (!match) throw new Error(`Seed error: missing category "${slug}"`);
    return match.id;
  };

  await db.insert(schema.projects).values(
    ordered([
      {
        title: "Travel Management System Trabra (Fullstack)",
        slug: "trabra-travel-management",
        categoryId: categoryId("fullstack"),
        // Several image paths were missing their leading slash, which makes
        // next/image resolve them relative to the current route.
        imageUrl: "/image/trabra.png",
        description:
          "Built a fullstack travel management system using Next.js to handle both website content and internal business operations. The platform allows admins to update website content dynamically while managing client inquiries, follow-ups, and complete booking workflows through a centralized dashboard.",
        tech: ["Next.js", "TypeScript", "Node.js", "PostgreSQL", "RAG"],
        demoUrl: "https://tour.alpineramble.com/",
        codeUrl: null,
        featured: true,
        visible: true,
      },
      {
        title: "dgMarket – Tender Management Platform",
        slug: "dgmarket-tender-platform",
        categoryId: categoryId("react"),
        imageUrl: "/image/dgmarket.png",
        description:
          "Developed a full-featured tender management platform where users can browse and publish tenders. Built the frontend using React and collaborated with backend systems to implement multi-role authentication, secure workflows, and dynamic data handling. Also worked closely with the SEO team to improve performance and search visibility.",
        tech: ["React", "JavaScript", "Tailwind CSS", "Redux", "REST API", "SEO"],
        demoUrl: "https://webdg.dgmarket.com/",
        codeUrl: null,
        featured: true,
        visible: true,
      },
      {
        title: "Consultancy Website Platform",
        slug: "consultancy-website-platform",
        categoryId: categoryId("react"),
        imageUrl: "/image/consultancy.png",
        description:
          "Designed and developed a responsive consultancy website tailored to business requirements, featuring structured destination pages, blog system, and integrated contact workflows. Focused on performance, clean UI/UX, and scalability for future content expansion.",
        tech: ["React", "JavaScript", "Tailwind CSS", "HTML", "CSS"],
        demoUrl: "https://staredum.com/",
        codeUrl: null,
        visible: true,
      },
      {
        title: "YouTube Comment Sentiment Analyzer",
        slug: "youtube-comment-sentiment-analyzer",
        categoryId: categoryId("ai"),
        imageUrl: "/image/sentiment.png",
        description:
          "Classifies YouTube comments as positive, negative, or neutral using the Naive Bayes algorithm. React frontend communicating with a Python backend via RESTful APIs.",
        tech: ["React", "Python", "Naive Bayes", "JavaScript", "RESTful API"],
        demoUrl: "https://comment-sentiment-analyser-rose.vercel.app/",
        codeUrl: "https://github.com/Rajan123stha/comment-sentiment-analyser",
        visible: true,
      },
      {
        title: "Student Study Point",
        slug: "student-study-point",
        categoryId: categoryId("fullstack"),
        imageUrl: "/image/studypoint.png",
        description:
          "Academic resource platform with notes, syllabi, and past papers. Includes admin dashboard for content management and advanced search and filter features.",
        tech: ["React", "Express", "Node", "Tailwind CSS", "TypeScript"],
        demoUrl: "https://edu-resources-mocha.vercel.app/",
        codeUrl: "https://github.com/Rajan123stha/EduResources",
        visible: true,
      },

      // Previously commented out in components/projects.tsx. Seeded hidden so
      // they can be brought back from the admin panel instead of being lost.
      {
        title: "ApplyLeap",
        slug: "applyleap",
        categoryId: categoryId("react"),
        imageUrl: "/image/applyleap1.png",
        description:
          "A platform for students to get all the necessary information about studying abroad. Built with React and Payload CMS, hosted on AWS with a custom subdomain.",
        tech: ["React", "Payload", "Wagtail", "AWS", "Tailwind", "Figma"],
        demoUrl: "https://applyleap.com",
        codeUrl: "https://github.com/Rajan123stha/applyleap",
        visible: false,
      },
      {
        title: "Resume Analyzer Tool",
        slug: "resume-analyzer-tool",
        categoryId: categoryId("ai"),
        imageUrl: "/image/resumeanalyze.png",
        description:
          "Compares resumes with job descriptions to identify missing keywords and suggest improvements using natural language processing (NLP).",
        tech: ["React", "NLP", "Tailwind CSS", "TypeScript"],
        demoUrl: "https://resume-analyzer-kohl.vercel.app/",
        codeUrl: "https://github.com/Rajan123stha/ResumeAnalyzer",
        visible: false,
      },
      {
        title: "Fullstack Ecommerce Platform",
        slug: "fullstack-ecommerce-platform",
        categoryId: categoryId("fullstack"),
        imageUrl: "/image/ecommerce.png",
        description:
          "Fully functional e-commerce platform featuring product catalog, cart, checkout, and payment gateway integration with a responsive and user-friendly UI.",
        tech: ["React", "Express", "MongoDB", "Payment Gateway"],
        demoUrl: null,
        codeUrl: "https://github.com/Rajan123stha/Ecommerce-system-cretiveCrefted",
        visible: false,
      },
      {
        title: "Hostel Management System",
        slug: "hostel-management-system",
        categoryId: categoryId("fullstack"),
        imageUrl: "/image/project.jpg",
        description:
          "Helps hostel administrators manage students, rooms, and assignments. Includes room allocation, student records, and a management dashboard.",
        tech: ["HTML", "CSS", "JavaScript", "PHP", "SQL"],
        demoUrl: null,
        codeUrl: "https://github.com/Rajan123stha/Hostel-Management-System",
        visible: false,
      },
    ]),
  );
  log("✓ projects (3 categories, 9 projects — 4 hidden)");
}

async function seedHighlights() {
  if (!(await isEmpty(schema.highlightGroups))) return log("· highlights — already populated");

  const groups = await db
    .insert(schema.highlightGroups)
    .values(
      ordered([
        {
          slug: "strengths",
          icon: "Rocket" as const,
          label: "What I Bring",
          title: "Why Hire Me",
        },
        {
          slug: "learning",
          icon: "BookOpen" as const,
          label: "Always Growing",
          title: "Currently Learning",
        },
      ]),
    )
    .returning({ id: schema.highlightGroups.id, slug: schema.highlightGroups.slug });

  const groupId = (slug: string) => {
    const match = groups.find((group) => group.slug === slug);
    if (!match) throw new Error(`Seed error: missing highlight group "${slug}"`);
    return match.id;
  };

  const strengths = groupId("strengths");
  const learning = groupId("learning");

  await db.insert(schema.highlights).values(
    ordered([
      {
        groupId: strengths,
        icon: "CheckCircle2" as const,
        text: "Strong foundation in React and modern frontend development",
      },
      {
        groupId: strengths,
        icon: "Rocket" as const,
        text: "Experience with real-world CMS and AWS deployment",
      },
      {
        groupId: strengths,
        icon: "Brain" as const,
        text: "Ability to build complete systems, not just UI",
      },
      {
        groupId: strengths,
        icon: "BookOpen" as const,
        text: "Fast learner with focus on scalable and maintainable solutions",
      },
      {
        groupId: learning,
        icon: "Server" as const,
        text: "Advanced system design for scalable applications",
      },
      {
        groupId: learning,
        icon: "Zap" as const,
        text: "Performance optimization in React apps",
      },
      {
        groupId: learning,
        icon: "Layers" as const,
        text: "Backend architecture using Node.js",
      },
      {
        groupId: learning,
        icon: "Cloud" as const,
        text: "Cloud infrastructure and DevOps basics (AWS)",
      },
    ]),
  );
  log("✓ highlights (2 groups, 8 items)");
}

async function seedLinks() {
  const EMAIL = "rajan1234stha@gmail.com";

  if (await isEmpty(schema.contactLinks)) {
    await db.insert(schema.contactLinks).values(
      ordered([{ icon: "Mail" as const, label: "Email", value: EMAIL, href: `mailto:${EMAIL}` }]),
    );
    log("✓ contact links (1)");
  } else {
    log("· contact links — already populated");
  }

  if (await isEmpty(schema.socialLinks)) {
    await db.insert(schema.socialLinks).values(
      ordered([
        {
          icon: "Github" as const,
          label: "GitHub",
          href: "https://github.com/Rajan123stha",
        },
        {
          icon: "Linkedin" as const,
          label: "LinkedIn",
          href: "https://www.linkedin.com/in/rajan-shrestha-1624a1224/",
        },
        // The header and footer both linked `mailto:your@email.com`; the real
        // address only appeared in the contact section.
        { icon: "Mail" as const, label: "Email", href: `mailto:${EMAIL}` },
      ]),
    );
    log("✓ social links (3)");
  } else {
    log("· social links — already populated");
  }

  if (await isEmpty(schema.navItems)) {
    await db.insert(schema.navItems).values(
      ordered([
        { label: "About", href: "#about", showInHeader: true, showInFooter: true },
        { label: "Services", href: "#services", showInHeader: true, showInFooter: true },
        { label: "Skills", href: "#skills", showInHeader: true, showInFooter: true },
        { label: "Experience", href: "#experience", showInHeader: true, showInFooter: true },
        { label: "Projects", href: "#projects", showInHeader: true, showInFooter: true },
        { label: "Why Me", href: "#whyMe", showInHeader: true, showInFooter: false },
        { label: "Contact", href: "#contact", showInHeader: true, showInFooter: true },
      ]),
    );
    log("✓ nav items (6)");
  } else {
    log("· nav items — already populated");
  }
}

// ── Reset ────────────────────────────────────────────────────────────────────

async function reset() {
  // Order matters: children before parents, since foreign keys are enforced.
  await db.delete(schema.skills);
  await db.delete(schema.skillGroups);
  await db.delete(schema.services);
  await db.delete(schema.highlights);
  await db.delete(schema.highlightGroups);
  await db.delete(schema.projects);
  await db.delete(schema.projectCategories);
  await db.delete(schema.experiences);
  await db.delete(schema.coreStackItems);
  await db.delete(schema.contactLinks);
  await db.delete(schema.socialLinks);
  await db.delete(schema.navItems);
  await db.delete(schema.sections);
  await db.delete(schema.profile);
  await db.delete(schema.siteSettings);
  log("✓ content tables cleared (admin account and messages kept)");
}

// ── Entry point ──────────────────────────────────────────────────────────────

async function main() {
  console.log(RESET ? "\nReseeding portfolio content…\n" : "\nSeeding portfolio content…\n");

  if (RESET) await reset();

  await seedAdmin();
  await seedSiteSettings();
  await seedProfile();
  await seedSections();
  await seedCoreStack();
  await seedSkills();
  await seedServices();
  await seedExperiences();
  await seedProjects();
  await seedHighlights();
  await seedLinks();

  console.log("\nDone. Sign in at /admin/login\n");
}

main().catch((error) => {
  console.error("\n✗ seed failed\n", error);
  process.exit(1);
});
