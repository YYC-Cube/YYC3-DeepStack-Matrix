interface AnalysisModule {
  analyzeInput(input: UserInput): Promise<AnalysisResult>;
  detectIntent(text: string): Intent;
  extractEntities(text: string): Entity[];
  analyzeSentiment(text: string): SentimentScore;
  buildUserProfile(behavior: UserBehavior): UserProfile;
}

interface AnalysisResult {
  intent: Intent;
  entities: Entity[];
  sentiment: SentimentScore;
  context: Context;
  confidence: number;
}
