/**
 * Background for inner pages (Events, Logs): the Team page's charcoal-to-black fall-off under
 * the ribbed glass, with a warm glow behind the title.
 */
export function PageBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[70rem]">
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#171716_0,#110c0c_20%,#0e0806_38%,#0a0505_52%,#000_75%)]" />
      <div className="bg-ribs absolute inset-x-0 top-0 h-[42rem] [mask-image:linear-gradient(to_bottom,#000_50%,transparent)]" />
      <div className="absolute inset-x-0 top-[8rem] mx-auto h-[24rem] max-w-5xl rounded-[100%] bg-[radial-gradient(closest-side,rgb(102_42_17/0.5),transparent)]" />
    </div>
  );
}
