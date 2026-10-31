interface LearningModule {
  learnFromFeedback(feedback: UserFeedback): void;
  personalizeExperience(user: User): void;
  updateKnowledgeGraph(data: KnowledgeData): void;
  fineTuneModel(trainingData: TrainingData): Promise<void>;
  getUserInsights(user: User): UserInsights;
}

interface UserInsights {
  preferences: UserPreferences;
  behaviorPatterns: BehaviorPattern[];
  recommendations: Recommendation[];
}
