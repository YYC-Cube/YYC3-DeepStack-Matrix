// src/config/branding.ts
export interface BrandingConfig {
  // Logo 配置
  logo: {
    light: string;  // 浅色模式 logo 路径
    dark: string;   // 深色模式 logo 路径
    width: number;
    height: number;
    animated?: boolean;
  };

  // 标语配置
  slogan: {
    primary: {
      zh: string;  // 主标语中文
      en: string;  // 主标语英文
    };
    secondary: {
      zh: string;  // 副标语中文
      en: string;  // 副标语英文
    };
  };

  // 页面标题配置
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };

  // 联系信息
  contact: {
    email: string;
    website?: string;
    social?: {
      github?: string;
      twitter?: string;
      linkedin?: string;
    };
  };

  // 版权信息
  copyright: {
    year: number;
    owner: string;
    license?: string;
  };
}

export const defaultBranding: BrandingConfig = {
  logo: {
    light: '/assets/logo-light.svg',
    dark: '/assets/logo-dark.svg',
    width: 40,
    height: 40,
    animated: true,
  },
  slogan: {
    primary: {
      zh: '言启象限 | 语枢未来',
      en: 'Words Initiate Quadrants, Language Serves as Core for Future',
    },
    secondary: {
      zh: '万象归元于云枢 | 深栈智启新纪元',
      en: 'All things converge in cloud pivot; Deep stacks ignite a new era of intelligence',
    },
  },
  seo: {
    title: 'YYC³ AI Code Designer',
    description: '智能AI代码设计器，支持实时协作、多设备预览、AI辅助开发',
    keywords: ['AI', 'Code', 'Designer', 'Collaboration', 'Real-time'],
  },
  contact: {
    email: 'admin0379.email',
    website: 'https://yanyucloudcube.com',
  },
  copyright: {
    year: new Date().getFullYear(),
    owner: 'YanYuCloudCube Team',
    license: 'MIT',
  },
};
