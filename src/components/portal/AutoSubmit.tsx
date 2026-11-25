"use client";

import { useEffect, useRef } from "react";

// Submits the surrounding form as soon as one of its selects changes, so the
// search button is only needed without JavaScript.
export function AutoSubmit() {
  const marker = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = marker.current?.closest("form");
    if (!form) return;
    const onChange = (event: Event) => {
      if (event.target instanceof HTMLSelectElement) form.requestSubmit();
    };
    form.addEventListener("change", onChange);
    return () => form.removeEventListener("change", onChange);
  }, []);

  return <span ref={marker} hidden />;
}
