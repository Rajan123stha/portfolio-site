"use client";

import Link from "next/link";
import { ArrowDown, ArrowUpRight, Download, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TypewriterEffect } from "@/components/ui/typewriter-effect";
import type { ProfileView, SectionView } from "@/lib/queries/public";
import { CodeCard } from "./code-card";
import { TechMarquee } from "./tech-marquee";

type HeroProps = {
  profile: ProfileView;
  section: SectionView;
  /** Technologies pulled from the skills section, for the marquee strip. */
  tech: string[];
};

/**
 * Staggered entrance, done in CSS rather than Framer Motion.
 *
 * With Framer, every hero element was server-rendered at `opacity: 0` and only
 * faded in once the page's JavaScript had loaded and hydrated. The heading and
 * bio are the page's largest content, so the browser couldn't count them as
 * painted until then — on a mid-range phone that pushed Largest Contentful
 * Paint to about 5s. A CSS animation starts with the first paint, JavaScript or
 * not, so the same entrance now finishes within a second.
 */
function rise(step: number) {
  return { animationDelay: `${100 + step * 80}ms` };
}

export function Hero({ profile, tech }: HeroProps) {
  const {
    greeting,
    fullName,
    headline,
    typewriterWords,
    availabilityLabel,
    availabilityVisible,
    heroBio,
    openTo,
    location,
    experienceYears,
    experienceLabel,
    cvUrl,
  } = profile;

  return (
    <section
      id="intro"
      className="relative scroll-mt-24 overflow-hidden pb-12 pt-14 md:pb-16 md:pt-20"
    >
      {/*
        Blueprint grid + accent blooms.
        `z-0`, not `-z-10`: the site wrapper paints `bg-background`, so a
        negative z-index pushed this layer behind that fill and made the whole
        treatment invisible. Content sits above it via `relative z-10`.
      */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div className="grid-bg absolute inset-0" />
        <div className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full bg-primary/[0.10] blur-[130px]" />
        <div className="absolute -bottom-52 -left-40 h-[520px] w-[520px] rounded-full bg-accent-2/[0.08] blur-[130px]" />
      </div>

      <div className="container relative z-10 max-w-6xl">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          {/* ── LEFT: type ── */}
          <div className="flex flex-col gap-7">
            {availabilityVisible && availabilityLabel ? (
              <div className="animate-rise" style={rise(0)}>
                <span className="inline-flex w-fit items-center gap-2.5 rounded-full border border-border bg-card px-3.5 py-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  <span className="label-mono text-muted-foreground">
                    {availabilityLabel}
                  </span>
                </span>
              </div>
            ) : null}

            {/*
              The greeting sits outside the <h1>: the main heading is the
              strongest on-page signal of what the page is about, so it holds
              the name and the role — not "Hi 👋, I'm".
            */}
            <div className="animate-rise" style={rise(1)}>
              {greeting ? (
                <p className="text-display">
                  <span className="block text-[0.42em] font-normal leading-tight tracking-normal text-muted-foreground">
                    {greeting}
                  </span>
                </p>
              ) : null}
              <h1 className="text-display font-semibold text-balance">
                <span className="text-gradient">{fullName}</span>
                {headline ? (
                  <span className="mt-3 block text-[max(0.32em,1.15rem)] font-medium leading-snug tracking-tight text-foreground/80">
                    {headline}
                  </span>
                ) : null}
              </h1>
            </div>

            {typewriterWords.length > 0 ? (
              <div className="-mt-2 animate-rise" style={rise(2)}>
                <TypewriterEffect
                  words={typewriterWords}
                  className="font-mono text-lg text-muted-foreground md:text-xl"
                />
              </div>
            ) : null}

            {heroBio ? (
              <p
                className="max-w-xl animate-rise text-base leading-relaxed text-muted-foreground text-pretty md:text-lg"
                style={rise(3)}
              >
                {heroBio}
              </p>
            ) : null}

            {openTo.length > 0 ? (
              <ul className="flex animate-rise flex-wrap gap-2" style={rise(4)}>
                {openTo.map((tag) => (
                  <li
                    key={tag}
                    className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.07] px-3 py-1 text-xs font-medium text-primary"
                  >
                    <span aria-hidden className="h-1 w-1 rounded-full bg-primary" />
                    {tag}
                  </li>
                ))}
              </ul>
            ) : null}

            <div
              className="flex animate-rise flex-col gap-3 pt-1 sm:flex-row"
              style={rise(5)}
            >
              <Button
                asChild
                size="lg"
                className="group h-12 rounded-full px-7 text-sm font-medium"
              >
                <Link href="#contact">
                  Get in touch
                  <ArrowUpRight
                    aria-hidden
                    className="ml-1.5 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </Link>
              </Button>

              {cvUrl ? (
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="group h-12 rounded-full border-border bg-card px-7 text-sm font-medium hover:border-primary/40 hover:bg-elevated"
                >
                  <a href={cvUrl} download>
                    <Download
                      aria-hidden
                      className="mr-1.5 h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5"
                    />
                    Download CV
                  </a>
                </Button>
              ) : null}
            </div>

            {location || experienceYears ? (
              <dl
                className="flex animate-rise flex-wrap items-center gap-x-8 gap-y-3 border-t border-border pt-6"
                style={rise(6)}
              >
                {location ? (
                  <div className="flex items-center gap-2">
                    <dt className="sr-only">Location</dt>
                    <MapPin aria-hidden className="h-3.5 w-3.5 text-primary" />
                    <dd className="font-mono text-xs text-muted-foreground">
                      {location}
                    </dd>
                  </div>
                ) : null}

                {experienceYears ? (
                  <div className="flex items-baseline gap-2">
                    <dt className="sr-only">Experience</dt>
                    <dd className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold tabular-nums text-foreground">
                        {experienceYears}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {experienceLabel}
                      </span>
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}
          </div>

          {/* ── RIGHT: the profile, as source ── */}
          <div
            className="relative mx-auto w-full max-w-md animate-rise lg:mx-0"
            style={rise(2)}
          >
            <div className="relative">
              {/*
                Offset frame: a second bordered rectangle behind the card,
                nudged down-right. It reads as intentional composition where a
                drop shadow would just read as a default.
              */}
              <div
                aria-hidden
                className="absolute inset-0 translate-x-3 translate-y-3 rounded-2xl border border-primary/25"
              />

              {/*
                The stack pills that used to float around the portrait are gone.
                Over a photo they were decoration; over readable code they sat
                on top of the lines they were describing — and the card's
                `stack:` array already lists exactly the same values, so keeping
                both would have printed the same four words twice.
              */}
              <CodeCard profile={profile} className="relative" />
            </div>
          </div>
        </div>

        {/* Tech strip — a quiet summary of the stack before the reader scrolls. */}
        {tech.length > 0 ? (
          <div
            className="mt-14 animate-fade border-t border-border pt-7"
            style={{ animationDelay: "700ms" }}
          >
            <TechMarquee items={tech} />
          </div>
        ) : null}

        <div className="mt-10 flex animate-fade justify-center" style={{ animationDelay: "900ms" }}>
          <Link
            href="#about"
            className="group flex flex-col items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
          >
            <span className="label-mono">Scroll</span>
            <ArrowDown
              aria-hidden
              className="h-4 w-4 animate-bounce motion-reduce:animate-none"
            />
            <span className="sr-only">Jump to the About section</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
