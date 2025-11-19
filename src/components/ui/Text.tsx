import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import clsx from 'clsx';

type TextVariant = 'title' | 'subtitle' | 'body' | 'caption';

interface TypographyProps extends TextProps {
  variant?: TextVariant;
  className?: string;
}

const variantClasses: Record<TextVariant, string> = {
  title: 'text-3xl font-semibold text-slate-900 dark:text-slate-50',
  subtitle: 'text-xl font-medium text-slate-700 dark:text-slate-300',
  body: 'text-base text-slate-900 dark:text-slate-50',
  caption: 'text-sm text-slate-600 dark:text-slate-400'
};

export const Text = ({ variant = 'body', className, ...rest }: TypographyProps) => (
  <RNText {...rest} className={clsx(variantClasses[variant], className)} />
);
