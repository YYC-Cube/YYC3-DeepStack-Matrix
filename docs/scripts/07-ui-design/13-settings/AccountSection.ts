// 账号组件实现
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { SettingIcons } from '@/constants/icons';

export const AccountSection: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { state, dispatch } = useSettings();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    avatar: user?.avatar || '',
  });
  const [isUploading, setIsUploading] = useState(false);
  
  // 头像上传处理
  const handleAvatarUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const avatarUrl = await uploadAvatar(file);
      setFormData({ ...formData, avatar: avatarUrl });
      await updateUser({ avatar: avatarUrl });
      soundEffects.play('confirm');
    } catch (error) {
      console.error('Avatar upload failed:', error);
      soundEffects.play('error');
    } finally {
      setIsUploading(false);
    }
  };
  
  // 保存用户信息
  const handleSave = async () => {
    try {
      await updateUser(formData);
      setIsEditing(false);
      soundEffects.play('confirm');
    } catch (error) {
      console.error('Failed to update user:', error);
      soundEffects.play('error');
    }
  };
  
  return (
    <div className="settings__section">
      <h2 className="settings__section-title">
        <LucideIcon name={SettingIcons.account} size={24} />
        账号
      </h2>
      <div className="settings__section-content">
        <div className="settings__account-info">
          <div className="settings__avatar-container">
            {formData.avatar ? (
              <img 
                src={formData.avatar} 
                alt="头像" 
                className="settings__avatar"
              />
            ) : (
              <div className="settings__avatar-placeholder">
                {formData.username.charAt(0).toUpperCase()}
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarUpload(file);
              }}
              className="settings__avatar-input"
              disabled={isUploading}
            />
            {isUploading && (
              <div className="settings__avatar-loading">
                <LucideIcon name={SettingIcons.loading} size={24} />
              </div>
            )}
          </div>
          <div className="settings__user-details">
            <div className="settings__username">{formData.username}</div>
            <div className="settings__email">{formData.email}</div>
            <div className="settings__user-id">ID: {user?.id}</div>
          </div>
        </div>
        
        {isEditing ? (
          <div className="settings__edit-form">
            <div className="settings__form-group">
              <label>用户名</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="输入用户名"
              />
            </div>
            <div className="settings__form-group">
              <label>邮箱</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="输入邮箱"
              />
            </div>
            <div className="settings__form-actions">
              <button 
                className="settings__button settings__button--primary"
                onClick={handleSave}
              >
                <LucideIcon name={SettingIcons.save} size={16} />
                保存
              </button>
              <button 
                className="settings__button settings__button--secondary"
                onClick={() => {
                  setIsEditing(false);
                  soundEffects.play('dismiss');
                }}
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <button 
            className="settings__button settings__button--tertiary"
            onClick={() => {
              setIsEditing(true);
              soundEffects.play('click');
            }}
          >
            <LucideIcon name={SettingIcons.edit} size={16} />
            编辑资料
          </button>
        )}
      </div>
    </div>
  );
};
