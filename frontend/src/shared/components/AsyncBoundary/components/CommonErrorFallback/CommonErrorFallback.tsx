import { AlertCircle } from 'lucide-react';
import { Button } from '../../../Button/Button';

interface Props {
  message: string;
  onRetry?: () => void;
}

export const CommonErrorFallback = ({ message, onRetry }: Props) => (
  <div className="flex flex-col items-center justify-center p-8">
    <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
    <p className="mb-4 text-gray-700">{message}</p>
    {onRetry && <Button onClick={onRetry}>Try Again</Button>}
  </div>
);
