export const PRICE_CHANNELS = [
  "FACTORY",
  "BRANCH",
  "AGENT",
  "TRUCK",
] as const;

export type PriceChannel = (typeof PRICE_CHANNELS)[number];

export const PRICE_CHANNEL_OPTIONS = PRICE_CHANNELS.map((channel) => ({
  label: channel,
  value: channel,
}));
