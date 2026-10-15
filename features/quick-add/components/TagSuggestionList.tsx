import type { TagAutocomplete } from "@/features/quick-add/hooks/useTagAutocomplete";

type TagSuggestionListProps = {
  autocomplete: TagAutocomplete;
  /** "popover" floats under the "#" (QuickAddInput); "inline" fills the
   * space it is rendered in (the command palette's result area, #204,
   * where a popover would be clipped by the dialog). */
  variant: "popover" | "inline";
};

/**
 * The listbox of "#" label / "!" priority suggestions (see
 * useTagAutocomplete). Under the options — or alone — a passive line says
 * which label an unknown tag will create (#283); it is not an option, so
 * Enter still submits. The palette's inline variant leaves that line out
 * (its Add row already shows the "New label" chip) so the results stay.
 */
export default function TagSuggestionList({ autocomplete, variant }: TagSuggestionListProps) {
  const { open, kind, suggestions, newLabel, selected, listId, optionId, listRef, pick, hover } =
    autocomplete;
  const popover = variant === "popover";
  const hint = popover ? newLabel : null;

  return (
    <ul
      ref={listRef}
      id={listId}
      role="listbox"
      aria-label={kind === "priority" ? "Priorities" : "Labels"}
      hidden={!open && !hint}
      data-variant={variant}
      className={
        popover
          ? "absolute top-full z-20 mt-1.5 w-56 rounded-xl border border-line-strong bg-base-100 p-1 shadow-overlay"
          : "p-2"
      }
    >
      {!popover && (
        <li role="presentation" className="px-3 pt-2 pb-1 font-mono text-[11px] text-faint">
          {kind === "priority" ? "Priority" : "Labels"}
        </li>
      )}
      {suggestions.map((suggestion, index) => (
        <li
          key={suggestion.key}
          id={optionId(index)}
          role="option"
          aria-selected={index === selected}
          onMouseDown={(event) => {
            event.preventDefault(); // keep focus in the input
            pick(suggestion);
          }}
          onMouseEnter={() => hover(index)}
          className={`flex cursor-pointer items-center gap-2 text-sm ${
            popover ? "rounded-lg px-2 py-1.5" : "rounded-field px-3 py-2"
          } ${index === selected ? (popover ? "bg-base-300" : "bg-accent/10") : ""}`}
        >
          <span
            className="size-2 shrink-0 rounded-full bg-base-content/30"
            style={suggestion.color ? { backgroundColor: suggestion.color } : undefined}
            aria-hidden
          />
          <span className="truncate">{suggestion.name}</span>
          <span className="ml-auto font-mono text-[10px] text-faint">
            {index === selected ? "↵ Tab" : suggestion.hint}
          </span>
        </li>
      ))}
      {hint && (
        <>
          {open && <li role="presentation" className="mx-1.5 my-1 h-px bg-line-strong" />}
          <li
            role="presentation"
            className="flex items-center gap-2 px-2 py-1.5 text-xs text-subtle"
          >
            <span
              className="size-2 shrink-0 rounded-full border-[1.5px] border-dashed"
              style={{ borderColor: hint.color }}
              aria-hidden
            />
            <span className="truncate">
              {open ? "…or a new label" : "New label"} “{hint.name}”{open ? "" : " on Enter"}
            </span>
          </li>
        </>
      )}
    </ul>
  );
}
