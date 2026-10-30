export type SafeJobEvent = Readonly<{
  seq: number;
  jobId: string;
  transition: string;
  code: string;
  occurredAt: number;
}>;
/** Pure wire contract. A future authenticated owner-only route may call this after identity verification. */
export function parseLastEventId(value: string | undefined): number {
  if (value === undefined || value === "") return 0;
  if (!/^(0|[1-9]\d{0,14})$/.test(value)) throw new Error("Invalid Last-Event-ID");
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error("Last-Event-ID overflow");
  return parsed;
}
export function encodeEventReplay(events: readonly SafeJobEvent[]): string {
  return events
    .map((event) => {
      if (
        !Number.isSafeInteger(event.seq) ||
        event.seq < 1 ||
        !/^[A-Z_]+$/.test(event.transition) ||
        !/^[A-Z_]+$/.test(event.code) ||
        !/^[\w:-]{1,120}$/.test(event.jobId)
      )
        throw new Error("Unsafe event wire field");
      return "id: " + event.seq + "\nevent: job\ndata: " + JSON.stringify(event) + "\n\n";
    })
    .join("");
}
