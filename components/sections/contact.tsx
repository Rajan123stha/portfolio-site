"use client";

import { useTransition } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { submitContactMessage } from "@/lib/actions/contact";
import { resolveIcon } from "@/lib/design-tokens";
import {
  contactMessageSchema,
  type ContactMessageInput,
} from "@/lib/validators/message";
import type { ContactLinkView, SectionView } from "@/lib/queries/public";
import { cn } from "@/lib/utils";
import { SectionGlow, SectionRules } from "./section-decor";
import { SectionHeading } from "./section-heading";

type ContactProps = {
  section: SectionView;
  links: ContactLinkView[];
  index: number;
};

const fieldClass =
  "w-full rounded-lg border border-border bg-background px-4 py-3 text-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 aria-[invalid=true]:border-destructive";

export function Contact({ section, links, index }: ContactProps) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ContactMessageInput>({
    resolver: zodResolver(contactMessageSchema),
    defaultValues: { name: "", email: "", message: "", website: "" },
  });

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const result = await submitContactMessage(values);

      if (!result.ok) {
        // Surface server-side field errors on the inputs they belong to;
        // anything unattributed becomes a toast.
        for (const [field, fieldMessages] of Object.entries(
          result.fieldErrors ?? {},
        )) {
          if (field in values) {
            setError(field as keyof ContactMessageInput, {
              message: fieldMessages[0],
            });
          }
        }
        toast.error(result.error);
        return;
      }

      toast.success(result.message ?? "Message sent.");
      reset();
    });
  });

  return (
    <section
      id="contact"
      className="relative scroll-mt-24 overflow-hidden bg-background py-20 md:py-28"
    >
      <SectionRules />
      <SectionGlow variant="bottomLeft" />

      <div className="container relative max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          {/* ── Pitch + direct links ── */}
          <div className="space-y-8">
            <SectionHeading
              // The lede is rendered below at a larger size, so it's suppressed
              // in the heading block to avoid stating it twice.
              section={{ ...section, subheading: null }}
              index={index}
            />

            {section.subheading ? (
              <motion.p
                className="text-lg leading-relaxed text-muted-foreground text-pretty"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                {section.subheading}
              </motion.p>
            ) : null}

            {section.note ? (
              <motion.p
                className="text-xl font-semibold tracking-tight text-balance"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.22 }}
              >
                {section.note}
              </motion.p>
            ) : null}

            {links.length > 0 ? (
              <ul className="space-y-2.5">
                {links.map((link, i) => {
                  const Icon = resolveIcon(link.icon);
                  const external = link.href.startsWith("http");

                  return (
                    <motion.li
                      key={link.id}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.28 + i * 0.07 }}
                    >
                      <a
                        href={link.href}
                        target={external ? "_blank" : undefined}
                        rel={external ? "noopener noreferrer" : undefined}
                        className="group flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:border-primary/40 hover:bg-elevated"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-primary transition-colors group-hover:border-primary/40">
                          <Icon aria-hidden className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="label-mono block text-muted-foreground">
                            {link.label}
                          </span>
                          <span className="mt-0.5 block truncate text-sm font-medium">
                            {link.value}
                          </span>
                        </span>
                        <ArrowUpRight
                          aria-hidden
                          className="h-4 w-4 shrink-0 text-muted-foreground transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
                        />
                      </a>
                    </motion.li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          {/* ── Form ── */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.55, delay: 0.2 }}
          >
            <SpotlightCard className="p-7 md:p-8">
              <form className="relative space-y-5" onSubmit={onSubmit} noValidate>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Name" error={errors.name?.message}>
                    <input
                      {...register("name")}
                      id="contact-name"
                      autoComplete="name"
                      placeholder="Your name"
                      aria-invalid={Boolean(errors.name)}
                      className={fieldClass}
                    />
                  </Field>

                  <Field label="Email" error={errors.email?.message}>
                    <input
                      {...register("email")}
                      id="contact-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      aria-invalid={Boolean(errors.email)}
                      className={fieldClass}
                    />
                  </Field>
                </div>

                <Field label="Message" error={errors.message?.message}>
                  <textarea
                    {...register("message")}
                    id="contact-message"
                    rows={6}
                    placeholder="Tell me about your project or the role you're hiring for…"
                    aria-invalid={Boolean(errors.message)}
                    className={cn(fieldClass, "min-h-[150px] resize-y")}
                  />
                </Field>

                {/*
                  Honeypot. Present in the DOM but hidden from assistive tech and
                  keyboard order, so form-filling bots trip it and humans never
                  see it.
                */}
                <div aria-hidden className="hidden">
                  <label htmlFor="contact-website">Website</label>
                  <input
                    {...register("website")}
                    id="contact-website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="h-12 w-full gap-2 rounded-full font-medium"
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send aria-hidden className="h-4 w-4" />
                  )}
                  {isPending ? "Sending…" : "Send message"}
                </Button>

                <p className="text-center font-mono text-[11px] text-muted-foreground">
                  I usually reply within a day or two.
                </p>
              </form>
            </SpotlightCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactElement<{ id?: string }>;
}) {
  const id = children.props.id;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="label-mono block text-muted-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
