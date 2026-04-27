interface Props {
  name: string;
  color: string;
}

export const LabelChip = ({ name, color }: Props) => (
  <span
    className="rounded-full px-2 py-0.5 text-xs font-medium"
    style={{
      backgroundColor: `#${color}20`,
      color: `#${color}`,
    }}
  >
    {name}
  </span>
);
