"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Slide {
  heading: string;
  subtext: string;
  ctaLabel: string;
  ctaHref: string;
  // Placeholder gradients until real product/shop photography is supplied —
  // swap `background` for a `backgroundImage` once you have real photos,
  // same pattern used for the logo and engine-plate placeholders elsewhere.
  gradient: string;
}

const SLIDES: Slide[] = [
  {
    heading: "Genuine engine parts, matched to your engine number",
    subtext: "Not just a general model family — the exact part for your exact engine.",
    ctaLabel: "Browse the catalog",
    ctaHref: "/catalog",
    gradient: "linear-gradient(135deg, #1D3F72 0%, #142B4E 100%)",
  },
  {
    heading: "Delivery or pickup — your choice",
    subtext: "Nationwide delivery priced by state, or pick up free at our location.",
    ctaLabel: "See how it works",
    ctaHref: "/about",
    gradient: "linear-gradient(135deg, #D62828 0%, #A81F1F 100%)",
  },
  {
    heading: "Not sure which part fits?",
    subtext: "Search by engine number and we'll show you exactly what matches.",
    ctaLabel: "Find my part",
    ctaHref: "/catalog",
    gradient: "linear-gradient(135deg, #142B4E 0%, #D62828 100%)",
  },
];

const AUTO_ADVANCE_MS = 6000;

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [paused]);

  const slide = SLIDES[index];

  return (
    <section
      className="relative overflow-hidden px-4 py-24 text-center text-white transition-[background] duration-700"
      style={{ background: slide.gradient }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-4 text-3xl font-bold sm:text-4xl">{slide.heading}</h1>
        <p className="mb-8 text-lg text-white/90">{slide.subtext}</p>
        <Link href={slide.ctaHref} className="btn-primary bg-white !text-brand-blue hover:bg-white/90">
          {slide.ctaLabel}
        </Link>
      </div>

      {SLIDES.length > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length)}
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => setIndex((i) => (i + 1) % SLIDES.length)}
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
          >
            ›
          </button>

          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-2 w-2 rounded-full transition ${
                  i === index ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
