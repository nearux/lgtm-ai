import { Button, Modal } from '@/shared/components';

interface Props {
  isOpen: boolean;
  close: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

export const CheckoutModal = ({
  isOpen,
  close,
  onConfirm,
  isPending,
}: Props) => (
  <Modal
    isOpen={isOpen}
    onClose={close}
    title="Checkout PR Branch"
    footer={
      <>
        <Button variant="secondary" onClick={close} block>
          Cancel
        </Button>
        <Button onClick={onConfirm} loading={isPending} block>
          Checkout
        </Button>
      </>
    }
  >
    <p className="text-gray-600">
      To apply the fix, we need to checkout the PR branch.
    </p>
    <p className="mt-2 text-gray-600">
      If you have uncommitted changes, they will be <strong>stashed</strong> and
      can be restored later with{' '}
      <code className="rounded bg-gray-100 px-1">git stash pop</code>.
    </p>
  </Modal>
);
