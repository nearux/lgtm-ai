import { motion } from 'motion/react';
import type { GroupedItem } from '../utils/groupMessages';

interface Props {
  item: GroupedItem & { kind: 'user' };
}

export const UserBubble = ({ item }: Props) => {
  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex justify-end"
    >
      <div className="max-w-[85%] rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white">
        {item.content}
      </div>
    </motion.div>
  );
};
