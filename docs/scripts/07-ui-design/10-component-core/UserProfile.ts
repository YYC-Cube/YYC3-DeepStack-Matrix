// ✅ 改进后：独立单元可自治 + ✅ 可复用
const UserProfile = ({ user, theme, onViewDetail }) => {
  // ✅ 通过 props 传递依赖，而不是依赖外部状态
  return (
    <div className={theme}>
      <h1>{user.name}</h1>
      <button onClick={onViewDetail}>
        查看详情
      </button>
    </div>
  );
};

// 使用场景1：个人中心页面
const PersonalCenterPage = () => {
  const user = useUser();
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <UserProfile
      user={user}
      theme={theme}
      onViewDetail={() => navigate('/profile')}
    />
  );
};

// 使用场景2：用户列表页面
const UserListPage = () => {
  const users = useUsers();
  const theme = useTheme();
  const navigate = useNavigate();

  return (
    <div>
      {users.map(user => (
        <UserProfile
          key={user.id}
          user={user}
          theme={theme}
          onViewDetail={() => navigate(`/profile/${user.id}`)}
        />
      ))}
    </div>
  );
};
