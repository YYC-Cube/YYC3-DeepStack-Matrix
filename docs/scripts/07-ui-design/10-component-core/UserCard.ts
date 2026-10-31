// ❌ 错误：职责过多
const UserCard = ({ user }) => {
  // 职责1：展示用户信息
  // 职责2：处理用户操作
  // 职责3：管理用户状态
  // 职责4：处理网络请求

  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    setLoading(true);
    await followUser(user.id);
    setIsFollowing(true);
    setLoading(false);
  };

  return (
    <div>
      <img src={user.avatar} alt={user.name} />
      <h3>{user.name}</h3>
      <p>{user.bio}</p>
      <button onClick={handleFollow} disabled={loading}>
        {isFollowing ? '已关注' : '关注'}
      </button>
    </div>
  );
};

// ✅ 正确：职责单一
const UserAvatar = ({ src, alt }) => {
  return <img src={src} alt={alt} />;
};

const UserName = ({ name }) => {
  return <h3>{name}</h3>;
};

const UserBio = ({ bio }) => {
  return <p>{bio}</p>;
};

const FollowButton = ({ isFollowing, onFollow, loading }) => {
  return (
    <button onClick={onFollow} disabled={loading}>
      {isFollowing ? '已关注' : '关注'}
    </button>
  );
};

// 组合使用
const UserCard = ({ user }) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    setLoading(true);
    await followUser(user.id);
    setIsFollowing(true);
    setLoading(false);
  };

  return (
    <div>
      <UserAvatar src={user.avatar} alt={user.name} />
      <UserName name={user.name} />
      <UserBio bio={user.bio} />
      <FollowButton
        isFollowing={isFollowing}
        onFollow={handleFollow}
        loading={loading}
      />
    </div>
  );
};
