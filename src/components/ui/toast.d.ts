import * as React from 'react';
import { type VariantProps } from 'class-variance-authority';

import { toastVariants } from './toast';

export type ToastProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof toastVariants> & {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  };

export type ToastActionElement = React.ReactElement;