export type GeneratorMode = "standard" | "addon-beta";

export type AddonProfile =
  | "strategic-article"
  | "authority-blog"
  | "seo-faq"
  | "conversion-article";

export type AddonRequest = {
  mode?: GeneratorMode;
  topic?: string;
  keyword?: string;
  profile?: AddonProfile;
};
