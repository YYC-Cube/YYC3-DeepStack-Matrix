// /theme/index.ts

export const theme = {
  colors: {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  typography: {
    fontFamily: {
      mono: 'Fira Code, Monaco, Consolas',
      sans: 'Inter, system-ui',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      md: '1rem',
      lg: '1.125rem',
    },
  },
};

// 使用示例：
const Button = styled.button`
  background-color: ${theme.colors.primary};
  padding: ${theme.spacing.md};
  font-family: ${theme.typography.fontFamily.mono};
`;
