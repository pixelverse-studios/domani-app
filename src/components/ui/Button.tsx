import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-purple-600 dark:bg-purple-500',
  secondary: 'bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600',
  ghost: 'bg-transparent',
  destructive: 'bg-red-500 dark:bg-red-600'
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-3 text-base',
  lg: 'px-6 py-4 text-lg'
};

export const Button = ({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className
}: ButtonProps) => {
  const textColor =
    variant === 'secondary'
      ? 'text-slate-900 dark:text-slate-100'
      : variant === 'ghost'
      ? 'text-purple-600 dark:text-purple-400'
      : 'text-white';

  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      className={clsx(
        'rounded-lg font-semibold active:opacity-80 items-center justify-center',
        variantClasses[variant],
        sizeClasses[size],
        (disabled || loading) && 'opacity-60',
        className
      )}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? '#0f172a' : '#ffffff'} />
      ) : (
        <Text className={textColor}>{children}</Text>
      )}
    </TouchableOpacity>
  );
};
