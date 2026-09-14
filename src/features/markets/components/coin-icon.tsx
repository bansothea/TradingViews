/**
 * Coin mark.
 *
 * A generated monogram rather than a logo file: real logos mean either
 * bundling ~30 trademarked images or hot-linking a CDN (an extra origin, a
 * remotePatterns entry, and a broken row whenever it 404s). To use real
 * artwork later, drop files in public/coins/<base>.svg and swap the inner
 * span for next/image.
 */
export function CoinIcon({
  base,
  color,
  size = 36,
}: {
  base: string;
  color: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(140deg, ${color}, ${color}99)`,
        // Scale to length so DOGE and NEAR fit whole rather than being
        // truncated to "DOG" / "NEA".
        fontSize: size * (base.length > 4 ? 0.2 : base.length === 4 ? 0.25 : 0.32),
      }}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold tracking-tight text-white shadow-sm"
    >
      {base.slice(0, 5)}
    </span>
  );
}
