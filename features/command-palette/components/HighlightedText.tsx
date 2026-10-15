type HighlightedTextProps = {
  text: string;
  /** Ascending positions of the characters to highlight (from fuzzyMatch). */
  indices: number[];
};

/** Renders `text` with the characters at `indices` in the accent color. */
export default function HighlightedText({ text, indices }: HighlightedTextProps) {
  if (indices.length === 0) return <>{text}</>;

  const matched = new Set(indices);
  const segments: { text: string; match: boolean }[] = [];
  for (let i = 0; i < text.length; i++) {
    const match = matched.has(i);
    const last = segments[segments.length - 1];
    if (last && last.match === match) last.text += text[i];
    else segments.push({ text: text[i], match });
  }

  return (
    <>
      {segments.map((segment, index) =>
        segment.match ? (
          <span key={index} className="font-semibold text-accent">
            {segment.text}
          </span>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}
