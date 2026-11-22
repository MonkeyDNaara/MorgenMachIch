import type { ReactNode } from "react";
import {
  parseMarkdown,
  type Inline,
  type ListBlock,
  type MarkdownBlock,
} from "@/lib/markdown/parseMarkdown";

type MarkdownProps = {
  /** Markdown text, e.g. an LLM answer. Untrusted: it can only produce the elements below. */
  text: string;
  className?: string;
};

function renderInline(nodes: Inline[]): ReactNode[] {
  return nodes.map((node, index) => {
    switch (node.type) {
      case "text":
        return node.text;
      case "code":
        return (
          <code
            key={index}
            className="rounded-field bg-sunken px-1.5 py-0.5 font-mono text-[0.9em] break-words"
          >
            {node.text}
          </code>
        );
      case "strong":
        return <strong key={index}>{renderInline(node.children)}</strong>;
      case "em":
        return <em key={index}>{renderInline(node.children)}</em>;
    }
  });
}

function renderList(list: ListBlock, key: number): ReactNode {
  const Tag = list.ordered ? "ol" : "ul";
  return (
    <Tag
      key={key}
      start={list.start}
      className={`flex flex-col gap-1.5 pl-6 ${list.ordered ? "list-decimal" : "list-disc"}`}
    >
      {list.items.map((item, index) => (
        <li key={index} className="pl-1 break-words whitespace-pre-line">
          {renderInline(item.children)}
          {item.lists.length > 0 && (
            <div className="mt-1.5 flex flex-col gap-1.5">
              {item.lists.map((nested, nestedIndex) => renderList(nested, nestedIndex))}
            </div>
          )}
        </li>
      ))}
    </Tag>
  );
}

function renderBlock(block: MarkdownBlock, index: number): ReactNode {
  switch (block.type) {
    case "paragraph":
      return (
        <p key={index} className="break-words whitespace-pre-line">
          {renderInline(block.children)}
        </p>
      );
    case "code":
      return (
        <pre
          key={index}
          tabIndex={0}
          className="max-w-full overflow-x-auto rounded-field bg-sunken p-3 font-mono text-meta"
        >
          <code>{block.text}</code>
        </pre>
      );
    case "list":
      return renderList(block, index);
  }
}

/**
 * Renders untrusted Markdown (LLM text, #466) as React nodes. The text goes through
 * `parseMarkdown`, which only knows paragraphs, lists, bold, italic and code; everything else —
 * HTML, links, images — arrives here as plain text and React escapes it. There is no
 * `dangerouslySetInnerHTML` and no attribute that comes from the text. Long words break and
 * code blocks scroll sideways inside their own box, so nothing widens the page.
 */
export default function Markdown({ text, className = "" }: MarkdownProps) {
  return (
    <div className={`flex min-w-0 flex-col gap-3 text-body ${className}`}>
      {parseMarkdown(text).map(renderBlock)}
    </div>
  );
}
