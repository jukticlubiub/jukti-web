import rehypeShiki from "@shikijs/rehype";
import { cacheLife } from "next/cache";
import Link from "next/link";
import { MarkdownAsync, type Components } from "react-markdown";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import type { ShikiTransformer } from "shiki";
import { HashIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { CodeBlock } from "./CodeBlock";
import { emberCodeTheme } from "./code-theme";

// Tells <CodeBlock> which language it's showing.
const languageAttribute: ShikiTransformer = {
  name: "jukti:language-attribute",
  pre(node) {
    node.properties["data-language"] = this.options.lang;
  },
};

function heading(level: 2 | 3 | 4) {
  const Tag = `h${level}` as const;
  const size = {
    2: "mt-16 font-heading text-[clamp(1.35rem,2vw,1.8rem)] leading-[1.2]",
    3: "mt-11 font-heading text-[clamp(1.1rem,1.5vw,1.3rem)] leading-[1.3]",
    4: "mt-9 text-[1.15rem] font-medium text-fg",
  }[level];
  return function Heading({ id, children }: React.ComponentProps<"h2">) {
    return (
      <Tag id={id} className={cn("group relative scroll-mt-28", size)}>
        {children}
        {id && (
          <a
            href={`#${id}`}
            aria-label="Link to this section"
            className="ml-2 inline-flex translate-y-[-0.05em] align-middle text-[0.7em] text-flare opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <HashIcon />
          </a>
        )}
      </Tag>
    );
  };
}

const linkClass =
  "text-flare underline decoration-flare/40 underline-offset-[0.2em] transition-colors hover:text-fg hover:decoration-fg";

const components: Components = {
  h1: heading(2),
  h2: heading(2),
  h3: heading(3),
  h4: heading(4),
  p({ node, children }) {
    // A paragraph holding only an image becomes a block, so the image can span the column.
    const onlyImage = node?.children.length === 1 && node.children[0].type === "element" && node.children[0].tagName === "img";
    return onlyImage ? <div className="mt-8">{children}</div> : <p className="mt-6">{children}</p>;
  },
  a({ href = "", children }) {
    if (href.startsWith("/") || href.startsWith("#")) {
      return (
        <Link href={href} className={linkClass}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
        {children}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  },
  ul: ({ children }) => <ul className="mt-6 list-disc space-y-3 pl-6 marker:text-flare">{children}</ul>,
  ol: ({ children }) => <ol className="mt-6 list-decimal space-y-3 pl-6 marker:font-medium marker:text-flare">{children}</ol>,
  li: ({ children }) => <li className="pl-1.5 [&>ul]:mt-3 [&>ol]:mt-3">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="mt-9 rounded-r-[16px] border-l-2 border-flare bg-[linear-gradient(90deg,rgb(200_74_26/0.14),transparent_70%)] py-5 pr-5 pl-6 text-[1.15em] leading-relaxed text-fg [&>*:first-child]:mt-0">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => <strong className="font-medium text-fg">{children}</strong>,
  em: ({ children }) => <em className="text-fg">{children}</em>,
  hr: () => (
    <div role="separator" className="my-14 flex items-center justify-center gap-3">
      <span className="h-px w-24 bg-[linear-gradient(90deg,transparent,rgb(245_124_72/0.7))]" />
      <span className="size-1.5 rounded-full bg-flare shadow-[0_0_10px_rgb(245_124_72/0.9)]" />
      <span className="h-px w-24 bg-[linear-gradient(90deg,rgb(245_124_72/0.7),transparent)]" />
    </div>
  ),
  pre({ node, children, ...pre }) {
    void node;
    return (
      <CodeBlock {...pre} language={(pre as Record<string, string | undefined>)["data-language"]}>
        {children}
      </CodeBlock>
    );
  },
  table: ({ children }) => (
    <div data-lenis-prevent-horizontal className="mt-8 overflow-x-auto rounded-[16px] border border-glass-border">
      <table className="w-full border-collapse text-left text-[0.95em]">{children}</table>
    </div>
  ),
  th: ({ children, style }) => (
    <th style={style} className="bg-white/[0.04] px-5 py-3.5 font-medium whitespace-nowrap text-fg">
      {children}
    </th>
  ),
  td: ({ children, style }) => (
    <td style={style} className="border-t border-glass-border px-5 py-3.5">
      {children}
    </td>
  ),
  img({ src, alt = "", title }) {
    if (typeof src !== "string") return null;
    return (
      <span className="block">
        {/* Editors link images of any size and host, so a plain img (not next/image) keeps them working. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} title={title} loading="lazy" className="block w-full rounded-[16px] border border-glass-border" />
        {title && <span className="mt-3 block text-center text-[0.9rem] text-muted">{title}</span>}
      </span>
    );
  },
};

/**
 * A log's Markdown, set in the site's type: GitHub-flavored Markdown, heading ids for
 * the table of contents (rehype-slug), and code highlighted at render time by Shiki
 * in the site's colors. Raw HTML in the Markdown is not rendered.
 *
 * Cached by its input: the same Markdown always renders the same way, so each version
 * of a log is highlighted once (the pipeline also reads the clock, which a prerender
 * can't do outside a cache).
 */
export async function LogMarkdown({ markdown, className }: { markdown: string; className?: string }) {
  "use cache";
  cacheLife("max");

  return (
    <div
      className={cn(
        "text-[clamp(1.05rem,1.2vw,1.18rem)] leading-[1.8] text-body [&>*:first-child]:mt-0",
        // Inline code (code outside a code block).
        "[&_:not(pre)>code]:rounded-md [&_:not(pre)>code]:border [&_:not(pre)>code]:border-glass-border [&_:not(pre)>code]:bg-white/[0.06] [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5 [&_:not(pre)>code]:font-mono [&_:not(pre)>code]:text-[0.85em] [&_:not(pre)>code]:text-[#ffc9a6]",
        className,
      )}
    >
      <MarkdownAsync
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeSlug,
          [rehypeShiki, { theme: emberCodeTheme, lazy: true, fallbackLanguage: "text", transformers: [languageAttribute] }],
        ]}
        components={components}
      >
        {markdown}
      </MarkdownAsync>
    </div>
  );
}
