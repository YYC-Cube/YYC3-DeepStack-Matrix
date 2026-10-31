// components/settings/SkillsManager.tsx
import React, { useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';
import { Skill } from '../../types/settings';
import { soundEffects } from '../../utils/soundEffects';

export const SkillsManager: React.FC = () => {
  const { state, dispatch } = useSettings();
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const handleCreateSkill = (skill: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newSkill: Skill = {
      ...skill,
      id: Date.now().toString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    dispatch({ type: 'ADD_SKILL', payload: newSkill });
    setShowCreateModal(false);
    soundEffects.play('confirm');
  };
  
  const handleUpdateSkill = (skill: Skill) => {
    dispatch({ type: 'UPDATE_SKILL', payload: skill });
    setEditingSkill(null);
    soundEffects.play('confirm');
  };
  
  const handleDeleteSkill = (id: string) => {
    dispatch({ type: 'REMOVE_SKILL', payload: id });
    soundEffects.play('dismiss');
  };
  
  const allSkills = [...state.skills.global, ...state.skills.project];
  
  return (
    <div className="settings__section">
      <h2 className="settings__section-title">技能</h2>
      <div className="settings__section-content">
        <div className="settings__skills-header">
          <div className="settings__skill-tabs">
            <button
              className={`settings__skill-tab ${!editingSkill ? 'active' : ''}`}
              onClick={() => {
                setEditingSkill(null);
                soundEffects.play('click');
              }}
            >
              全局技能 ({state.skills.global.length})
            </button>
            <button
              className={`settings__skill-tab ${editingSkill ? 'active' : ''}`}
              onClick={() => {
                setEditingSkill(null);
                soundEffects.play('click');
              }}
            >
              项目技能 ({state.skills.project.length})
            </button>
          </div>
          <button
            className="settings__create-skill"
            onClick={() => {
              setShowCreateModal(true);
              soundEffects.play('click');
            }}
          >
            + 新建技能
          </button>
        </div>
        
        <div className="settings__skills-list">
          {allSkills.map((skill) => (
            <div key={skill.id} className="settings__skill-card">
              <div className="settings__skill-info">
                <h3 className="settings__skill-name">{skill.name}</h3>
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
                  编辑
                </button>
                <button
                  onClick={() => handleDeleteSkill(skill.id)}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {showCreateModal && (
          <SkillModal
            onSave={handleCreateSkill}
            onClose={() => {
              setShowCreateModal(false);
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

function SkillModal({ 
  skill, 
  onSave, 
  onClose 
}: { 
  skill?: Skill; 
  onSave: (skill: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>) => void; 
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: skill?.name || '',
    description: skill?.description || '',
    type: skill?.type || 'global' as 'global' | 'project',
    content: skill?.content || '',
  });
  
  const handleSubmit = () => {
    onSave(formData);
  };
  
  return (
    <div className="settings__modal-overlay" onClick={onClose}>
      <div className="settings__modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="settings__modal-title">
          {skill ? '编辑技能' : '新建技能'}
        </h3>
        <div className="settings__modal-content">
          <div className="settings__form-group">
            <label>技能名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="settings__form-group">
            <label>描述</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <div className="settings__form-group">
            <label>类型</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as 'global' | 'project' })}
            >
              <option value="global">全局</option>
              <option value="project">项目</option>
            </select>
          </div>
          <div className="settings__form-group">
            <label>内容</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={10}
            />
          </div>
        </div>
        <div className="settings__modal-actions">
          <button onClick={handleSubmit}>保存</button>
          <button onClick={onClose}>取消</button>
        </div>
      </div>
    </div>
  );
}
