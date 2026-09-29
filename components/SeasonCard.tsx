import type { Metrics } from "@/lib/schemas";

const ORDER: [keyof Metrics, string][] = [
  ["undertone", "Undertone"],
  ["depth", "Depth"],
  ["contrast", "Contrast"],
  ["chroma", "Chroma"],
];

export function SeasonCard({
  name,
  tagline,
  swatches,
  metrics,
  badge,
}: {
  name: string;
  tagline?: string;
  swatches: string[];
  metrics: Metrics;
  badge?: React.ReactNode;
}) {
  return (
    <article className="season-card" aria-label={`${name} Season Card`}>
      <div className="sc-top">
        <span className="eyebrow">Season Card</span>
        {badge}
      </div>
      <h2 className="sc-name">{name}</h2>
      {tagline ? <p className="sc-tagline">{tagline}</p> : null}
      <div className="swatches" role="list" aria-label="Your four key colours">
        {swatches.slice(0, 4).map((hex, i) => (
          <div key={i} role="listitem" className="swatch" style={{ background: hex }} title={hex} aria-label={hex} />
        ))}
      </div>
      <div className="metric-chips">
        {ORDER.map(([k, title]) => (
          <div className="metric-chip" key={k}>
            <span className="k">{title}</span>
            <span className="v">{metrics[k].label}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
