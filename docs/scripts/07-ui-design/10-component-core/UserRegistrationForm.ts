// ✅ 独立单元可自治 + ❌ 不可复用
const UserRegistrationForm = () => {
  // 自包含：所有逻辑都在组件内部
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async () => {
    // 特定的业务逻辑：用户注册
    await registerUser(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input label="用户名" value={formData.username} />
      <Input label="邮箱" value={formData.email} />
      <Input label="密码" type="password" value={formData.password} />
      <Button label="注册" onClick={handleSubmit} />
    </form>
  );
};

// 只在一个地方使用：注册页面
const RegisterPage = () => {
  return (
    <div>
      <h1>用户注册</h1>
      <UserRegistrationForm />
    </div>
  );
};
