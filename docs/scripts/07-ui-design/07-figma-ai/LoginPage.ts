// ✅ 正确：良好的用户体验
const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    setError('');
    try {
      await login(values);
      // 登录成功，跳转到首页
      router.push('/dashboard');
    } catch (err) {
      setError('登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6">登录</h1>
        {error && <Alert type="error" message={error} />}
        <LoginForm onSubmit={handleSubmit} loading={loading} />
      </div>
    </div>
  );
};
