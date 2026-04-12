export type SiteProfile = {
  siteUrl: string;
  industry: string;
  audiences: string[];
  markets: string[];
  topics: string[];
  competitors: { name: string; url: string; confidence: "low" | "medium" | "high"; note: string }[];
  needsClarification: boolean;
  suggestedPromptQuestions: string[];
};

export type StoredKwState = {
  topic?: string;
  selectedTopic?: string;
  audience?: string;
  region?: string;
  seo?: any;
  geo?: any;
  aeo?: any;
  _savedAt?: string;
};

export type TrendSignal = {
  id: string;
  source: "google-trends" | "news" | "reddit" | "industry" | "site" | "keywords";
  topic: string;
  summary?: string;
  url?: string;
  audienceFit?: string[];
  region?: string;
  freshnessScore: number;
  relevanceScore: number;
  confidenceScore: number;
  publishedAt?: string;
};

export type TrendCard = {
  id: string;
  title: string;
  whyItMatters: string;
  suggestedAngle: string;
  audience: string;
  region: string;
  sourceTopic: string;
  confidence: "low" | "medium" | "high";
  sourceLabel: string;
  url?: string;
};
