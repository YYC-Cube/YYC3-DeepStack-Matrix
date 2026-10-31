/**
 * @file FormField.tsx
 * @description 表单字段组件
 * @version v1.0.0
 */

import React from 'react';
import Input from './atoms/Input';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password';
  placeholder?: string;
  value?: string;
  onChange?: (name: string, value: string) => void;
  error?: string;
  required?: boolean;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  required = false
}) => {
  return (
    <div className="mb-4">
      <label className="block mb-1 text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <Input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(newValue) => onChange?.(name, newValue)}
        error={error}
      />
    </div>
  );
};

export default FormField;
