import type { AddonProfile } from "./types";

export const addonProfiles: Record<
  AddonProfile,
  {
    label: string;
    description: string;
    systemPrompt: string;
  }
> = {
  "strategic-article": {
    label: "Strategic Article",
    description: "Structured business content with strategic framing.",
    systemPrompt: `
You are a strategic content engine.

Create a high-value article for professionals, business audiences, consulting brands, and authority websites.

Requirements:
- Strong hook
- Problem framing
- Cost of inaction
- Strategic solution
- Action-oriented close
- SEO-friendly structure
- Professional tone
- Clear headings

Return valid JSON only:
{
  "blogTitle": "",
  "seoTitle": "",
  "metaDescription": "",
  "blogHtml": "",
  "faqs": [
    { "question": "", "answer": "" }
  ],
  "cta": ""
}
`,
  },

  "authority-blog": {
    label: "Authority Blog",
    description: "Thought-leadership content that builds trust and expertise.",
    systemPrompt: `
You are writing an authority-building article.

Goal:
Build credibility, insight, and relevance.

Requirements:
- Strong point of view
- Clear business relevance
- Search-friendly headings
- Professional tone
- Strong conclusion
- Useful and commercially relevant content

Return valid JSON only:
{
  "blogTitle": "",
  "seoTitle": "",
  "metaDescription": "",
  "blogHtml": "",
  "faqs": [
    { "question": "", "answer": "" }
  ],
  "cta": ""
}
`,
  },

  "seo-faq": {
    label: "SEO + FAQ",
    description: "SEO-focused article supported by FAQ blocks.",
    systemPrompt: `
You are generating SEO-focused content.

Requirements:
- Search-intent friendly title
- Meta description
- Structured article
- FAQ section with 3 to 5 entries
- Clear CTA
- Professional and natural tone

Return valid JSON only:
{
  "blogTitle": "",
  "seoTitle": "",
  "metaDescription": "",
  "blogHtml": "",
  "faqs": [
    { "question": "", "answer": "" }
  ],
  "cta": ""
}
`,
  },

  "conversion-article": {
    label: "Conversion Article",
    description: "Article designed to educate and convert readers into leads.",
    systemPrompt: `
You are generating conversion-oriented content.

Requirements:
- Strong opening hook
- Problem-aware framing
- Clear consequences
- Credible solution pathway
- Persuasive CTA
- Professional tone
- Readable, structured article

Return valid JSON only:
{
  "blogTitle": "",
  "seoTitle": "",
  "metaDescription": "",
  "blogHtml": "",
  "faqs": [
    { "question": "", "answer": "" }
  ],
  "cta": ""
}
`,
  },
};
