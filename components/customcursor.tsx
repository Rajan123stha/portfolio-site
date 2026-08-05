"use client";

import { useEffect, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  AnimatePresence,
} from "framer-motion";

export default function CustomCursor() {
  const [isPointer, setIsPointer] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const mouseX = useMotionValue(-200);
  const mouseY = useMotionValue(-200);

  const ringX = useSpring(mouseX, { damping: 22, stiffness: 180, mass: 0.6 });
  const ringY = useSpring(mouseY, { damping: 22, stiffness: 180, mass: 0.6 });

  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const onMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      setIsVisible(true);

      const target = e.target as HTMLElement;
      const clickable = target.closest(
        "a, button, [role='button'], input, textarea, select, label, [data-cursor='pointer']",
      );
      setIsPointer(!!clickable);
    };

    const onDown = () => setIsClicking(true);
    const onUp = () => setIsClicking(false);
    const onLeave = () => setIsVisible(false);
    const onEnter = () => setIsVisible(true);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.documentElement.addEventListener("mouseleave", onLeave);
    document.documentElement.addEventListener("mouseenter", onEnter);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      document.documentElement.removeEventListener("mouseenter", onEnter);
    };
  }, [mouseX, mouseY]);

  return (
    <>
      {/* ── RING (lags behind) ── */}
      <motion.div
        className="pointer-events-none fixed z-[9998]"
        style={{ x: ringX, y: ringY, translateX: "-50%", translateY: "-50%" }}
        animate={{ opacity: isVisible ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          animate={{
            width: isPointer ? 52 : isClicking ? 32 : 40,
            height: isPointer ? 52 : isClicking ? 32 : 40,
            borderWidth: isPointer ? 2 : 1.5,
            opacity: isPointer ? 1 : 0.65,
          }}
          transition={{ type: "spring", stiffness: 240, damping: 20 }}
          style={{
            borderRadius: "50%",
            borderStyle: "solid",
            borderColor: isPointer
              ? "hsl(var(--primary))"
              : "hsl(var(--foreground))",
            boxShadow: isPointer
              ? "0 0 12px 2px hsl(var(--primary) / 0.35), inset 0 0 8px hsl(var(--primary) / 0.1)"
              : "0 0 6px 1px hsl(var(--foreground) / 0.15)",
          }}
        />

        {/* Pointer arrow badge */}
        <AnimatePresence>
          {isPointer && (
            <motion.div
              className="absolute -bottom-1 -right-1"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <div
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  background: "hsl(var(--primary))",
                  boxShadow: "0 0 8px 2px hsl(var(--primary) / 0.5)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1 1L7 4L4.5 4.5L3.5 7L1 1Z" fill="white" />
                </svg>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── DOT (snaps instantly) ── */}
      <motion.div
        className="pointer-events-none fixed z-[9999]"
        style={{ x: mouseX, y: mouseY, translateX: "-50%", translateY: "-50%" }}
        animate={{ opacity: isVisible ? 1 : 0 }}
        transition={{ duration: 0.15 }}
      >
        <motion.div
          animate={{
            width: isClicking ? 5 : isPointer ? 7 : 9,
            height: isClicking ? 5 : isPointer ? 7 : 9,
            scale: isClicking ? 0.7 : 1,
          }}
          transition={{ type: "spring", stiffness: 400, damping: 22 }}
          style={{
            borderRadius: "50%",
            background: isPointer
              ? "hsl(var(--primary))"
              : "hsl(var(--foreground))",
            boxShadow: isPointer
              ? "0 0 10px 3px hsl(var(--primary) / 0.6)"
              : "0 0 6px 1px hsl(var(--foreground) / 0.4)",
          }}
        />
      </motion.div>

      {/* ── CLICK RIPPLE ── */}
      <AnimatePresence>
        {isClicking && (
          <motion.div
            key="ripple"
            className="pointer-events-none fixed z-[9997]"
            style={{
              x: mouseX,
              y: mouseY,
              translateX: "-50%",
              translateY: "-50%",
              borderRadius: "50%",
              border: "1.5px solid hsl(var(--primary) / 0.7)",
            }}
            initial={{ width: 14, height: 14, opacity: 0.9 }}
            animate={{ width: 68, height: 68, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
