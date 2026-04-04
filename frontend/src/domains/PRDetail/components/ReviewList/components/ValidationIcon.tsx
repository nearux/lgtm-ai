import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

interface Props {
  status: ValidationStatus;
}

export const ValidationIcon = ({ status }: Props) => {
  switch (status) {
    case 'validating':
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case 'valid':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'invalid':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return null;
  }
};
