import { Reveal } from "@/components/ui/Reveal";
import { getMemories } from "@/lib/memories/queries";
import { memoryRelations } from "@/lib/memories/types";

const dateFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", month: "long", year: "numeric" });

/** Approved memories of Dr. Sabbir, as quiet cards in columns. */
export async function MemoryWall() {
  const memories = await getMemories();

  if (memories.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed border-glass-border px-6 py-12 text-center">
        <p className="text-[1.15rem] font-light text-fg">No memories shared yet.</p>
        <p className="mx-auto mt-2 max-w-md text-body/75">Were you his student, colleague or friend? Be the first to share one below.</p>
      </div>
    );
  }

  return (
    <>
      <p className="text-[0.95rem] text-muted">
        {memories.length} {memories.length === 1 ? "memory" : "memories"} shared
      </p>
      <ul className="mt-6 gap-4 [column-fill:_balance] sm:columns-2 lg:columns-3">
        {memories.map((m, i) => {
          const relation = memoryRelations.find((r) => r.value === m.relation)?.label;
          return (
            <Reveal as="li" key={m.id} delay={Math.min(i, 5) * 0.05} className="mb-4 break-inside-avoid">
              <figure className="glass-card relative p-6">
                <span aria-hidden className="absolute top-3 right-5 text-[3.5rem] leading-none font-extralight text-flare/30">
                  ”
                </span>
                <blockquote className="relative text-[1.02rem] leading-[1.75] whitespace-pre-line text-body/90">{m.message}</blockquote>
                <figcaption className="mt-5 border-t border-glass-border pt-4">
                  <p className="text-fg">{m.name}</p>
                  <p className="mt-0.5 text-[0.88rem] text-muted">
                    {[relation, m.affiliation].filter(Boolean).join(" · ")}
                    <span aria-hidden> · </span>
                    <time dateTime={m.sharedAt}>{dateFormat.format(new Date(m.sharedAt))}</time>
                  </p>
                </figcaption>
              </figure>
            </Reveal>
          );
        })}
      </ul>
    </>
  );
}
