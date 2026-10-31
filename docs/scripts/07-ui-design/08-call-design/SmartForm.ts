import React from 'react';
import { useForm } from 'react-hook-form';

interface SmartFormProps {
  onSubmit: (data: any) => void;
  children: React.ReactNode;
}

export const SmartForm: React.FC<SmartFormProps> = ({
  onSubmit,
  children,
}) => {
  const { handleSubmit, register, formState: { errors } } = useForm();

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            register,
            error: errors[child.props.name],
          });
        }
        return child;
      })}
    </form>
  );
};
