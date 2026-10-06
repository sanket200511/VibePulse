import React, { useCallback, useRef, useState } from "react";
import { useTimeMachine } from "./TimeMachineContext";

export function TimelineScrubber() {
  const { mode, selectedTime, setSelectedTime, minTime, maxTime, rawEntries } = useTimeMachine();
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // If we are in LIVE mode, the scrubber is disabled
  const disabled = mode === "LIVE";

  const span = maxTime - minTime;
  const clampedSelected =
    selectedTime !== null ? Math.max(minTime, Math.min(maxTime, selectedTime)) : maxTime;
  const cursorPct = span > 0 ? ((clampedSelected - minTime) / span) * 100 : 100;

  const handleInteract = useCallback(
    (clientX: number) => {
      if (disabled || !trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const pct = x / rect.width;
      setSelectedTime(minTime + pct * span);
    },
    [disabled, minTime, span, setSelectedTime],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    setIsDragging(true);
    handleInteract(e.clientX);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    handleInteract(e.clientX);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const step = span * 0.01; // 1%
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSelectedTime(Math.max(minTime, clampedSelected - step));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setSelectedTime(Math.min(maxTime, clampedSelected + step));
    } else if (e.key === "Home") {
      e.preventDefault();
      setSelectedTime(minTime);
    } else if (e.key === "End") {
      e.preventDefault();
      setSelectedTime(maxTime);
    }
  };

  const milestones = rawEntries.filter(
    (e) => e.kind === "SESSION_START" || e.kind === "SECURITY_FINDING" || e.kind === "SESSION_END",
  );

  return (
    <div
      data-tour="time-machine-scrubber"
      className={`w-full py-3 ${disabled ? "pointer-events-none opacity-40" : ""}`}
    >
      <div className="text-muted-foreground mb-2 flex items-center justify-between font-mono text-[11px] font-medium tabular-nums">
        <span>{new Date(minTime).toLocaleDateString()}</span>
        <span className="text-foreground border-border/70 bg-secondary/40 rounded-md border px-2 py-0.5 font-semibold">
          {new Date(clampedSelected).toLocaleString()}
        </span>
        <span>{new Date(maxTime).toLocaleDateString()}</span>
      </div>

      <div
        ref={trackRef}
        className="group relative flex h-5 cursor-pointer items-center"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={onKeyDown}
        role="slider"
        aria-valuemin={minTime}
        aria-valuemax={maxTime}
        aria-valuenow={clampedSelected}
        aria-label="Engineering Time Machine Scrubber"
      >
        {/* Baseline Track */}
        <div className="bg-muted/60 border-border/60 absolute left-0 right-0 h-1.5 overflow-hidden rounded-sm border">
          {/* Active Fill */}
          <div
            className="bg-primary/50 absolute bottom-0 left-0 top-0 transition-none"
            style={{ width: `${cursorPct}%` }}
          />
        </div>

        {/* Milestones */}
        {milestones.map((m) => {
          const mTime = new Date(m.timestamp).getTime();
          const mPct = span > 0 ? ((mTime - minTime) / span) * 100 : 0;
          const isPast = mTime <= clampedSelected;

          let color = "bg-muted-foreground";
          if (m.kind === "SECURITY_FINDING") color = "bg-rose-500";
          else if (m.kind === "SESSION_START") color = "bg-primary";

          return (
            <div
              key={m.id}
              className={`rounded-xs absolute top-1/2 h-2.5 w-1 -translate-x-1/2 -translate-y-1/2 ${color} ${isPast ? "opacity-100" : "opacity-30"} transition-opacity`}
              style={{ left: `${mPct}%` }}
              title={m.title}
            />
          );
        })}

        {/* Cursor / Handle */}
        <div
          className="bg-background border-primary group-focus-visible:ring-primary/40 rounded-xs shadow-xs absolute top-1/2 flex h-4 w-2.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center border-2 transition-none focus:outline-none group-focus-visible:ring-2 motion-reduce:transition-none"
          style={{ left: `${cursorPct}%` }}
        >
          <div className="bg-primary rounded-xs h-1.5 w-0.5" />
        </div>
      </div>

      {!disabled && (
        <div className="text-muted-foreground mt-1.5 text-center font-mono text-[10px] font-semibold uppercase tracking-wider">
          Historical Reconstruction Active
        </div>
      )}
    </div>
  );
}
