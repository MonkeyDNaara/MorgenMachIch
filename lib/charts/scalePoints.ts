/**
 * Chart math for the hand-built SVG charts (#422). Pure and framework-free:
 * values in, coordinates out. y grows downwards like in SVG, so the largest
 * value sits at the top (y = 0).
 */

export type ChartPoint = { x: number; y: number };

export type ChartRange = { min: number; max: number };

export type RangeOptions = {
  /** Fixed bottom of the range instead of the smallest value. */
  min?: number;
  /** Fixed top of the range instead of the largest value. */
  max?: number;
};

/** The value range to draw: the data's min/max unless overridden; null for no data. */
export function chartRange(
  values: readonly (number | null)[],
  options: RangeOptions = {},
): ChartRange | null {
  const numbers = values.filter((value): value is number => value !== null);
  if (numbers.length === 0 && (options.min === undefined || options.max === undefined)) {
    return null;
  }
  return {
    min: options.min ?? Math.min(...numbers),
    max: options.max ?? Math.max(...numbers),
  };
}

/** y for one value; a flat range draws in the middle, values outside it are clamped. */
export function scaleY(value: number, range: ChartRange, height: number): number {
  if (range.max === range.min) return height / 2;
  const ratio = (value - range.min) / (range.max - range.min);
  return height - Math.min(1, Math.max(0, ratio)) * height;
}

/**
 * One point per value, index-aligned (`null` stays `null` so it can break
 * the line). Values are spread evenly from x = 0 to x = width; a single
 * value sits in the middle.
 */
export function scalePoints(
  values: readonly (number | null)[],
  width: number,
  height: number,
  options: RangeOptions = {},
): (ChartPoint | null)[] {
  const range = chartRange(values, options);
  if (!range) return values.map(() => null);
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  return values.map((value, index) =>
    value === null
      ? null
      : {
          x: values.length > 1 ? index * step : width / 2,
          y: scaleY(value, range, height),
        },
  );
}

/** Splits points into runs without gaps; each run becomes one path. */
export function lineSegments(points: readonly (ChartPoint | null)[]): ChartPoint[][] {
  const segments: ChartPoint[][] = [];
  let current: ChartPoint[] = [];
  for (const point of points) {
    if (point) {
      current.push(point);
    } else if (current.length > 0) {
      segments.push(current);
      current = [];
    }
  }
  if (current.length > 0) segments.push(current);
  return segments;
}

/** SVG path data for one segment; a lone point becomes a zero-length line (a round cap dot). */
export function segmentPath(segment: readonly ChartPoint[]): string {
  const round = (n: number) => Math.round(n * 100) / 100;
  const [first, ...rest] = segment;
  if (!first) return "";
  const start = `M${round(first.x)} ${round(first.y)}`;
  if (rest.length === 0) return `${start}h0`;
  return `${start}${rest.map((point) => `L${round(point.x)} ${round(point.y)}`).join("")}`;
}
