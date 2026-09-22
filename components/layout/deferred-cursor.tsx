"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

/**
 * The custom cursor, loaded only where it can appear.
 *
 * It does nothing on touch screens — most visitors, and the device class
 * Google measures page speed on — so loading its code there was pure cost.
 */
const CustomCursor = dynamic(() => import("@/components/customcursor"), { ssr: false });

export function DeferredCursor() {
  const [finePointer, setFinePointer] = useState(false);

  useEffect(() => {
    setFinePointer(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);

  return finePointer ? <CustomCursor /> : null;
}
