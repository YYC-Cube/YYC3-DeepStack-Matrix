module.exports = {
  rules: {
    'header/header': [
      'error',
      'block',
      [
        '*',
        {
          pattern: ' file: .+\\n description: .+\\n author: .+\\n version: .+\\n created: .+\\n updated: .+\\n status: .+\\n tags: .+',
          template: `/**
 * file: FILENAME
 * description: DESCRIPTION
 * author: YanYuCloudCube Team
 * version: v1.0.0
 * created: YYYY-MM-DD
 * updated: YYYY-MM-DD
 * status: active
 * tags: [TAG1],[TAG2],[TAG3]
 */`,
        },
      ],
    ],
  },
};
