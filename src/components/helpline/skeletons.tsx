import { cn } from "@/lib/cn";

const block = "rounded-[20px] border border-glass-border bg-glass motion-safe:animate-pulse";

export function AskSkeleton() {
  return (
    <div aria-hidden className={cn(block, "h-[20rem]")}>
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function AnswerFormSkeleton() {
  return <div aria-hidden className={cn(block, "h-56")} />;
}

export function QuestionSkeleton() {
  return (
    <div aria-hidden className="mx-auto max-w-[76rem] space-y-6 px-5 pt-[clamp(8rem,11vw,12rem)] lg:px-[clamp(2rem,4vw,5rem)]">
      <div className={cn(block, "h-6 w-36 rounded-full")} />
      <div className={cn(block, "h-28")} />
      <div className={cn(block, "h-48")} />
    </div>
  );
}
