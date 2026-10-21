export const HOME_COMMUNITY_CHANGED = "home-community:changed";
export const HOME_COMMUNITY_RESET = "home-community:reset";

export const notifyHomeCommunityChanged = () =>
  window.dispatchEvent(new Event(HOME_COMMUNITY_CHANGED));

export const resetHomeCommunity = () =>
  window.dispatchEvent(new Event(HOME_COMMUNITY_RESET));
