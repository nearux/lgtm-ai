import { motion } from 'motion/react';
import { GFMMarkdown } from '@/shared/components';
import type { GroupedItem } from '../utils/groupMessages';

interface Props {
  item: GroupedItem & { kind: 'text' };
}

export const TextBubble = ({ item }: Props) => {
  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg border border-gray-200 bg-white p-3"
    >
      <GFMMarkdown className="prose-sm">{item.content}</GFMMarkdown>
    </motion.div>
  );
};
