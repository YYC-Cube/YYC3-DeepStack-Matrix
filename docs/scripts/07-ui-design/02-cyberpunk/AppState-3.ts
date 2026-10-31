interface AppState {
  mode: 'standalone' | 'widget';
  user: User;
  sessions: Session[];
  activeSession: Session | null;
  tools: Tool[];
  workflows: Workflow[];
  insights: Insight[];
  theme: Theme;
  settings: Settings;
}

interface CyberpunkTheme {
  neonIntensity: 'low' | 'medium' | 'high';
  glitchEffect: boolean;
  scanlines: boolean;
  circuitGrid: boolean;
  dataFlow: boolean;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
}
