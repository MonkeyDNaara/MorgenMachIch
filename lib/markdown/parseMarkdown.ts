/**
 * A deliberately small, safe Markdown parser for LLM text (#466, shared with #427).
 *
 * Supported: paragraphs, bullet and numbered lists (nested by indentation), `**bold**`,
 * `*italic*`, `` `inline code` `` and fenced code blocks. Everything else — raw HTML, links,
 * images, headings, quotes, tables — stays plain text. The result is a plain data tree (no
 * HTML strings), so rendering it as React nodes can never produce an element or an event
 * handler the text didn't ask for.
 *
 * Pure and framework-free. Limits keep hostile input cheap: nesting is capped, and a delimiter
 * that has no closer is only searched for once (see `findCloser`).
 */

export type Inline =
  | { type: "text"; text: string }
  | { type: "code"; text: string }
  | { type: "strong"; children: Inline[] }
  | { type: "em"; children: Inline[] };

export type ListItem = {
  children: Inline[];
  /** Lists nested under this item. */
  lists: ListBlock[];
};

export type ListBlock = {
  type: "list";
  ordered: boolean;
  /** First number of an ordered list; only set when it isn't 1. */
  start?: number;
  items: ListItem[];
};

export type MarkdownBlock =
  { type: "paragraph"; children: Inline[] } | { type: "code"; text: string } | ListBlock;

const MAX_INLINE_DEPTH = 5;
const MAX_LIST_DEPTH = 6;
const MAX_START = 999_999;

const FENCE = /^ {0,3}```/;
const LIST_ITEM = /^( *)([-*+]|\d{1,9}[.)])[ \t]+(.*)$/;

type Delimiter = "*" | "_" | "**" | "__";

const isSpace = (char: string | undefined) => char === undefined || /\s/.test(char);
const isWordChar = (char: string | undefined) => char !== undefined && /[\p{L}\p{N}]/u.test(char);

/** End (exclusive) of the code span that starts at `from`, or -1 when it never closes. */
function codeSpanEnd(text: string, from: number): number {
  let run = 0;
  while (text[from + run] === "`") run++;
  let i = from + run;
  while (i < text.length) {
    if (text[i] !== "`") {
      i++;
      continue;
    }
    let length = 0;
    while (text[i + length] === "`") length++;
    if (length === run) return i + length;
    i += length;
  }
  return -1;
}

/** Per text: the opener position from which a delimiter has no closer (see `findCloser`). */
type NoCloserCache = Map<Delimiter, number>;

/**
 * Index of the closing `delimiter` for an opener that ends at `from`, or -1. A failed search is
 * remembered per text: a later opener can't find a closer where an earlier one didn't, so
 * unmatched delimiters never cause a rescan (no quadratic time on `* * * * …`).
 */
function findCloser(
  text: string,
  from: number,
  delimiter: Delimiter,
  cache: NoCloserCache,
): number {
  const limit = cache.get(delimiter);
  if (limit !== undefined && from >= limit) return -1;
  const char = delimiter[0];
  const length = delimiter.length;
  let i = from;
  while (i < text.length) {
    const current = text[i];
    if (current === "\\") {
      i += 2;
      continue;
    }
    if (current === "`") {
      const end = codeSpanEnd(text, i);
      i = end === -1 ? i + 1 : end;
      continue;
    }
    if (current !== char) {
      i++;
      continue;
    }
    let run = 0;
    while (text[i + run] === char) run++;
    // A single delimiter skips runs of two or more: that is nested bold, not a closer.
    const matches = length === 1 ? run === 1 : run >= 2;
    const closes =
      matches &&
      i > from &&
      !isSpace(text[i - 1]) &&
      (char === "*" || !isWordChar(text[i + length]));
    if (closes) return i;
    i += run;
  }
  cache.set(delimiter, from);
  return -1;
}

function parseInlineAt(text: string, depth: number): Inline[] {
  const nodes: Inline[] = [];
  const cache: NoCloserCache = new Map();
  let buffer = "";
  const flush = () => {
    if (buffer) nodes.push({ type: "text", text: buffer });
    buffer = "";
  };

  let i = 0;
  while (i < text.length) {
    const char = text[i];

    if (char === "\\" && i + 1 < text.length && "\\`*_".includes(text[i + 1])) {
      buffer += text[i + 1];
      i += 2;
      continue;
    }

    if (char === "`") {
      const end = codeSpanEnd(text, i);
      if (end === -1) {
        while (text[i] === "`") buffer += text[i++];
        continue;
      }
      let run = 0;
      while (text[i + run] === "`") run++;
      let code = text.slice(i + run, end - run);
      if (code.length > 1 && code.startsWith(" ") && code.endsWith(" ")) code = code.slice(1, -1);
      flush();
      nodes.push({ type: "code", text: code });
      i = end;
      continue;
    }

    if (char === "*" || char === "_") {
      const double = text[i + 1] === char;
      const delimiter = (double ? char + char : char) as Delimiter;
      const length = delimiter.length;
      const opens =
        depth < MAX_INLINE_DEPTH &&
        !isSpace(text[i + length]) &&
        // `snake_case_name` stays plain text.
        (char === "*" || !isWordChar(text[i - 1]));
      const close = opens ? findCloser(text, i + length, delimiter, cache) : -1;
      if (close !== -1) {
        flush();
        nodes.push({
          type: double ? "strong" : "em",
          children: parseInlineAt(text.slice(i + length, close), depth + 1),
        });
        i = close + length;
        continue;
      }
      buffer += delimiter;
      i += length;
      continue;
    }

    buffer += char;
    i++;
  }
  flush();
  return nodes;
}

/** Inline formatting of one line or paragraph (no block syntax). */
export function parseInline(text: string): Inline[] {
  return parseInlineAt(text, 0);
}

function indentOf(spaces: string): number {
  return spaces.length;
}

/** Parses the list that starts at `lines[start]`; returns it and the index after it. */
function parseList(
  lines: string[],
  start: number,
  inline: (text: string) => Inline[],
  level: number,
): { list: ListBlock; next: number } {
  const first = LIST_ITEM.exec(lines[start])!;
  const base = indentOf(first[1]);
  const ordered = /\d/.test(first[2]);
  const number = ordered ? Math.min(parseInt(first[2], 10), MAX_START) : 1;
  const list: ListBlock = {
    type: "list",
    ordered,
    ...(ordered && number !== 1 ? { start: number } : {}),
    items: [],
  };
  const texts: string[] = [];

  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      // A blank line only continues the list when another item of it follows.
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === "") j++;
      const upcoming = j < lines.length ? LIST_ITEM.exec(lines[j]) : null;
      if (upcoming && indentOf(upcoming[1]) >= base) {
        i = j;
        continue;
      }
      break;
    }
    if (FENCE.test(line)) break;

    const item = LIST_ITEM.exec(line);
    if (item) {
      const indent = indentOf(item[1]);
      if (indent < base) break;
      if (indent === base || level >= MAX_LIST_DEPTH) {
        if (/\d/.test(item[2]) !== ordered && indent === base) break;
        list.items.push({ children: [], lists: [] });
        texts.push(item[3]);
        i++;
        continue;
      }
      // Deeper than this list's items: a nested list under the last item.
      if (list.items.length === 0) break;
      const nested = parseList(lines, i, inline, level + 1);
      list.items[list.items.length - 1].lists.push(nested.list);
      i = nested.next;
      continue;
    }

    // A continuation line, indented under the item's text.
    if (indentOf(/^ */.exec(line)![0]) > base && list.items.length > 0) {
      texts[texts.length - 1] += `\n${line.trim()}`;
      i++;
      continue;
    }
    break;
  }

  list.items.forEach((entry, index) => {
    entry.children = inline(texts[index]);
  });
  return { list, next: i };
}

/** Markdown text → blocks. Never throws; unknown syntax becomes text. */
export function parseMarkdown(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n");
  const inline = parseInline;
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];

  const endParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ type: "paragraph", children: inline(paragraph.join("\n")) });
      paragraph = [];
    }
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (FENCE.test(line)) {
      endParagraph();
      const code: string[] = [];
      i++;
      // An unclosed fence runs to the end of the text.
      while (i < lines.length && !FENCE.test(lines[i])) code.push(lines[i++]);
      i++;
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }

    if (line.trim() === "") {
      endParagraph();
      i++;
      continue;
    }

    if (LIST_ITEM.test(line)) {
      endParagraph();
      const { list, next } = parseList(lines, i, inline, 1);
      blocks.push(list);
      i = next;
      continue;
    }

    paragraph.push(line.trim());
    i++;
  }
  endParagraph();
  return blocks;
}
