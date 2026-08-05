import { z } from "zod";

/**
 * Public contact form. The only schema on the site that untrusted visitors can
 * submit against, so the bounds are deliberately tight.
 */
export const contactMessageSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tell me your name")
    .max(80, "That name is unusually long"),
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .max(160),
  message: z
    .string()
    .trim()
    .min(10, "A little more detail, please")
    .max(4000, "Please keep it under 4000 characters"),
  /**
   * Honeypot. Hidden from humans via CSS and `aria-hidden`; bots that fill
   * every field in the DOM trip it. Cheap, and it never inconveniences a real
   * visitor the way a CAPTCHA does.
   */
  website: z.string().max(0, "Rejected").optional().default(""),
});

export type ContactMessageInput = z.input<typeof contactMessageSchema>;
