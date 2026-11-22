import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdown, type Inline, type MarkdownBlock } from "./parseMarkdown";

const text = (value: string): Inline => ({ type: "text", text: value });
const code = (value: string): Inline => ({ type: "code", text: value });
const strong = (...children: Inline[]): Inline => ({ type: "strong", children });
const em = (...children: Inline[]): Inline => ({ type: "em", children });

describe("parseInline (#466)", () => {
  it("reads bold, italic and inline code", () => {
    expect(parseInline("a **b** c *d* e `f`")).toEqual([
      text("a "),
      strong(text("b")),
      text(" c "),
      em(text("d")),
      text(" e "),
      code("f"),
    ]);
    expect(parseInline("__b__ and _i_")).toEqual([strong(text("b")), text(" and "), em(text("i"))]);
  });

  it("nests bold and italic", () => {
    expect(parseInline("**a *b* c**")).toEqual([strong(text("a "), em(text("b")), text(" c"))]);
    expect(parseInline("*a **b** c*")).toEqual([em(text("a "), strong(text("b")), text(" c"))]);
  });

  it("keeps delimiters inside code spans literal", () => {
    expect(parseInline("`a **b** *c*`")).toEqual([code("a **b** *c*")]);
    expect(parseInline("*a `*` b*")).toEqual([em(text("a "), code("*"), text(" b"))]);
    expect(parseInline("`` a ` b ``")).toEqual([code("a ` b")]);
  });

  it("leaves unmatched delimiters and backticks as text", () => {
    expect(parseInline("2 * 3 = 6")).toEqual([text("2 * 3 = 6")]);
    expect(parseInline("**open")).toEqual([text("**open")]);
    expect(parseInline("a `open")).toEqual([text("a `open")]);
    expect(parseInline("snake_case_name")).toEqual([text("snake_case_name")]);
  });

  it("honours backslash escapes", () => {
    expect(parseInline("\\*not italic\\*")).toEqual([text("*not italic*")]);
  });

  it("never turns HTML, links or images into anything but text", () => {
    const html = '<script>alert(1)</script><img src=x onerror="alert(1)">';
    expect(parseInline(html)).toEqual([text(html)]);
    expect(parseInline("[x](javascript:alert(1)) ![y](http://z)")).toEqual([
      text("[x](javascript:alert(1)) ![y](http://z)"),
    ]);
  });

  it("stops nesting after a few levels instead of recursing without end", () => {
    const deep = "*".repeat(3000) + "x" + "*".repeat(3000);
    expect(() => parseInline(deep)).not.toThrow();
  });

  it("stays fast on many unmatched delimiters", () => {
    const start = performance.now();
    parseInline("* ".repeat(20_000) + "_a ".repeat(20_000) + "**x ".repeat(20_000));
    expect(performance.now() - start).toBeLessThan(1000);
  });
});

describe("parseMarkdown (#466)", () => {
  it("splits paragraphs on blank lines and keeps single line breaks", () => {
    expect(parseMarkdown("one\ntwo\n\n\nthree")).toEqual([
      { type: "paragraph", children: [text("one\ntwo")] },
      { type: "paragraph", children: [text("three")] },
    ]);
  });

  it("returns no blocks for empty text", () => {
    expect(parseMarkdown("")).toEqual([]);
    expect(parseMarkdown("  \n\n ")).toEqual([]);
  });

  it("reads bullet and numbered lists", () => {
    expect(parseMarkdown("- a\n* b\n+ **c**")).toEqual([
      {
        type: "list",
        ordered: false,
        items: [
          { children: [text("a")], lists: [] },
          { children: [text("b")], lists: [] },
          { children: [strong(text("c"))], lists: [] },
        ],
      },
    ]);
    expect(parseMarkdown("3. a\n4) b")).toEqual([
      {
        type: "list",
        ordered: true,
        start: 3,
        items: [
          { children: [text("a")], lists: [] },
          { children: [text("b")], lists: [] },
        ],
      },
    ]);
  });

  it("nests lists by indentation", () => {
    const [list] = parseMarkdown("- a\n  - a1\n  - a2\n    1. deep\n- b");
    expect(list).toMatchObject({ type: "list", ordered: false });
    const items = (list as Extract<MarkdownBlock, { type: "list" }>).items;
    expect(items).toHaveLength(2);
    expect(items[0].children).toEqual([text("a")]);
    expect(items[0].lists).toHaveLength(1);
    expect(items[0].lists[0].items.map((item) => item.children)).toEqual([
      [text("a1")],
      [text("a2")],
    ]);
    expect(items[0].lists[0].items[1].lists[0]).toMatchObject({ ordered: true });
    expect(items[1].children).toEqual([text("b")]);
  });

  it("lets a list interrupt a paragraph and ends it at the next paragraph", () => {
    const blocks = parseMarkdown("Intro:\n- a\n- b\n\nOutro");
    expect(blocks.map((block) => block.type)).toEqual(["paragraph", "list", "paragraph"]);
  });

  it("keeps one list across a blank line between items", () => {
    const blocks = parseMarkdown("- a\n\n- b");
    expect(blocks).toHaveLength(1);
    expect((blocks[0] as Extract<MarkdownBlock, { type: "list" }>).items).toHaveLength(2);
  });

  it("joins an indented continuation line to its item", () => {
    const [list] = parseMarkdown("- first\n  second line\n- next") as Extract<
      MarkdownBlock,
      { type: "list" }
    >[];
    expect(list.items[0].children).toEqual([text("first\nsecond line")]);
  });

  it("keeps a list nested only as deep as the cap", () => {
    const source = Array.from(
      { length: 40 },
      (_, level) => `${"  ".repeat(level)}- item ${level}`,
    ).join("\n");
    let depth = 0;
    let lists = parseMarkdown(source).filter((block) => block.type === "list") as Extract<
      MarkdownBlock,
      { type: "list" }
    >[];
    while (lists.length > 0) {
      depth++;
      lists = lists.flatMap((list) => list.items.flatMap((item) => item.lists));
    }
    expect(depth).toBeLessThanOrEqual(6);
  });

  it("reads fenced code blocks verbatim", () => {
    const source = "before\n```ts\nconst a = **1**;\n  <b>x</b>\n```\nafter";
    expect(parseMarkdown(source)).toEqual([
      { type: "paragraph", children: [text("before")] },
      { type: "code", text: "const a = **1**;\n  <b>x</b>" },
      { type: "paragraph", children: [text("after")] },
    ]);
  });

  it("runs an unclosed fence to the end of the text", () => {
    expect(parseMarkdown("```\nline 1\n- not a list")).toEqual([
      { type: "code", text: "line 1\n- not a list" },
    ]);
  });

  it("keeps a very long code line in one piece", () => {
    const long = "x".repeat(50_000);
    expect(parseMarkdown("```\n" + long + "\n```")).toEqual([{ type: "code", text: long }]);
  });

  it("treats headings, quotes, tables and HTML blocks as paragraphs of text", () => {
    const blocks = parseMarkdown("# Title\n\n> quote\n\n| a | b |\n\n<div onclick=x>hi</div>");
    expect(blocks.map((block) => block.type)).toEqual([
      "paragraph",
      "paragraph",
      "paragraph",
      "paragraph",
    ]);
    expect(blocks[0]).toEqual({ type: "paragraph", children: [text("# Title")] });
    expect(blocks[3]).toEqual({ type: "paragraph", children: [text("<div onclick=x>hi</div>")] });
  });

  it("accepts Windows line endings and tabs", () => {
    expect(parseMarkdown("- a\r\n\t- b")).toHaveLength(1);
  });
});
