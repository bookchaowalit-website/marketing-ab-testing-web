import { useId, type CSSProperties, type ReactNode } from "react";

/** One grid gap (a quarter of the scale), rounded up to two significant digits: 25 → 25, 12.5 → 13, 0.75 → 0.75. */
function axisStep(max: number): { step: number; decimals: number } {
  const raw = max > 0 ? max / 4 : 0.25;
  const exponent = Math.floor(Math.log10(raw)) - 1;
  const decimals = Math.min(Math.max(-exponent, 0), 20);
  // The small epsilon keeps float noise (50.000000000000004) from bumping a round gap up a step.
  const step = Number((Math.ceil(raw / 10 ** exponent - 1e-9) * 10 ** exponent).toFixed(decimals));
  return { step, decimals };
}

/** The top of the scale: four round grid gaps that reach at least `max` (1 when `max` is not above 0). */
export function chartTop(max: number): number {
  const { step, decimals } = axisStep(max);
  return Number((step * 4).toFixed(decimals));
}

/** The five y-axis labels (0 to the top); each is the exact value of its grid line, because the line uses the same top. */
export function axisSteps(max: number): number[] {
  const { step, decimals } = axisStep(max);
  return [0, 1, 2, 3, 4].map((index) => Number((step * index).toFixed(decimals)));
}

/** Where value `index` of `count` sits on a 0–1 axis: spread edge to edge, or with `buckets` at the centre of its bucket. */
export function pointAt(index: number, count: number, buckets = false): number {
  return buckets ? (index + 0.5) / Math.max(count, 1) : index / Math.max(count - 1, 1);
}

/** Where tick `tick` sits: under value `tick`, or with `buckets` on bucket edge `tick` (0 = start, `count` = end). */
export function tickAt(tick: number, count: number, buckets = false): number {
  return buckets ? tick / Math.max(count, 1) : pointAt(tick, count);
}

/** Polyline points on a 1000 x 100 board, 0 at the bottom and `chartTop(max)` at the top. */
export function linePoints(values: number[], max: number, buckets = false): string {
  const top = chartTop(max);
  return values.map((value, index) => `${pointAt(index, values.length, buckets) * 1000},${100 - (Math.min(Math.max(value, 0), top) / top) * 100}`).join(" ");
}

/**
 * The share of the axis each x label may take, from the real gaps to the labels beside it: a start label grows right
 * and an end label left, into half the gap each; an inner label is centred, so it gets the smaller gap (and stays
 * inside the axis). While some label has less than `minRoom`, the inner label at (or next to) the tightest spot is
 * dropped; the first and last labels the caller passed are always kept, even when neither sits on an axis edge. Returns the kept positions' indexes with their room.
 */
export function labelRoom(positions: number[], minRoom: number): { index: number; room: number }[] {
  let kept = positions.map((at, index) => ({ index, at }));
  for (;;) {
    // Room left by the neighbours alone; dropping a label can widen it, so it decides what gets dropped.
    const gapRooms = kept.map(({ at }, i) => {
      const left = i > 0 ? at - kept[i - 1].at : Infinity;
      const right = i < kept.length - 1 ? kept[i + 1].at - at : Infinity;
      if (at === 0) return Math.min(right / 2, 1);
      if (at === 1) return Math.min(left / 2, 1);
      return Math.min(left, right, 1);
    });
    // A centred label also has to stay inside the axis, which no drop can change.
    const rooms = kept.map(({ at }, i) => (at === 0 || at === 1 ? gapRooms[i] : Math.min(gapRooms[i], 2 * at, 2 * (1 - at))));
    // Only labels between the first and the last are ever dropped.
    const inner = (i: number) => i > 0 && i < kept.length - 1;
    let tightest = -1;
    gapRooms.forEach((room, i) => { if (room < minRoom - 1e-9 && (tightest < 0 || room < gapRooms[tightest])) tightest = i; });
    const drop = tightest < 0 ? -1 : inner(tightest) ? tightest : inner(tightest + 1) ? tightest + 1 : inner(tightest - 1) ? tightest - 1 : -1;
    if (drop < 0) return kept.map(({ index }, i) => ({ index, room: rooms[i] }));
    kept = kept.filter((_, i) => i !== drop);
  }
}

/** Least room for a label (share of the axis) on wide screens and on phones, where the axis is about 250px. */
const MIN_ROOM = 0.1;
const MIN_ROOM_PHONE = 0.2;
const percent = (share: number) => `${Number((share * 100).toFixed(2))}%`;

type ChartProps = {
  title: string;
  subtitle?: ReactNode;
  /** What the chart shows, read out instead of the drawing. */
  summary: string;
  values: number[];
  /** Label for each value, used by the table and the x axis. */
  labels: string[];
  /** Indexes of the labels shown under the chart (bucket edges, 0 to `values.length`, when `buckets` is set). */
  ticks: number[];
  /** Shorter text for each tick when the table labels are too long for the axis (same order as `ticks`). */
  tickLabels?: string[];
  max: number;
  unit: string;
  /** Column heading for the labels in the table view. */
  labelHeading: string;
  /** Short unit printed above the y axis and after the peak value ("kWh", "clicks"); leave it out when the scale has no unit. */
  yUnit?: string;
  /**
   * Each value counts one time bucket of equal length (clicks per 2 hours): points sit at bucket centres and `ticks`
   * are bucket edges, so pass `tickLabels` ("−7d", "now").
   */
  buckets?: boolean;
};

/**
 * One line chart with a "Show table" disclosure, so every value can be read without the drawing.
 * The disclosure is a native <details> in the head, so the table opens without JavaScript and the switch sits in the
 * head's flex row at its own size; CSS (:has) shows the table and hides the chart while it is open.
 */
export function ChartPanel({ title, subtitle, summary, values, labels, ticks, tickLabels, max, unit, labelHeading, yUnit, buckets = false }: ChartProps) {
  const headingId = useId();
  const points = linePoints(values, max, buckets);
  const dotY = points.split(",")[1];
  const x = (index: number) => pointAt(index, values.length, buckets) * 1000;
  const peak = values.length ? values.indexOf(Math.max(...values)) : -1;
  // Same top as linePoints, so each label is the value of its grid line.
  const steps = axisSteps(max);
  // One label per position (a one-value series given ticks [0, 0] would stack two), in axis order, each with the room its
  // neighbours leave on wide screens and on phones; labels that would still collide are left out.
  const unique = ticks.map((tick, position) => ({ tick, at: tickAt(tick, values.length, buckets), text: tickLabels?.[position] ?? labels[tick] }))
    .filter(({ tick }, index, all) => all.findIndex((other) => other.tick === tick) === index)
    .sort((a, b) => a.at - b.at);
  const wide = labelRoom(unique.map(({ at }) => at), MIN_ROOM).map(({ index, room }) => ({ ...unique[index], room }));
  const phone = new Map(labelRoom(wide.map(({ at }) => at), MIN_ROOM_PHONE).map(({ index, room }) => [index, room]));
  // The peak is named above the plot, over its dashed line, so the line is never the only sign of it.
  // Shifted left by the same share of its own width, so it sits over the peak and never past either edge of the plot.
  const peakAt = peak >= 0 ? percent(pointAt(peak, values.length, buckets)) : "0%";
  return (
    <section className="ds-panel ds-chart-panel" aria-labelledby={headingId}>
      <div className="ds-panel-head">
        <div>
          <h2 id={headingId}>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <details className="ds-chart-switch">
          {/* The summary says what it will show next; the hidden half is display:none, so it is not in the name. */}
          <summary className="ds-plain"><span className="ds-show-table">Show table</span><span className="ds-show-chart">Show chart</span></summary>
        </details>
      </div>
      <div className="ds-table-wrap" tabIndex={0} role="region" aria-label={`${title} as a table`}>
        <table className="ds-table">
          <thead><tr><th scope="col">{labelHeading}</th><th scope="col">{unit}</th></tr></thead>
          <tbody>
            {values.map((value, index) => (
              <tr key={index} data-peak={index === peak ? "true" : undefined}>
                <th scope="row">{labels[index]}</th>
                <td>{value}{index === peak ? " (peak)" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ds-chart">
        {yUnit ? <div className="ds-chart-unit" aria-hidden="true">{yUnit}</div> : null}
        <div className="ds-chart-peak-row" aria-hidden="true">
          {peak >= 0 ? <span style={{ marginLeft: peakAt, transform: `translateX(-${peakAt})` }}>Peak {values[peak]}{yUnit ? ` ${yUnit}` : ""} · {labels[peak]}</span> : null}
        </div>
        <div className="ds-chart-y" aria-hidden="true">{steps.map((step, index) => <span key={index}>{step}</span>)}</div>
        <svg viewBox="0 0 1000 100" preserveAspectRatio="none" role="img" aria-label={summary}>
          {/* One value has no line to draw or area to fill, so it gets a dot where it is. */}
          {values.length > 1 ? <polygon className="ds-chart-area" points={`${x(0)},100 ${points} ${x(values.length - 1)},100`} /> : null}
          {/* The grid comes after the filled area, so the opaque fill never hides the grid lines under the line. */}
          <g className="ds-chart-grid">{[0, 25, 50, 75, 100].map((y) => <line key={y} x1="0" x2="1000" y1={y} y2={y} />)}</g>
          {peak >= 0 ? <line className="ds-chart-peak" x1={x(peak)} x2={x(peak)} y1="0" y2="100" /> : null}
          {values.length === 1 ? <line className="ds-chart-dot" x1={x(0)} x2={x(0)} y1={dotY} y2={dotY} /> : <polyline className="ds-chart-line" points={points} />}
        </svg>
        <div className="ds-chart-x" aria-hidden="true">
          {wide.map(({ tick, at, text, room }, index) => {
            // Same x scale as linePoints, so each label sits under its own point (or bucket edge).
            const style = { left: `${at * 100}%`, "--ds-tick-room": percent(room), "--ds-tick-room-phone": percent(phone.get(index) ?? 0) } as CSSProperties;
            return <span key={tick} style={style} data-edge={at === 0 ? "start" : at === 1 ? "end" : undefined} data-phone={phone.has(index) ? undefined : "hide"}>{text}</span>;
          })}
        </div>
      </div>
    </section>
  );
}
