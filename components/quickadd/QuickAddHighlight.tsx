import type { Ref } from "react";
import type { Label } from "@/lib/types";
import type { QuickAddToken } from "@/lib/utils/parseQuickAdd";
import { tokenColor } from "@/components/quickadd/tokenDisplay";

type QuickAddHighlightProps = {
  text: string;
  tokens: QuickAddToken[];
  labels: Label[];
  /** Shown in the muted color while `text` is empty. */
  placeholder?: string;
  /** Text index where an empty marker element is rendered, used to place
   * the label autocomplete right under the "#" being typed. */
  anchorIndex?: number | null;
  anchorRef?: Ref<HTMLSpanElement>;
};

/**
 * The visible text of a quick-add field, with matched tokens drawn in
 * their color (#203). It sits exactly on top of a real <input> whose own
 * text is transparent: the input keeps the caret, selection, typing and
 * accessibility, while this layer only paints the letters. Because the
 * letters you see are drawn here and not by the input, the colors can never
 * drift out of line with them.
 *
 * Tokens are colored only — never bolder or larger — because any change in
 * glyph width would move the text away from the caret.
 */
export default function QuickAddHighlight({
  text,
  tokens,
  labels,
  placeholder,
  anchorIndex = null,
  anchorRef,
}: QuickAddHighlightProps) {
  if (!text) return <span className="text-base-content/40">{placeholder}</span>;

  // Split points: every token edge plus the anchor, so the anchor can sit
  // inside plain text or right before a token.
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let anchorPlaced = false;
  const pushPlain = (until: number) => {
    if (!anchorPlaced && anchorIndex !== null && anchorIndex >= cursor && anchorIndex <= until) {
      anchorPlaced = true;
      parts.push(text.slice(cursor, anchorIndex));
      parts.push(<span key="anchor" ref={anchorRef} />);
      parts.push(text.slice(anchorIndex, until));
    } else {
      parts.push(text.slice(cursor, until));
    }
    cursor = until;
  };

  for (const token of tokens) {
    pushPlain(token.start);
    parts.push(
      <span key={token.id} style={{ color: tokenColor(token, labels) }}>
        {text.slice(token.start, token.end)}
      </span>,
    );
    cursor = token.end;
  }
  pushPlain(text.length);

  // The trailing space keeps the layer as wide as the input's text when it
  // ends in whitespace, so horizontal scrolling stays in sync.
  return <>{parts} </>;
}
