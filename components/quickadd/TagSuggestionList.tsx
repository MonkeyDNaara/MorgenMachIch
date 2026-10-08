import type { TagAutocomplete } from "@/components/quickadd/useTagAutocomplete";

type TagSuggestionListProps = {
  autocomplete: TagAutocomplete;
  /** "popover" floats under the "#" (QuickAddInput); "inline" fills the
   * space it is rendered in (the command palette's result area, #204,
   * where a popover would be clipped by the dialog). */
  variant: "popover" | "inline";
};

/** The listbox of "#" label / "!" priority suggestions (see useTagAutocomplete). */
export default function TagSuggestionList({ autocomplete, variant }: TagSuggestionListProps) {
  const { open, kind, suggestions, selected, listId, optionId, listRef, pick, hover } =
    autocomplete;
  const popover = variant === "popover";

  return (
    <ul
      ref={listRef}
      id={listId}
      role="listbox"
      aria-label={kind === "priority" ? "Priorities" : "Labels"}
      hidden={!open}
      data-variant={variant}
      className={
        popover
          ? "absolute top-full z-20 mt-1.5 w-56 rounded-xl border border-base-300 bg-base-100 p-1 shadow-[0_10px_28px_rgba(0,0,0,0.5)]"
          : "p-2"
      }
    >
      {!popover && (
        <li
          role="presentation"
          className="px-3 pt-2 pb-1 font-mono text-[11px] text-base-content/40"
        >
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
          } ${index === selected ? (popover ? "bg-base-300" : "bg-primary/10") : ""}`}
        >
          <span
            className="size-2 shrink-0 rounded-full bg-base-content/30"
            style={suggestion.color ? { backgroundColor: suggestion.color } : undefined}
            aria-hidden
          />
          <span className="truncate">{suggestion.name}</span>
          <span className="ml-auto font-mono text-[10px] text-base-content/40">
            {index === selected ? "↵ Tab" : suggestion.hint}
          </span>
        </li>
      ))}
    </ul>
  );
}
