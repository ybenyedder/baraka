/** Statistique. `card` : tuile blanche (dashboards). `band` : sur fond pine (landing). */
export function Stat({
  value,
  label,
  tone = 'card',
}: {
  value: string;
  label: string;
  tone?: 'card' | 'band';
}) {
  if (tone === 'band') {
    return (
      <div>
        <p className="font-display text-4xl font-extrabold text-yellow sm:text-5xl">{value}</p>
        <p className="mt-1 text-cream/80">{label}</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <p className="text-sm text-black/50">{label}</p>
      <p className="mt-1 text-2xl font-bold text-pine">{value}</p>
    </div>
  );
}
