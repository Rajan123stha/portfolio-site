import type {
  ContactLinkView,
  CoreStackView,
  ExperienceView,
  HighlightGroupView,
  NavItemView,
  ProjectCategoryView,
  ServiceView,
  ProjectView,
  SectionView,
  SiteSettingsView,
  SkillGroupView,
  SocialLinkView,
  ProfileView,
} from "@/lib/queries/public";

/**
 * Bundled starter content.
 *
 * This is the copy the site carried before it became database-driven, kept as a
 * typed fallback so an unseeded install still renders a complete, presentable
 * page instead of an empty shell. The moment real content exists in Postgres it
 * takes over — see `withDefaults()` in `lib/queries/public.ts` for the exact
 * precedence rules.
 *
 * Ids are synthetic and prefixed `default:`. They only need to be stable and
 * unique for React keys; nothing here is ever written back to the database.
 */

const id = (value: string) => `default:${value}`;

// ── Site settings ────────────────────────────────────────────────────────────

export const DEFAULT_SITE_SETTINGS: SiteSettingsView = {
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
  ogImageUrl: null,
  gaMeasurementId: null,
  // The assistant stays off until the owner enables it in the CMS.
  assistantEnabled: false,
  assistantWelcome: "",
  assistantQuestions: [],
  assistantPronouns: "",
};

// ── Profile ──────────────────────────────────────────────────────────────────

export const DEFAULT_PROFILE: ProfileView = {
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
};

// ── Section headers ──────────────────────────────────────────────────────────

export const DEFAULT_SECTIONS: SectionView[] = [
  {
    key: "hero",
    eyebrow: "",
    heading: "",
    headingAccent: null,
    subheading: null,
    note: null,
    visible: true,
  },
  {
    key: "about",
    eyebrow: "About Me",
    heading: "Crafting seamless",
    headingAccent: "web experiences",
    subheading: null,
    note: null,
    visible: true,
  },
  {
    key: "services",
    eyebrow: "What I Offer",
    heading: "What you get when",
    headingAccent: "we work together",
    subheading:
      "From a single landing page to a full internal system — here is what I take on, and what is included.",
    note: null,
    visible: true,
  },
  {
    key: "skills",
    eyebrow: "Expertise",
    heading: "My Skills",
    headingAccent: null,
    subheading:
      "Technologies and tools I work with — from frontend frameworks to cloud deployments.",
    note: null,
    visible: true,
  },
  {
    key: "experience",
    eyebrow: "Career",
    heading: "Work Experience",
    headingAccent: null,
    subheading: null,
    note: null,
    visible: true,
  },
  {
    key: "projects",
    eyebrow: "Portfolio",
    heading: "Featured Projects",
    headingAccent: null,
    subheading:
      "A selection of things I've built — from CMS-driven platforms to AI-powered tools.",
    note: null,
    visible: true,
  },
  {
    key: "value",
    eyebrow: "The Full Picture",
    heading: "Why Work With Me",
    headingAccent: null,
    subheading:
      "What I bring to the table today — and where I'm actively pushing my craft.",
    note: "🚀 Actively leveling up — not just maintaining.",
    visible: true,
  },
  {
    key: "contact",
    eyebrow: "Contact",
    heading: "Get In Touch",
    headingAccent: null,
    subheading:
      "I'm currently open to opportunities in frontend and fullstack development. If you're looking for someone who can build scalable, CMS-driven web applications with clean architecture — let's talk.",
    note: "Let's build something impactful.",
    visible: true,
  },
];

// ── About: core stack ────────────────────────────────────────────────────────

export const DEFAULT_CORE_STACK: CoreStackView[] = [
  {
    id: id("stack-react"),
    icon: "Code2",
    label: "React / Next.js & JavaScript / TypeScript",
  },
  { id: id("stack-cms"), icon: "Globe", label: "WordPress & Wagtail CMS" },
  { id: id("stack-express"), icon: "Database", label: "Express & MongoDB" },
  { id: id("stack-aws"), icon: "Cloud", label: "AWS Cloud Deployments" },
];

// ── Skills ───────────────────────────────────────────────────────────────────

export const DEFAULT_SKILL_GROUPS: SkillGroupView[] = [
  {
    id: id("group-dev"),
    icon: "Code2",
    label: "Programming",
    title: "Dev Stack",
    skills: [
      { id: id("skill-react"), name: "React" },
      { id: id("skill-ts"), name: "TypeScript" },
      { id: id("skill-tailwind"), name: "Tailwind CSS" },
      { id: id("skill-next"), name: "Next.js" },
      { id: id("skill-node"), name: "Node.js" },
      { id: id("skill-express"), name: "Express.js" },
      { id: id("skill-redux"), name: "Redux" },
      { id: id("skill-mongo"), name: "MongoDB" },
    ],
  },
  {
    id: id("group-tools"),
    icon: "Globe",
    label: "Tools & Platforms",
    title: "Tools & Platforms",
    skills: [
      { id: id("skill-uiux"), name: "UI/UX Design" },
      { id: id("skill-figma"), name: "Figma" },
      { id: id("skill-wordpress"), name: "WordPress" },
      { id: id("skill-wagtail"), name: "Wagtail / Payload CMS" },
      { id: id("skill-aws"), name: "AWS" },
      { id: id("skill-git"), name: "Git / GitHub" },
      { id: id("skill-testing"), name: "Jest & Cypress" },
    ],
  },
];

// ── Services ─────────────────────────────────────────────────────────────────

export const DEFAULT_SERVICES: ServiceView[] = [
  {
    id: id("service-web"),
    icon: "Monitor",
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
    id: id("service-app"),
    icon: "Smartphone",
    title: "Web & mobile apps",
    summary:
      "Product-style applications with authentication, dashboards and real data behind them — not just screens.",
    deliverables: [
      "React / Next.js frontend",
      "REST or server-action APIs",
      "Role-based auth and secure workflows",
    ],
    note: "From 4 weeks",
    featured: false,
  },
  {
    id: id("service-system"),
    icon: "Boxes",
    title: "Internal systems",
    summary:
      "Admin panels and business tools that replace the spreadsheet — booking flows, inventory, enquiry pipelines.",
    deliverables: [
      "Custom admin dashboard",
      "PostgreSQL data modelling",
      "Reporting and exports",
    ],
    note: null,
    featured: false,
  },
  {
    id: id("service-cloud"),
    icon: "Cloud",
    title: "Deployment & maintenance",
    summary:
      "Getting it live on AWS or Vercel with SSL, CI and monitoring — then keeping it healthy.",
    deliverables: [
      "AWS S3 / CloudFront or Vercel setup",
      "Custom domain and SSL",
      "Ongoing fixes and improvements",
    ],
    note: "Retainer available",
    featured: false,
  },
];

// ── Experience ───────────────────────────────────────────────────────────────

export const DEFAULT_EXPERIENCES: ExperienceView[] = [
  {
    id: id("exp-dgmarket"),
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
    id: id("exp-hiddenlayer"),
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
    id: id("exp-thames"),
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
];

// ── Projects ─────────────────────────────────────────────────────────────────

const CATEGORY_REACT = { slug: "react", label: "React" };
const CATEGORY_FULLSTACK = { slug: "fullstack", label: "Full Stack" };
const CATEGORY_AI = { slug: "ai", label: "AI / ML" };

export const DEFAULT_PROJECT_CATEGORIES: ProjectCategoryView[] = [
  { id: id("cat-react"), ...CATEGORY_REACT },
  { id: id("cat-fullstack"), ...CATEGORY_FULLSTACK },
  { id: id("cat-ai"), ...CATEGORY_AI },
];

export const DEFAULT_PROJECTS: ProjectView[] = [
  {
    id: id("project-trabra"),
    title: "Travel Management System Trabra (Fullstack)",
    slug: "trabra-travel-management",
    description:
      "Built a fullstack travel management system using Next.js to handle both website content and internal business operations. The platform allows admins to update website content dynamically while managing client inquiries, follow-ups, and complete booking workflows through a centralized dashboard.",
    imageUrl: "/image/trabra.png",
    tech: ["Next.js", "TypeScript", "Node.js", "PostgreSQL", "RAG"],
    demoUrl: "https://tour.alpineramble.com/",
    codeUrl: null,
    featured: true,
    category: CATEGORY_FULLSTACK,
  },
  {
    id: id("project-dgmarket"),
    title: "dgMarket – Tender Management Platform",
    slug: "dgmarket-tender-platform",
    description:
      "Developed a full-featured tender management platform where users can browse and publish tenders. Built the frontend using React and collaborated with backend systems to implement multi-role authentication, secure workflows, and dynamic data handling. Also worked closely with the SEO team to improve performance and search visibility.",
    imageUrl: "/image/dgmarket.png",
    tech: ["React", "JavaScript", "Tailwind CSS", "Redux", "REST API", "SEO"],
    demoUrl: "https://webdg.dgmarket.com/",
    codeUrl: null,
    featured: true,
    category: CATEGORY_REACT,
  },
  {
    id: id("project-consultancy"),
    title: "Consultancy Website Platform",
    slug: "consultancy-website-platform",
    description:
      "Designed and developed a responsive consultancy website tailored to business requirements, featuring structured destination pages, blog system, and integrated contact workflows. Focused on performance, clean UI/UX, and scalability for future content expansion.",
    imageUrl: "/image/consultancy.png",
    tech: ["React", "JavaScript", "Tailwind CSS", "HTML", "CSS"],
    demoUrl: "https://staredum.com/",
    codeUrl: null,
    featured: false,
    category: CATEGORY_REACT,
  },
  {
    id: id("project-sentiment"),
    title: "YouTube Comment Sentiment Analyzer",
    slug: "youtube-comment-sentiment-analyzer",
    description:
      "Classifies YouTube comments as positive, negative, or neutral using the Naive Bayes algorithm. React frontend communicating with a Python backend via RESTful APIs.",
    imageUrl: "/image/sentiment.png",
    tech: ["React", "Python", "Naive Bayes", "JavaScript", "RESTful API"],
    demoUrl: "https://comment-sentiment-analyser-rose.vercel.app/",
    codeUrl: "https://github.com/Rajan123stha/comment-sentiment-analyser",
    featured: false,
    category: CATEGORY_AI,
  },
  {
    id: id("project-studypoint"),
    title: "Student Study Point",
    slug: "student-study-point",
    description:
      "Academic resource platform with notes, syllabi, and past papers. Includes admin dashboard for content management and advanced search and filter features.",
    imageUrl: "/image/studypoint.png",
    tech: ["React", "Express", "Node", "Tailwind CSS", "TypeScript"],
    demoUrl: "https://edu-resources-mocha.vercel.app/",
    codeUrl: "https://github.com/Rajan123stha/EduResources",
    featured: false,
    category: CATEGORY_FULLSTACK,
  },
];

// ── "Why work with me" ───────────────────────────────────────────────────────

export const DEFAULT_HIGHLIGHT_GROUPS: HighlightGroupView[] = [
  {
    id: id("highlight-strengths"),
    slug: "strengths",
    icon: "Rocket",
    label: "What I Bring",
    title: "Why Hire Me",
    highlights: [
      {
        id: id("highlight-react"),
        icon: "CheckCircle2",
        text: "Strong foundation in React and modern frontend development",
      },
      {
        id: id("highlight-cms"),
        icon: "Rocket",
        text: "Experience with real-world CMS and AWS deployment",
      },
      {
        id: id("highlight-systems"),
        icon: "Brain",
        text: "Ability to build complete systems, not just UI",
      },
      {
        id: id("highlight-learner"),
        icon: "BookOpen",
        text: "Fast learner with focus on scalable and maintainable solutions",
      },
    ],
  },
  {
    id: id("highlight-learning"),
    slug: "learning",
    icon: "BookOpen",
    label: "Always Growing",
    title: "Currently Learning",
    highlights: [
      {
        id: id("learning-design"),
        icon: "Server",
        text: "Advanced system design for scalable applications",
      },
      {
        id: id("learning-perf"),
        icon: "Zap",
        text: "Performance optimization in React apps",
      },
      {
        id: id("learning-backend"),
        icon: "Layers",
        text: "Backend architecture using Node.js",
      },
      {
        id: id("learning-cloud"),
        icon: "Cloud",
        text: "Cloud infrastructure and DevOps basics (AWS)",
      },
    ],
  },
];

// ── Links ────────────────────────────────────────────────────────────────────

const EMAIL = "rajan1234stha@gmail.com";

export const DEFAULT_CONTACT_LINKS: ContactLinkView[] = [
  {
    id: id("contact-email"),
    icon: "Mail",
    label: "Email",
    value: EMAIL,
    href: `mailto:${EMAIL}`,
  },
];

export const DEFAULT_SOCIAL_LINKS: SocialLinkView[] = [
  {
    id: id("social-github"),
    icon: "Github",
    label: "GitHub",
    href: "https://github.com/Rajan123stha",
    showInHeader: true,
    showInFooter: true,
  },
  {
    id: id("social-linkedin"),
    icon: "Linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/rajan-shrestha-1624a1224/",
    showInHeader: true,
    showInFooter: true,
  },
  {
    id: id("social-email"),
    icon: "Mail",
    label: "Email",
    href: `mailto:${EMAIL}`,
    showInHeader: true,
    showInFooter: true,
  },
];

export const DEFAULT_NAV_ITEMS: NavItemView[] = [
  {
    id: id("nav-about"),
    label: "About",
    href: "#about",
    showInHeader: true,
    showInFooter: true,
  },
  {
    id: id("nav-services"),
    label: "Services",
    href: "#services",
    showInHeader: true,
    showInFooter: true,
  },
  {
    id: id("nav-skills"),
    label: "Skills",
    href: "#skills",
    showInHeader: true,
    showInFooter: true,
  },
  {
    id: id("nav-experience"),
    label: "Experience",
    href: "#experience",
    showInHeader: true,
    showInFooter: true,
  },
  {
    id: id("nav-projects"),
    label: "Projects",
    href: "#projects",
    showInHeader: true,
    showInFooter: true,
  },
  {
    id: id("nav-why"),
    label: "Why Me",
    href: "#whyMe",
    showInHeader: true,
    showInFooter: false,
  },
  {
    id: id("nav-contact"),
    label: "Contact",
    href: "#contact",
    showInHeader: true,
    showInFooter: true,
  },
];
