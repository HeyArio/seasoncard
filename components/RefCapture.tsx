"use client";
import { useEffect } from "react";
import { captureRef } from "@/lib/ref";

export default function RefCapture() {
  useEffect(() => {
    captureRef(window.location.search);
  }, []);
  return null;
}
