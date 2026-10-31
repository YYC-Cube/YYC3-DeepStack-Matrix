// 搜索组件实现
import { useSettings } from '@/contexts/SettingsContext';
import { useSearch } from '@/hooks/useSearch';
import { SettingIcons } from '@/constants/icons';

export const SearchBar: React.FC = () => {
  const { state, dispatch } = useSettings();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SettingItem[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  
  // 使用统一的搜索Hook
  const { search, clear } = useSearch({
    sources: [
      'settings',
      'projects',
      'components',
      'code',
    ],
    debounce: 300,
  });
  
  // 搜索处理
  const handleSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }
    
    const searchResults = await search(searchQuery);
    setResults(searchResults);
  }, [search]);
  
  // 结果选择
  const handleSelect = useCallback((item: SettingItem) => {
    switch (item.type) {
      case 'setting':
        // 跳转到设置项
        navigateToSetting(item.path);
        break;
      case 'project':
        // 跳转到项目
        navigateToProject(item.id);
        break;
      case 'component':
        // 跳转到组件
        navigateToComponent(item.id);
        break;
      case 'code':
        // 跳转到代码
        navigateToCode(item.id);
        break;
    }
    clear();
    setQuery('');
  }, [navigateToSetting, navigateToProject, navigateToComponent, navigateToCode, clear]);
  
  return (
    <div className="settings__search">
      <div className={`settings__search-input ${isFocused ? 'focused' : ''}`}>
        <LucideIcon 
          name={SettingIcons.search} 
          size={20} 
          className="settings__search-icon"
        />
        <input
          type="text"
          placeholder="搜索设置、项目、组件、代码..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            handleSearch(e.target.value);
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {query.length > 0 && (
          <button
            className="settings__search-clear"
            onClick={() => {
              setQuery('');
              clear();
            }}
          >
            <LucideIcon name={SettingIcons.remove} size={16} />
          </button>
        )}
      </div>
      {results.length > 0 && (
        <div className="settings__search-results">
          {results.map((item, index) => (
            <div 
              key={index} 
              className="settings__search-result"
              onClick={() => handleSelect(item)}
            >
              <LucideIcon 
                name={item.icon} 
                size={20} 
                className="settings__result-icon"
              />
              <div className="settings__result-content">
                <div className="settings__result-title">{item.title}</div>
                <div className="settings__result-type">{item.type}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
