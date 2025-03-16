'use client';

import * as React from 'react';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastTitle,
} from '@/components/ui/toast';
import { useToast } from '@/components/ui/use-toast';
import type { ToastProps } from './toast.d';

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactElement;
};

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed top-0 z-[100] flex flex-col gap-2 p-4 max-h-screen w-full sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col-reverse sm:max-w-[420px]">
      {toasts.map(function ({ id, title, description, action, ...props }: ToasterToast) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
    </div>
  );
}