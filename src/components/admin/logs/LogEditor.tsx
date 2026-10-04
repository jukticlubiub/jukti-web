"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { saveLog } from "@/lib/admin/actions/logs";
import type { AdminLog } from "@/lib/admin/data/logs";
import { toDhakaInput } from "@/lib/admin/form";
import { cn } from "@/lib/cn";
import { logCategories, logCategoryLabels } from "@/lib/logs/types";
import { AdminForm, Field, inputClass, Select, TextArea, TextField } from "../forms";
import { ImageField } from "../ImageField";
import { OpenCreated } from "../OpenCreated";

const toLogPage = (id: string) => `/admin/logs/${id}`;

/** Write a log in Markdown, with a live preview (PR Editor). */
export function LogEditor({ log, live }: { log?: AdminLog; live: boolean }) {
  const [body, setBody] = useState(log?.body ?? "");
  const [view, setView] = useState<"write" | "preview">("write");
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;

  return (
    <AdminForm action={saveLog} submitLabel={log ? "Save" : "Create log"}>
      {(state) => (
        <>
          {!log && <OpenCreated id={state.id} href={toLogPage} />}
          {log && <input type="hidden" name="id" value={log.id} />}
          <div className="grid gap-5 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <TextField label="Title" name="title" state={state} defaultValue={log?.title} />
            <TextField label="Web address" name="slug" state={state} defaultValue={log?.slug} placeholder="made from the title" hint={<span className="text-[0.78rem] text-muted">/logs/…</span>} />
          </div>
          <TextArea label="Excerpt (cards, RSS and link previews)" name="excerpt" rows={2} state={state} defaultValue={log?.excerpt} />

          <Field
            label="Body (Markdown)"
            error={state.fieldErrors?.body}
            hint={<span className="text-[0.78rem] text-muted">{words.toLocaleString()} words · about {Math.max(1, Math.round(words / 220))} min read</span>}
          >
            {(props) => (
              <div className="overflow-hidden rounded-[12px] border border-glass-border">
                <div role="tablist" aria-label="Editor" className="flex border-b border-glass-border bg-white/[0.03]">
                  {(["write", "preview"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      role="tab"
                      aria-selected={view === v}
                      onClick={() => setView(v)}
                      className={cn("px-4 py-2 text-[0.85rem] capitalize", view === v ? "text-fg shadow-[inset_0_-2px_0_var(--color-flare)]" : "text-muted hover:text-fg")}
                    >
                      {v}
                    </button>
                  ))}
                  <span className="ml-auto self-center pr-3 text-[0.75rem] text-muted">## heading · **bold** · [link](url) · ```lang code```</span>
                </div>
                <textarea
                  {...props}
                  name="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={22}
                  hidden={view !== "write"}
                  className={cn(inputClass, "rounded-none border-0 py-3 font-mono text-[0.9rem] leading-relaxed")}
                />
                {view === "preview" && (
                  <div className="prose-admin max-h-[38rem] min-h-[20rem] overflow-y-auto px-5 py-4 text-body [&_a]:text-flare [&_blockquote]:border-l-2 [&_blockquote]:border-flare/50 [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1 [&_h2]:mt-8 [&_h2]:text-[1.4rem] [&_h2]:text-fg [&_h3]:mt-6 [&_h3]:text-[1.15rem] [&_h3]:text-fg [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_p]:leading-relaxed [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-[10px] [&_pre]:bg-black/50 [&_pre]:p-4 [&_table]:my-4 [&_td]:border [&_td]:border-glass-border [&_td]:px-2 [&_th]:border [&_th]:border-glass-border [&_th]:px-2 [&_ul]:list-disc [&_ul]:pl-6">
                    {body.trim() ? <Markdown remarkPlugins={[remarkGfm]}>{body}</Markdown> : <p className="text-muted">Nothing to preview yet.</p>}
                  </div>
                )}
              </div>
            )}
          </Field>

          <div className="grid gap-5 md:grid-cols-3">
            <Select label="Category" name="category" state={state} defaultValue={log?.category ?? "news"} options={logCategories.map((c) => ({ value: c, label: logCategoryLabels[c] }))} />
            <TextField label="Author" name="authorName" state={state} defaultValue={log?.authorName ?? "JUKTI"} hint={<span className="text-[0.75rem] text-muted">“JUKTI …” shows the club mark</span>} />
            <TextField label="Author’s role (optional)" name="authorRole" state={state} defaultValue={log?.authorRole} />
          </div>
          <ImageField label="Author photo (optional)" name="authorAvatarUrl" folder="logs/authors" preset="avatar" defaultUrl={log?.authorAvatarUrl} live={live} />
          <ImageField label="Cover image (optional: without one the site draws cover art)" name="coverUrl" folder="logs" preset="logCover" defaultUrl={log?.coverUrl} live={live} />
          <TextField label="Cover description (for screen readers)" name="coverAlt" state={state} defaultValue={log?.coverAlt} />

          <fieldset className="grid gap-4 rounded-[14px] border border-glass-border p-4 md:grid-cols-2">
            <legend className="px-2 text-[0.85rem] text-muted">Publishing</legend>
            <Select
              label="Status"
              name="status"
              state={state}
              defaultValue={log?.status ?? "draft"}
              options={[
                { value: "draft", label: "Draft (only visible here)" },
                { value: "published", label: "Published" },
              ]}
            />
            <TextField label="Publish date (empty = now; future = scheduled)" name="publishedAt" type="datetime-local" state={state} defaultValue={toDhakaInput(log?.publishedAt)} />
          </fieldset>
        </>
      )}
    </AdminForm>
  );
}
