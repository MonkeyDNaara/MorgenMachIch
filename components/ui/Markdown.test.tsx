// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import Markdown from "@/components/ui/Markdown";

afterEach(cleanup);

const ALLOWED = new Set(["DIV", "P", "UL", "OL", "LI", "STRONG", "EM", "CODE", "PRE"]);

/** Every element and attribute the output contains. */
function inspect(container: HTMLElement) {
  const elements = Array.from(container.querySelectorAll("*"));
  return {
    tags: new Set(elements.map((element) => element.tagName)),
    attributes: elements.flatMap((element) => element.getAttributeNames()),
  };
}

describe("Markdown (#466)", () => {
  it("renders paragraphs, lists, bold, italic and code", () => {
    const { container } = render(
      <Markdown
        text={"Intro with **bold**, *italic* and `code`.\n\n- one\n- two\n\n1. first\n2. second"}
      />,
    );
    expect(container.querySelectorAll("p")).toHaveLength(1);
    expect(container.querySelector("strong")?.textContent).toBe("bold");
    expect(container.querySelector("em")?.textContent).toBe("italic");
    expect(container.querySelector("p code")?.textContent).toBe("code");
    expect(Array.from(container.querySelectorAll("ul > li")).map((li) => li.textContent)).toEqual([
      "one",
      "two",
    ]);
    expect(container.querySelectorAll("ol > li")).toHaveLength(2);
  });

  it("renders <script> and other HTML as text, never as elements", () => {
    const hostile =
      '<script>window.hacked = 1</script><img src=x onerror="window.hacked = 2"><a href="javascript:alert(1)" onclick="x()">link</a><iframe src="//evil"></iframe><svg onload=x>';
    const { container } = render(<Markdown text={hostile} />);
    expect(container.querySelector("script, img, a, iframe, svg")).toBeNull();
    expect(container.textContent).toBe(hostile);
    expect((window as unknown as { hacked?: number }).hacked).toBeUndefined();
  });

  it("never produces an event handler or any attribute from the text", () => {
    const text = [
      '<div onclick="x()">a</div>',
      "**<b onmouseover=x>bold</b>**",
      "- <li onclick=y>item</li>",
      "```\n<button onclick=z>code</button>\n```",
      "[click](javascript:alert(1)) ![img](x.png)",
      "`<span style=x>`",
    ].join("\n\n");
    const { container } = render(<Markdown text={text} />);
    const { tags, attributes } = inspect(container);
    for (const tag of tags) expect(ALLOWED.has(tag), tag).toBe(true);
    for (const attribute of attributes) {
      expect(attribute, attribute).toMatch(/^(class|tabindex|start)$/);
    }
    expect(container.innerHTML).not.toMatch(/<(a|img|button|b|span)[\s>]/);
  });

  it("shows links as plain text", () => {
    const { container } = render(<Markdown text="Read [the docs](https://example.com) now" />);
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).toBe("Read [the docs](https://example.com) now");
  });

  it("renders nested lists", () => {
    const { container } = render(<Markdown text={"- a\n  - a1\n  - a2\n- b"} />);
    const outer = container.querySelector("ul")!;
    expect(outer.children).toHaveLength(2);
    expect(outer.querySelectorAll("ul")).toHaveLength(1);
    expect(Array.from(outer.querySelectorAll("li ul > li")).map((li) => li.textContent)).toEqual([
      "a1",
      "a2",
    ]);
  });

  it("renders an unclosed code fence as a code block to the end of the text", () => {
    const { container } = render(<Markdown text={"Before\n\n```js\nconst a = 1;\nconst b = 2;"} />);
    expect(container.querySelector("pre code")?.textContent).toBe("const a = 1;\nconst b = 2;");
  });

  it("keeps a long code line whole and scrollable inside its own box", () => {
    const long = "const value = " + "x".repeat(5000) + ";";
    const { container } = render(<Markdown text={"```\n" + long + "\n```"} />);
    const pre = container.querySelector("pre")!;
    expect(pre.textContent).toBe(long);
    expect(pre.className).toContain("overflow-x-auto");
    expect(pre.className).toContain("max-w-full");
  });

  it("starts an ordered list at its own number", () => {
    const { container } = render(<Markdown text={"4. four\n5. five"} />);
    expect(container.querySelector("ol")?.getAttribute("start")).toBe("4");
  });

  it("renders nothing for empty text", () => {
    const { container } = render(<Markdown text="" />);
    expect(container.querySelectorAll("p, ul, ol, pre")).toHaveLength(0);
  });
});
