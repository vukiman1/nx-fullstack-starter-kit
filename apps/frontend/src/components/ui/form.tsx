interface FormProps extends Omit<React.ComponentProps<'form'>, 'onSubmit'> {
  onSubmit: () => void;
}

// stopPropagation: these render inside dialogs, where an escaping submit reaches an outer form.
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
