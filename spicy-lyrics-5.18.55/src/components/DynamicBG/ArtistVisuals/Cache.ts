import { GetExpireStore } from "@spikerko/tools/Cache";

const CacheStore = GetExpireStore("SpicyLyrics_ArtistVisuals", 3, {
  Unit: "Days",
  Duration: 3,
});
export default CacheStore;
