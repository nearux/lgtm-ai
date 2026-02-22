import type { ButtonHTMLAttributes, ReactNode } from 'react';

type IconButtonVariant = 'default' | 'danger';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  children: ReactNode;
}

const variantClasses: Record<IconButtonVariant, string> = {
  default: 'text-gray-400 hover:bg-gray-100 hover:text-gray-600',
  danger: 'text-gray-400 hover:bg-red-50 hover:text-red-500',
};

const sizeClasses: Record<IconButtonSize, string> = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

export const IconButton = ({
  variant = 'default',
  size = 'md',
  children,
  className = '',
  ...props
}: Props) => {
  return (
    <button
      type="button"
      className={`flex items-center justify-center rounded-full transition-colors ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
