import { addonProfiles } from "./profiles";
import type { AddonProfile, GeneratorMode } from "./types";

export function buildGeneratorPrompt({
  mode,
  topic,
  profile,
}: {
  mode: GeneratorMode;
  topic: string;
  profile?: AddonProfile;
}) {
  if (mode !== "addon-beta") {
    return topic;
  }

  const selectedProfile = profile ?? "strategic-article";
  const profileConfig = addonProfiles[selectedProfile];

  return `
${profileConfig.systemPrompt}

Topic:
${topic}

Instructions:
- Keep the article commercially useful
- Use clean, readable headings
- Make the output practical and publishable
- Return valid JSON only
`;
}
