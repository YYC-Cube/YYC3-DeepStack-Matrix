-- batch-tag-golden-templates.sql
-- 一次性标记全部 20 个黄金模板

-- A 类: AI 应用
UPDATE kb_entries SET metadata = metadata || jsonb_build_object(
    'golden_template', true, 'template_id', 'tpl-ai-chat',
    'template_category', 'ai', 'template_rank', 1,
    'template_port', 3300, 'layout_type', 'sidebar-main',
    'ui_framework', 'shadcn/ui + Radix UI',
    'ux_pattern', 'chat-panel + model-selector + tool-invocation',
    'theme_presets', ARRAY['yyc3-dark','yyc3-light','yyc3-brand','nova']
) WHERE source_path LIKE '%yyc3-ai-llm-ai%' AND code_tier IN ('T1','T2');

UPDATE kb_entries SET metadata = metadata || jsonb_build_object(
    'golden_template', true, 'template_id', 'tpl-ai-deepstack',
    'template_category', 'ai', 'template_rank', 2,
    'template_port', 3301, 'layout_type', 'sidebar-main',
    'ui_framework', 'shadcn/ui + Radix UI',
    'ux_pattern', 'multi-panel + code-editor + terminal'
) WHERE source_path LIKE '%yyc3-ai-application-yanyu-cloud-deepstack%' AND code_tier IN ('T1','T2');

UPDATE kb_entries SET metadata = metadata || jsonb_build_object(
    'golden_template', true, 'template_id', 'tpl-ai-business',
    'template_category', 'ai', 'template_rank', 3,
    'template_port', 3302, 'layout_type', 'sidebar-main',
    'ui_framework', 'shadcn/ui + Radix UI',
    'ux_pattern', 'dashboard + data-table + workflow'
) WHERE source_path LIKE '%yyc3-ai-application-intelligent-business-center%' AND code_tier IN ('T1','T2');

UPDATE kb_entries SET metadata = metadata || jsonb_build_object(
    'golden_template', true, 'template_id', 'tpl-ai-robotics',
    'template_category', 'ai', 'template_rank', 4,
    'template_port', 3303, 'layout_type', 'full-page',
    'ui_framework', 'shadcn/ui + Radix UI',
    'ux_pattern', 'hero-section + feature-grid + cta'
) WHERE source_path LIKE '%yyc3-tools-devtemplate-ai-robotics-landing-page%' AND code_tier IN ('T1','T2');

-- B 类: 仪表盘
UPDATE kb_entries SET metadata = metadata || jsonb_build_object(
    'golden_template', true, 'template_id', 'tpl-dash-futuristic',
    'template_category', 'dashboard', 'template_rank', 5,
    'template_port', 3201, 'layout_type', 'sidebar-main',
    'ui_framework', 'shadcn/ui + Radix UI',
    'ux_pattern', '3d-background + glass-card + animated-charts'
) WHERE source_path LIKE '%yyc3-platform-cloud-futuristic-dashboard-3%' AND code_tier IN ('T1','T2');

UPDATE kb_entries SET metadata = metadata || jsonb_build_object(
    'golden_template', true, 'template_id', 'tpl-dash-data',
    'template_category', 'dashboard', 'template_rank', 6,
    'template_port', 3202, 'layout_type', 'sidebar-main',
    'ui_framework', 'shadcn/ui + Radix UI',
    'ux_pattern', 'data-table + filter-bar + chart-grid + detail-drawer'
) WHERE source_path LIKE '%yyc3-platform-cloud-dashboard-3%' AND code_tier IN ('T1','T2');

UPDATE kb_entries SET metadata = metadata || jsonb_build_object(
    'golden_template', true, 'template_id', 'tpl-dash-admin',
    'template_category', 'dashboard', 'template_rank', 7,
    'template_port', 3203, 'layout_type', 'sidebar-main',
    'ui_framework', 'shadcn/ui + Radix UI',
    'ux_pattern', 'rbac-menu + crud-table + form-modal + audit-log'
) WHERE source_path LIKE '%yyc3-platform-management-admin-system-3%' AND code_tier IN ('T1','T2');

-- C 类: 医疗
UPDATE kb_entries SET metadata = metadata || jsonb_build_object(
    'golden_template', true, 'template_id', 'tpl-med-full',
    'template_category', 'medical', 'template_rank', 8,
    'template_port', 3210, 'layout_type', 'sidebar-main',
    'ui_framework', 'shadcn/ui + Radix UI',
    'ux_pattern', 'patient-list + detail-card + timeline + prescription'
) WHERE source_path LIKE '%yyc3-other-medical%' AND code_tier IN ('T1','T2');

UPDATE kb_entries SET metadata = metadata || jsonb_build_object(
    'golden_template', true, 'template_id', 'tpl-med-nexus',
    'template_category', 'medical', 'template_rank', 9,
    'template_port', 3211, 'layout_type', 'sidebar-main',
    'ui_framework', 'shadcn/ui + Radix UI',
    'ux_pattern', 'knowledge-graph + search + entity-panel'
) WHERE source_path LIKE '%yyc3-platform-cloud-medinexus%' AND code_tier IN ('T1','T2');

-- D 类: 教育
UPDATE kb_entries SET metadata = metadata || jsonb_build_object(
    'golden_template', true, 'template_id', 'tpl-edu-hub',
    'template_category', 'education', 'template_rank', 10,
    'template_port', 3220, 'layout_type', 'sidebar-main',
    'ui_framework', 'shadcn/ui + Radix UI',
    'ux_pattern', 'course-grid + video-player + quiz + progress'
) WHERE source_path LIKE '%yyc3-edu-learning-hub%' AND code_tier IN ('T1','T2');

UPDATE kb_entries SET metadata = metadata || jsonb_build_object(
    'golden_template', true, 'template_id', 'tpl-edu-platform',
    'template_category', 'education', 'template_rank', 11,
    'template_port', 3221, 'layout_type', 'sidebar-main',
    'ui_framework', 'shadcn/ui + Radix UI',
    'ux_pattern', 'ai-tutor + learning-path + adaptive-quiz'
) WHERE source_path LIKE '%yyc3-ai-application-learning-platform%' AND code_tier IN ('T1','T2');

-- E 类: 管理平台
UPDATE kb_entries SET metadata = metadata || jsonb_build_object(
    'golden_template', true, 'template_id', 'tpl-mgmt-platform',
    'template_category', 'management', 'template_rank', 12,
    'template_port', 3230, 'layout_type', 'sidebar-main',
    'ui_framework', 'shadcn/ui + Radix UI',
    'ux_pattern', 'component-showcase + playground + docs'
) WHERE source_path LIKE '%yyc3-ai-platform-management%' AND code_tier IN ('T1','T2');

UPDATE kb_entries SET metadata = metadata || jsonb_build_object(
    'golden_template', true, 'template_id', 'tpl-mgmt-city',
    'template_category', 'management', 'template_rank', 13,
    'template_port', 3231, 'layout_type', 'sidebar-main',
    'ui_framework', 'shadcn/ui + Radix UI',
    'ux_pattern', 'map-view + device-list + alert-panel + analytics'
) WHERE source_path LIKE '%yyc3-platform-management-smart-city-platform%' AND code_tier IN ('T1','T2');

UPDATE kb_entries SET metadata = metadata || jsonb_build_object(
    'golden_template', true, 'template_id', 'tpl-mgmt-customer',
    'template_category', 'management', 'template_rank', 14,
    'template_port', 3232, 'layout_type', 'sidebar-main',
    'ui_framework', 'shadcn/ui + Radix UI',
    'ux_pattern', 'ticket-list + chat-widget + customer-profile + sla'
) WHERE source_path LIKE '%yyc3-office-customer-care-center%' AND code_tier IN ('T1','T2');

-- F 类: 组件库/工具
UPDATE kb_entries SET metadata = metadata || jsonb_build_object(
    'golden_template', true, 'template_id', 'tpl-comp-library',
    'template_category', 'component-library', 'template_rank', 15,
    'template_port', 3240, 'layout_type', 'sidebar-main',
    'ui_framework', 'shadcn/ui + Radix UI',
    'ux_pattern', 'catalog + playground + props-table + code-preview'
) WHERE source_path LIKE '%yyc3-ai-platform-lan%' AND code_tier IN ('T1','T2');

UPDATE kb_entries SET metadata = metadata || jsonb_build_object(
    'golden_template', true, 'template_id', 'tpl-tool-docker',
    'template_category', 'tools', 'template_rank', 16,
    'template_port', 3241, 'layout_type', 'sidebar-main',
    'ui_framework', 'shadcn/ui + Radix UI',
    'ux_pattern', 'stack-manager + logs + config-editor'
) WHERE source_path LIKE '%yyc3-tools-env-docker-stack%' AND code_tier IN ('T1','T2');

UPDATE kb_entries SET metadata = metadata || jsonb_build_object(
    'golden_template', true, 'template_id', 'tpl-tool-table',
    'template_category', 'tools', 'template_rank', 17,
    'template_port', 3242, 'layout_type', 'top-nav',
    'ui_framework', 'shadcn/ui + Radix UI',
    'ux_pattern', 'dropzone + preview + conversion + download'
) WHERE source_path LIKE '%yyc3-tools-easy-table-converter%' AND code_tier IN ('T1','T2');

-- G 类: 着陆页/SaaS
UPDATE kb_entries SET metadata = metadata || jsonb_build_object(
    'golden_template', true, 'template_id', 'tpl-landing-brand',
    'template_category', 'landing', 'template_rank', 18,
    'template_port', 3200, 'layout_type', 'full-page',
    'ui_framework', 'shadcn/ui + Radix UI',
    'ux_pattern', 'hero + features + pricing + testimonials + cta'
) WHERE source_path LIKE '%yyc3-ai-application-landing-page%' AND code_tier IN ('T1','T2');

UPDATE kb_entries SET metadata = metadata || jsonb_build_object(
    'golden_template', true, 'template_id', 'tpl-saas',
    'template_category', 'saas', 'template_rank', 19,
    'template_port', 3243, 'layout_type', 'sidebar-main',
    'ui_framework', 'shadcn/ui + Radix UI',
    'ux_pattern', 'tenant-switcher + billing + usage-dashboard + settings'
) WHERE source_path LIKE '%yyc3-platform-cloud-saas-3%' AND code_tier IN ('T1','T2');

UPDATE kb_entries SET metadata = metadata || jsonb_build_object(
    'golden_template', true, 'template_id', 'tpl-api-service',
    'template_category', 'api', 'template_rank', 20,
    'template_port', 3400, 'layout_type', 'sidebar-main',
    'ui_framework', 'shadcn/ui + Radix UI',
    'ux_pattern', 'api-docs + playground + key-manager + logs'
) WHERE source_path LIKE '%yyc3-platform-cloud-mdy-api%' AND code_tier IN ('T1','T2');
