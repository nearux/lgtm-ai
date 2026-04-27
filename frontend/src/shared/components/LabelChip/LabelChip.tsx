interface Props {
  name: string;
  color: string;
}

export const LabelChip = ({ name, color }: Props) => (
  <span
    className="rounded-full px-2 py-0.5 text-xs font-medium"
    style={{
      backgroundColor: `#${color}20`,
      color: getReadableForeground(color),
    }}
  >
    {name}
  </span>
);

const FOREGROUND_DARKEN_FACTOR = 0.4;
const LUMINANCE_THRESHOLD = 0.5;

const getReadableForeground = (hex: string): string => {
  if (hex.length !== 6) return `#${hex}`;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return `#${hex}`;

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance <= LUMINANCE_THRESHOLD) return `#${hex}`;

  const darken = (v: number) =>
    Math.floor(v * FOREGROUND_DARKEN_FACTOR)
      .toString(16)
      .padStart(2, '0');
  return `#${darken(r)}${darken(g)}${darken(b)}`;
};
