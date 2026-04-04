import { useState } from 'react';
import { Button, Modal } from '@/shared/components';

interface Props {
  isOpen: boolean;
  close: () => void;
  onConfirm: () => Promise<void>;
}

export const CheckoutModal = ({ isOpen, close, onConfirm }: Props) => {
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = async () => {
    setIsPending(true);
    try {
      await onConfirm();
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Checkout PR Branch"
      footer={
        <>
          <Button
            variant="secondary"
            onClick={close}
            disabled={isPending}
            block
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} loading={isPending} block>
            Checkout
          </Button>
        </>
      }
    >
      <p className="text-gray-600">
        To run this action, we need to checkout the PR branch.
      </p>
      <p className="mt-2 text-gray-600">
        If you have uncommitted changes, they will be <strong>stashed</strong>{' '}
        and can be restored later with{' '}
        <code className="rounded bg-gray-100 px-1">git stash pop</code>.
      </p>
    </Modal>
  );
};
