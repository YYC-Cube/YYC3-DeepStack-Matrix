// 规则和技能组件实现
import { useSettings } from '@/contexts/SettingsContext';
import { useAI } from '@/contexts/AIContext';
import { SettingIcons } from '@/constants/icons';

export const RulesAndSkillsSection: React.FC = () => {
  const { state, dispatch } = useSettings();
  const { updateRules, updateSkills } = useAI();
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);
  const [showCreateSkillModal, setShowCreateSkillModal] = useState(false);
  
  // 规则变更
  const handleRulesChange = (key: keyof typeof state.rules, value: any) => {
    dispatch({ 
      type: 'SET_RULES', 
      payload: { 
        [key]: value 
      } 
    });
    
    // 同步到AI智能层
    updateRules({
      ...state.rules,
      [key]: value,
    });
    
    soundEffects.play('click');
  };
  
  // 技能变更
  const handleAddSkill = (skill: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newSkill: Skill = {
      ...skill,
      id: Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    dispatch({ type: 'ADD_SKILL', payload: newSkill });
    
    // 同步到AI智能层
    updateSkills({
      ...state.skills,
      [skill.type]: [...state.skills[skill.type], newSkill],
    });
    
    setShowCreateSkillModal(false);
    soundEffects.play('confirm');
  };
  
  const handleUpdateSkill = (skill: Skill) => {
    dispatch({ type: 'UPDATE_SKILL', payload: skill });
    
    // 同步到AI智能层
    updateSkills({
      ...state.skills,
      [skill.type]: state.skills[skill.type].map(s => 
        s.id === skill.id ? skill : s
      ),
    });
    
    setEditingSkill(null);
    soundEffects.play('confirm');
  };
  
  const handleDeleteSkill = (id: string) => {
    dispatch({ type: 'REMOVE_SKILL', payload: id });
    
    // 同步到AI智能层
    updateSkills({
      global: state.skills.global.filter(s => s.id !== id),
      project: state.skills.project.filter(s => s.id !== id),
    });
    
    soundEffects.play('dismiss');
  };
  
  const allSkills = [...state.skills.global, ...state.skills.project];
  
  return (
    <div className="settings__section">
      <h2 className="settings__section-title">
        <LucideIcon name={SettingIcons.rules} size={24} />
        规则和技能
      </h2>
      <div className="settings__section-content">
        {/* 导入设置 */}
        <div className="settings__toggle-group">
          <label className="settings__toggle">
            <input
              type="checkbox"
              checked={state.rules.importAgents}
              onChange={(e) => handleRulesChange('importAgents', e.target.checked)}
            />
            <span>导入 AGENTS.md</span>
            <span className="settings__toggle-description">
              将 AGENTS.md 包含在上下文中
            </span>
          </label>
          
          <label className="settings__toggle">
            <input
              type="checkbox"
              checked={state.rules.importClaude}
              onChange={(e) => handleRulesChange('importClaude', e.target.checked)}
            />
            <span>导入 CLAUDE.md 和 CLAUDE.local.md</span>
            <span className="settings__toggle-description">
              将 CLAUDE.md 和 CLAUDE.local.md 包含在上下文中
            </span>
          </label>
        </div>
        
        {/* 个人规则 */}
        <div className="settings__rules-section">
          <div className="settings__section-header">
            <h3>个人规则</h3>
            <button
              className="settings__button settings__button--tertiary"
              onClick={() => {
                setShowCreateRuleModal(true);
                soundEffects.play('click');
              }}
            >
              <LucideIcon name={SettingIcons.add} size={16} />
              新建规则
            </button>
          </div>
          
          <div className="settings__rules-list">
            {state.rules.personalRules.map((rule, index) => (
              <div key={index} className="settings__rule-card">
                <div className="settings__rule-content">
                  <h4 className="settings__rule-name">{rule.name}</h4>
                  <p className="settings__rule-description">{rule.description}</p>
                </div>
                <div className="settings__rule-actions">
                  <button
                    onClick={() => {
                      setEditingRule(rule);
                      soundEffects.play('click');
                    }}
                  >
                    <LucideIcon name={SettingIcons.edit} size={16} />
                  </button>
                  <button
                    onClick={() => {
                      const newRules = state.rules.personalRules.filter((_, i) => i !== index);
                      handleRulesChange('personalRules', newRules);
                      soundEffects.play('dismiss');
                    }}
                  >
                    <LucideIcon name={SettingIcons.remove} size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* 技能 */}
        <div className="settings__skills-section">
          <div className="settings__section-header">
            <h3>技能</h3>
            <div className="settings__skill-tabs">
              <button
                className={`settings__skill-tab ${!editingSkill ? 'active' : ''}`}
                onClick={() => {
                  setEditingSkill(null);
                  soundEffects.play('click');
                }}
              >
                全局 ({state.skills.global.length})
              </button>
              <button
                className={`settings__skill-tab ${editingSkill ? 'active' : ''}`}
                onClick={() => {
                  setEditingSkill(null);
                  soundEffects.play('click');
                }}
              >
                项目 ({state.skills.project.length})
              </button>
            </div>
            <button
              className="settings__button settings__button--tertiary"
              onClick={() => {
                setShowCreateSkillModal(true);
                soundEffects.play('click');
              }}
            >
              <LucideIcon name={SettingIcons.add} size={16} />
              新建技能
            </button>
          </div>
          
          <div className="settings__skills-list">
            {allSkills.map((skill) => (
              <div key={skill.id} className="settings__skill-card">
                <div className="settings__skill-info">
                  <h4 className="settings__skill-name">{skill.name}</h4>
                  <p className="settings__skill-description">{skill.description}</p>
                  <span className={`settings__skill-type ${skill.type}`}>
                    {skill.type === 'global' ? '全局' : '项目'}
                  </span>
                </div>
                <div className="settings__skill-actions">
                  <button
                    onClick={() => {
                      setEditingSkill(skill);
                      soundEffects.play('click');
                    }}
                  >
                    <LucideIcon name={SettingIcons.edit} size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteSkill(skill.id)}
                  >
                    <LucideIcon name={SettingIcons.remove} size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* 规则创建模态框 */}
        {showCreateRuleModal && (
          <RuleModal
            onSave={(rule) => {
              const newRules = [...state.rules.personalRules, rule];
              handleRulesChange('personalRules', newRules);
              setShowCreateRuleModal(false);
            }}
            onClose={() => {
              setShowCreateRuleModal(false);
              soundEffects.play('dismiss');
            }}
          />
        )}
        
        {editingRule && (
          <RuleModal
            rule={editingRule}
            onSave={(rule) => {
              const newRules = state.rules.personalRules.map((r, i) => 
                i === state.rules.personalRules.indexOf(editingRule) ? rule : r
              );
              handleRulesChange('personalRules', newRules);
              setEditingRule(null);
            }}
            onClose={() => {
              setEditingRule(null);
              soundEffects.play('dismiss');
            }}
          />
        )}
        
        {/* 技能创建模态框 */}
        {showCreateSkillModal && (
          <SkillModal
            onSave={handleAddSkill}
            onClose={() => {
              setShowCreateSkillModal(false);
              soundEffects.play('dismiss');
            }}
          />
        )}
        
        {editingSkill && (
          <SkillModal
            skill={editingSkill}
            onSave={handleUpdateSkill}
            onClose={() => {
              setEditingSkill(null);
              soundEffects.play('dismiss');
            }}
          />
        )}
      </div>
    </div>
  );
};
