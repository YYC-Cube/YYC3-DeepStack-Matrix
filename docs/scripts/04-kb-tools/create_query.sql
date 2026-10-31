CREATE TABLE kb_entries (
    id              serial PRIMARY KEY,
    source_path     text NOT NULL,
    source_type     varchar(50) NOT NULL,
    title           text,
    content         text NOT NULL,
    content_summary text,
    embedding       vector(1024),
    tags            text[],
    category        varchar(100),
    skill_name      varchar(200),
    metadata        jsonb DEFAULT '{}'::jsonb,
    content_hash    text,
    tech_stack      varchar(50),
    code_tier       char(2),
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

-- 索引
CREATE INDEX idx_kb_category ON kb_entries(category);
CREATE INDEX idx_kb_skill ON kb_entries(skill_name);
CREATE INDEX idx_kb_source ON kb_entries(source_path);
CREATE INDEX idx_kb_type ON kb_entries(source_type);
CREATE INDEX idx_kb_content_hash ON kb_entries(content_hash);
CREATE INDEX idx_kb_tech_stack ON kb_entries(tech_stack);
CREATE INDEX idx_kb_code_tier ON kb_entries(code_tier);
