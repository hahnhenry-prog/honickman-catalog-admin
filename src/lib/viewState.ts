import { Tab, TabViewState } from "../types";

export const SS_KEY = "catalogAdminViewState";

export function loadViewState(): Record<string, TabViewState> {
  try { return JSON.parse(sessionStorage.getItem(SS_KEY) ?? "{}"); } catch { return {}; }
}

export function saveViewState(state: Record<string, TabViewState>) {
  try { sessionStorage.setItem(SS_KEY, JSON.stringify(state)); } catch {}
}

export function getTabDefaults(tab: Tab): TabViewState {
  return { sortLevels: [], colFilters: { status: ["Active"] }, colExcludes: {}, pageSize: 25, page: 0 };
}

