"use client";

import { startTransition, useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/members/AccountHeader";
import { type CheckInState, checkInMember, type ScanOutcome } from "@/lib/admin/actions/members";
import { cn } from "@/lib/cn";
import { inputClass } from "../forms";

type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };

/** Finds a QR code in a video frame: the browser's own detector where there is one, else jsQR. */
async function makeReader(): Promise<(video: HTMLVideoElement) => Promise<string | null>> {
  const Native = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
  if (Native) {
    const detector = new Native({ formats: ["qr_code"] });
    return async (video) => (await detector.detect(video))[0]?.rawValue ?? null;
  }
  const { default: jsQR } = await import("jsqr");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  return async (video) => {
    const scale = Math.min(1, 640 / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)?.data ?? null;
  };
}

/** Green: let them in / serve them. Red: don't (already served). Amber: not confirmed. Blue: already in, no harm. */
const outcomeLook: Record<ScanOutcome, { tone: string; badge: string }> = {
  checked_in: { tone: "border-emerald-400/50 bg-emerald-400/15", badge: "✓ Checked in" },
  already_checked_in: { tone: "border-sky-400/40 bg-sky-400/10", badge: "Already in" },
  served: { tone: "border-emerald-400/50 bg-emerald-400/15", badge: "✓ Go ahead" },
  already_served: { tone: "border-[#ff8f7a]/60 bg-[#ff8f7a]/15", badge: "✕ Already taken" },
  no_rsvp: { tone: "border-amber-300/50 bg-amber-300/10", badge: "No RSVP" },
  waitlisted: { tone: "border-amber-300/50 bg-amber-300/10", badge: "Waitlisted" },
  unpaid: { tone: "border-amber-300/50 bg-amber-300/10", badge: "Not paid" },
  wrong_event: { tone: "border-[#ff8f7a]/60 bg-[#ff8f7a]/15", badge: "✕ Wrong event" },
  unknown_ticket: { tone: "border-[#ff8f7a]/40 bg-[#ff8f7a]/10", badge: "Unknown" },
  cancelled: { tone: "border-amber-300/50 bg-amber-300/10", badge: "Cancelled" },
  unknown_member: { tone: "border-[#ff8f7a]/40 bg-[#ff8f7a]/10", badge: "Unknown" },
  wrong_station: { tone: "border-[#ff8f7a]/40 bg-[#ff8f7a]/10", badge: "Error" },
};

/**
 * Scanning at an event: pick where you are (the entry, or a station such as Lunch), then
 * scan member cards with the camera or type a member number.
 */
export function CheckInScanner({ eventId, stations }: { eventId: string; stations: { id: string; name: string }[] }) {
  // "" is the entry.
  const [stationId, setStationId] = useState("");
  const station = stations.find((s) => s.id === stationId);
  // Read by the scan loop, so switching station doesn't restart the camera.
  const stationRef = useRef(station);
  useEffect(() => {
    stationRef.current = station;
  }, [station]);
  const [state, dispatch, pending] = useActionState(checkInMember, { status: "idle" } as CheckInState);
  const video = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const last = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  const submit = useCallback(
    (code: string) => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("code", code);
      const current = stationRef.current;
      if (current) {
        fd.set("stationId", current.id);
        fd.set("stationName", current.name);
      }
      startTransition(() => dispatch(fd));
    },
    [eventId, dispatch],
  );

  useEffect(() => {
    if (!scanning) return;
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (stopped || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        const read = await makeReader();
        const tick = async () => {
          if (stopped || !video.current) return;
          try {
            const code = video.current.readyState >= 2 ? await read(video.current) : null;
            // The same card in front of the camera counts once every few seconds.
            if (code && (code !== last.current.code || Date.now() - last.current.at > 4000)) {
              last.current = { code, at: Date.now() };
              navigator.vibrate?.(60);
              submit(code);
            }
          } catch {}
          timer = setTimeout(tick, 250);
        };
        tick();
      } catch {
        setCameraError("Couldn’t open the camera. Allow camera access for this site, or type member numbers below.");
        setScanning(false);
      }
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [scanning, submit]);

  const memberWarning = state.person && state.person.memberStatus !== "approved" ? `Membership: ${state.person.memberStatus}` : null;

  const look = state.outcome ? outcomeLook[state.outcome] : null;

  return (
    <div className="grid gap-5">
      <div role="radiogroup" aria-label="Where you’re scanning" className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[0.85rem] text-muted">Scanning at</span>
        {[{ id: "", name: "Entry" }, ...stations].map((s) => (
          <button
            key={s.id || "entry"}
            type="button"
            role="radio"
            aria-checked={stationId === s.id}
            onClick={() => {
              setStationId(s.id);
              last.current = { code: "", at: 0 };
            }}
            className="h-10 rounded-full border border-glass-border px-5 text-[0.92rem] text-body transition-colors hover:border-flare/50 aria-checked:border-flare aria-checked:bg-lava aria-checked:text-white"
          >
            {s.name}
          </button>
        ))}
      </div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="grid gap-3">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[16px] border border-glass-border bg-black">
          <video ref={video} playsInline muted className={cn("size-full object-cover", !scanning && "hidden")} />
          {scanning ? (
            <div aria-hidden className="pointer-events-none absolute inset-[18%] rounded-[18px] border-2 border-flare/80 shadow-[0_0_0_100vmax_rgb(0_0_0/0.35)]" />
          ) : (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <button type="button" onClick={() => (setCameraError(null), setScanning(true))} className="btn-pill btn-primary">
                Start camera
              </button>
            </div>
          )}
        </div>
        {scanning && (
          <button type="button" onClick={() => setScanning(false)} className="justify-self-start text-[0.88rem] text-muted hover:text-fg">
            Stop camera
          </button>
        )}
        {cameraError && <p className="text-[0.88rem] text-[#ffb4a6]">{cameraError}</p>}

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem("code") as HTMLInputElement;
            if (input.value.trim()) submit(input.value.trim());
            input.value = "";
          }}
        >
          <input name="code" placeholder="Ticket JT-… or member number JKT-…" aria-label="Ticket or member number" autoComplete="off" className={cn(inputClass, "h-11 flex-1 uppercase placeholder:normal-case")} />
          <button type="submit" disabled={pending} className="btn-pill btn-ghost h-11 px-5 text-[0.8rem] disabled:opacity-60">
            {station ? "Mark" : "Check in"}
          </button>
        </form>
      </div>

      <div aria-live="polite" className="grid content-start">
        {state.status === "idle" ? (
          <p className="rounded-[16px] border border-dashed border-glass-border p-6 text-center text-[0.92rem] text-muted">Results appear here.</p>
        ) : state.status === "error" ? (
          <p key={state.seq} className="rounded-[16px] border border-[#ff8f7a]/40 bg-[#ff8f7a]/10 p-5 text-[#ffb4a6]">
            {state.message}
          </p>
        ) : (
          <div key={state.seq} className={cn("rounded-[16px] border-2 p-5", look?.tone)}>
            {look && <p className="mb-4 font-heading text-[1.6rem] leading-none text-fg">{look.badge}</p>}
            {state.person && (
              <div className="flex items-center gap-4">
                <Avatar name={state.person.name} url={state.person.photoUrl} className="size-16 text-[2.2rem]" />
                <div>
                  <p className="text-[1.1rem] font-medium text-fg">{state.person.name}</p>
                  <p className="text-[0.88rem] text-muted tabular-nums">{state.person.memberNo ?? "Not a member"}</p>
                </div>
              </div>
            )}
            <p className="mt-4 text-[1.05rem] text-fg">{state.message}</p>
            {state.alsoCheckedIn && <p className="mt-1 text-[0.88rem] text-sky-200">They hadn’t been scanned at the entry, so they’re checked in now too.</p>}
            {memberWarning && <p className="mt-1 text-[0.88rem] text-amber-200">{memberWarning}</p>}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
