// /i18n/index.ts

const translations = {
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
    },
    dashboard: {
      title: 'Dashboard',
      welcome: 'Welcome back',
    },
  },
  zh: {
    common: {
      save: '保存',
      cancel: '取消',
      delete: '删除',
    },
    dashboard: {
      title: '仪表板',
      welcome: '欢迎回来',
    },
  },
};

function useTranslation() {
  // 实现翻译逻辑
}

// 使用示例：
const { t } = useTranslation();
const text = t('common.save'); // 'Save' or '保存'
