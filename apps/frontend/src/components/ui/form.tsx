interface FormProps extends Omit<React.ComponentProps<'form'>, 'onSubmit'> {
  onSubmit: () => void;
}

/**
 * A form that never navigates. stopPropagation matters because these render inside dialogs, where
 * an escaping submit event would reach an outer form.
 */
export function Form({ onSubmit, ...props }: FormProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onSubmit();
      }}
      {...props}
    />
  );
}
