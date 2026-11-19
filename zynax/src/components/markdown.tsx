function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-bg px-1 py-0.5 text-[0.92em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function Markdown({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="space-y-3 text-sm leading-relaxed text-fg">
      {blocks.map((block, i) => {
        if (block.startsWith("```")) {
          const code = block.replace(/^```[a-zA-Z0-9]*\n?/, "").replace(/```$/, "");
          return (
            <pre key={i} className="overflow-x-auto rounded-xl bg-bg p-3 text-xs text-fg">
              {code}
            </pre>
          );
        }
        const lines = block.split("\n");
        if (lines.every((line) => line.trim().startsWith("- "))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((line, j) => (
                <li key={j}>{inline(line.replace(/^\s*-\s*/, ""))}</li>
              ))}
            </ul>
          );
        }
        if (block.startsWith("#")) {
          return (
            <h3 key={i} className="font-display text-base font-semibold">
              {inline(block.replace(/^#+\s*/, ""))}
            </h3>
          );
        }
        return <p key={i}>{inline(block)}</p>;
      })}
    </div>
  );
}
