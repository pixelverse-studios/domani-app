import React from 'react';
import { View, ViewProps } from 'react-native';
import clsx from 'clsx';

interface CardProps extends ViewProps {
  className?: string;
}

export const Card = ({ children, className, ...rest }: CardProps) => {
  return (
    <View
      className={clsx(
        'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4',
        className
      )}
      {...rest}
    >
      {children}
    </View>
  );
};
