export const SITE_NAME = "Season Card";
export const SITE_DOMAIN = "seasoncard.app";
export const SELLER = {
  legalName: "Nazarban Analytics FZCO",
  address: "IFZA, Dubai Silicon Oasis, Dubai, United Arab Emirates",
  shortAddress: "IFZA, Dubai, UAE",
};
// TODO(owner): confirm the support inbox before launch.
export const SUPPORT_EMAIL = "support@seasoncard.app";

export function publicSiteUrl(): string {
  return (process.env.SITE_URL || "https://seasoncard.app").replace(/\/+$/, "");
}
