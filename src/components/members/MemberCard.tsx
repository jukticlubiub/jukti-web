import { Logo, LogoMark } from "@/components/brand/Logo";
import { cn } from "@/lib/cn";
import { intakeLabel } from "@/lib/members/semester";
import type { Member } from "@/lib/members/types";
import { Avatar } from "./AccountHeader";

/**
 * The digital member card: ID-card proportions, the club's lava glow, the member's photo,
 * name and number, and the QR code Event Managers scan at the door. Scales with its width.
 */
export function MemberCard({ member, qr, className }: { member: Member; qr: string | null; className?: string }) {
  const intake = intakeLabel(member.iubId);
  return (
    <div
      className={cn(
        "@container relative aspect-[1.586] w-full overflow-clip rounded-[clamp(14px,4cqw,24px)] border border-white/10 text-white shadow-[0_40px_90px_-40px_rgb(200_74_26/0.65)]",
        "bg-[radial-gradient(110%_120%_at_0%_0%,rgb(200_74_26/0.55),transparent_55%),radial-gradient(80%_90%_at_100%_100%,rgb(120_40_12/0.6),transparent_60%),linear-gradient(140deg,#1d110c,#0a0605)]",
        className,
      )}
    >
      <span aria-hidden className="pointer-events-none absolute -right-[12cqw] -bottom-[22cqw] w-[62cqw] text-white/[0.045]">
        <LogoMark className="w-full" title="" />
      </span>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,rgb(255_255_255/0.025)_0_1px,transparent_1px_7cqw)]" />

      <div className="relative flex h-full flex-col justify-between p-[6cqw]">
        <div className="flex items-start justify-between gap-[3cqw]">
          <Logo className="w-[30cqw] text-white" />
          <div className="text-right">
            <p className="text-[2.4cqw] tracking-[0.3em] text-flare uppercase">Member</p>
            <p className="mt-[0.6cqw] font-heading text-[3.6cqw] tabular-nums">{member.memberNo ?? "—"}</p>
          </div>
        </div>

        <div className="flex items-end justify-between gap-[4cqw]">
          <div className="flex min-w-0 items-center gap-[3.5cqw]">
            <Avatar name={member.name} url={member.photoUrl} className="size-[17cqw] text-[8cqw] ring-[0.5cqw] ring-white/15" />
            <div className="min-w-0">
              <p className="line-clamp-2 font-heading text-[4.4cqw] leading-[1.1] break-words">{member.name}</p>
              <p className="mt-[1cqw] truncate text-[2.9cqw] text-white/70">
                {[member.department, intake].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-[0.5cqw] text-[2.6cqw] text-white/50 tabular-nums">ID {member.iubId}</p>
            </div>
          </div>
          {qr ? (
            <div
              role="img"
              aria-label="QR code for event check-in"
              className="size-[25cqw] shrink-0 rounded-[2.4cqw] bg-white p-[2cqw] [&_svg]:size-full"
              dangerouslySetInnerHTML={{ __html: qr }}
            />
          ) : (
            <div className="grid size-[25cqw] shrink-0 place-items-center rounded-[2.4cqw] border border-dashed border-white/25 p-[2cqw] text-center text-[2.2cqw] text-white/50">
              QR code coming soon
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
