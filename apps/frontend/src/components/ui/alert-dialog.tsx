import * as React from 'react';
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';
import { MODAL_BACKDROP_PROPS, MODAL_PANEL_PROPS } from './modal-surface';

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogAction = AlertDialogPrimitive.Action;
const AlertDialogCancel = AlertDialogPrimitive.Cancel;

const AlertDialogContent = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Portal>
    <AlertDialogPrimitive.Overlay {...MODAL_BACKDROP_PROPS} />
    <AlertDialogPrimitive.Content
      {...MODAL_PANEL_PROPS}
      className={cn(MODAL_PANEL_PROPS.className, 'max-w-md', className)}
      ref={ref}
      {...props}
    />
  </AlertDialogPrimitive.Portal>
));
AlertDialogContent.displayName = 'AlertDialogContent';

const AlertDialogTitle = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    className={cn('text-lg font-extrabold text-foreground', className)}
    ref={ref}
    {...props}
  />
));
AlertDialogTitle.displayName = 'AlertDialogTitle';

const AlertDialogDescription = React.forwardRef<
  React.ComponentRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    className={cn('text-sm text-muted-foreground', className)}
    ref={ref}
    {...props}
  />
));
AlertDialogDescription.displayName = 'AlertDialogDescription';

const AlertDialogFooter = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <div className={cn('flex flex-wrap justify-end gap-3', className)} {...props} />
);
AlertDialogFooter.displayName = 'AlertDialogFooter';

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
};
