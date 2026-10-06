/**
 * Background for inner pages (Events, Logs): the Team page's charcoal-to-black fall-off under
 * the ribbed glass, with a warm glow behind the title.
 */
export function PageBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[70rem]">
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#1b1816_0,#170d0a_20%,#130907_38%,#0d0605_55%,#000_80%)]" />
      <div className="bg-ribs absolute inset-x-0 top-0 h-[48rem] [mask-image:linear-gradient(to_bottom,#000_55%,transparent)]" />
      <div className="absolute inset-x-0 top-[6rem] mx-auto h-[28rem] max-w-6xl rounded-[100%] bg-[radial-gradient(closest-side,rgb(120_48_18/0.8),transparent)]" />
      <div className="absolute inset-x-0 top-[11rem] mx-auto h-[16rem] max-w-3xl rounded-[100%] bg-[radial-gradient(closest-side,rgb(200_74_26/0.22),transparent)]" />
    </div>
  );
}
