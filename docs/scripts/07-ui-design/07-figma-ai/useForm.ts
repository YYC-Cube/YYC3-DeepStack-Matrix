// /hooks/useForm.ts

interface FormOptions<T> {
  initialValues: T;
  validation?: (values: T) => Record<string, string>;
  onSubmit: (values: T) => Promise<void>;
}

function useForm<T>(options: FormOptions<T>) {
  // 实现表单状态、验证、提交逻辑
}

// 使用示例：
const { values, errors, handleChange, handleSubmit } = useForm({
  initialValues: { name: '', email: '' },
  validation: (values) => {
    const errors: Record<string, string> = {};
    if (!values.name) errors.name = 'Name is required';
    return errors;
  },
  onSubmit: async (values) => {
    await submitForm(values);
  }
});
