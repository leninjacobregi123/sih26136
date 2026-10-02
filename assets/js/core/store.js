// Data more than one part of a page needs (the shell's search and work count, the page's own
// list), fetched once per page load.
import { api } from "./api.js";

let pilotsP;
export const pilots = (refresh = false) => {
  if (!pilotsP || refresh) pilotsP = api("/api/passports").then((r) => r.passports);
  return pilotsP;
};
