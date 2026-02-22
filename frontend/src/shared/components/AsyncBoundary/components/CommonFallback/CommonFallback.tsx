import { Spinner } from '../../../Spinner/Spinner';

export const CommonFallback = () => (
  <div className="fixed inset-0 flex h-screen justify-center pt-50">
    <Spinner size="lg" />
  </div>
);
