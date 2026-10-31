// ✅ 通用组件：设计为可复用
const Button = ({ label, onClick, variant }) => {
  // 支持多种变体和配置
  return <button onClick={onClick} className={`btn-${variant}`}>{label}</button>;
};

// ✅ 业务组件：保持简单，不强求复用
const RegistrationForm = () => {
  // 特定的业务逻辑，只在注册页面使用
  const handleSubmit = async () => {
    await registerUser(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* 表单内容 */}
    </form>
  );
};
