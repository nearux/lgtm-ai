interface Props {
  status: string;
}

const statusColors: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  merged: 'bg-purple-100 text-purple-800',
  closed: 'bg-red-100 text-red-800',
};

export const StatusBadge = ({ status }: Props) => {
  const colorClass = statusColors[status] || 'bg-gray-100 text-gray-800';

  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium ${colorClass}`}
    >
      {status}
    </span>
  );
};
