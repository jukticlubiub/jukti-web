"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { CheckIcon, CopyIcon } from "@/components/ui/icons";

const languageNames: Record<string, string> = {
  cpp: "C++",
  c: "C",
  ts: "TypeScript",
  tsx: "TSX",
  js: "JavaScript",
  jsx: "JSX",
  py: "Python",
  python: "Python",
  bash: "Terminal",
  sh: "Terminal",
  shell: "Terminal",
  sql: "SQL",
  json: "JSON",
  java: "Java",
  text: "Text",
};

/** A highlighted code block (from Shiki) in a glass frame, with its language and a copy button. */
export function CodeBlock({
  language,
  children,
  ...pre
}: React.ComponentProps<"pre"> & { language?: string }) {
  const code = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    const text = code.current?.innerText ?? "";
    try {
      await navigator.clipboard.writeText(text.replace(/\n$/, ""));
      setCopied(true);
    } catch {
      // Clipboard blocked (no permission, or an insecure origin): select the code instead,
      // so Cmd/Ctrl+C copies it.
      const range = document.createRange();
      if (code.current) range.selectNodeContents(code.current);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }

  const label = language ? (languageNames[language] ?? language.toUpperCase()) : "Code";

  return (
    <div className="my-8 overflow-hidden rounded-[16px] border border-glass-border bg-[#0c0705] shadow-[0_24px_60px_-36px_rgb(245_124_72/0.45)]">
      <div className="flex items-center justify-between gap-4 border-b border-glass-border bg-white/[0.025] py-2 pr-2 pl-4">
        <span className="flex items-center gap-2.5 text-[0.75rem] font-medium tracking-[0.14em] text-muted uppercase">
          <span aria-hidden className="size-1.5 rounded-full bg-flare shadow-[0_0_8px_rgb(245_124_72/0.9)]" />
          {label}
        </span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.8rem] text-body transition-colors hover:bg-white/[0.06] hover:text-fg"
        >
          {copied ? <CheckIcon className="text-flare" /> : <CopyIcon />}
          <span className="relative">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={copied ? "copied" : "copy"}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.16 }}
                className="block"
              >
                {copied ? "Copied" : "Copy"}
              </motion.span>
            </AnimatePresence>
          </span>
          <span role="status" className="sr-only">
            {copied ? "Code copied to clipboard" : ""}
          </span>
        </button>
      </div>
      <pre
        ref={code}
        data-lenis-prevent-horizontal
        {...pre}
        style={undefined}
        className="overflow-x-auto p-5 font-mono text-[0.9rem] leading-[1.7] [tab-size:4] sm:px-6"
      >
        {children}
      </pre>
    </div>
  );
}
