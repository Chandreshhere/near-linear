/**
 * Seed data matching the reference captures (MASTER_PROMPT.md §26) so golden
 * screenshots stay comparable. Fixtures only — never hardcode in components.
 */

export interface SeedTeam {
  id: string;
  key: string;
  name: string;
  icon: string; // sprite symbol name
  color: string;
}

export const WORKSPACE = {
  slug: "synquic-labs",
  name: "Synquic",
  initials: "SY",
  avatarColor: "lch(70% 60 350)",
};

export const TEAMS: SeedTeam[] = [
  { id: "t-trendzo", key: "TRENDZO", name: "Trendzo", icon: "Team", color: "#00a0ff" },
  { id: "t-pgme", key: "PGME", name: "PGME", icon: "Feather", color: "#008fff" },
  { id: "t-shrujan", key: "SHR", name: "Shrujan", icon: "Team", color: "#00aa00" },
  { id: "t-icon", key: "ICO", name: "Icon", icon: "Chip", color: "#f85911" },
  { id: "t-trikaal", key: "TRI", name: "Trikaal", icon: "Europe", color: "#789c00" },
  { id: "t-tiffsy", key: "TIF", name: "Tiffsy", icon: "Radar", color: "#d67600" },
  { id: "t-homingo", key: "HOM", name: "Homingo", icon: "Home", color: "#00b187" },
];

export const USERS = [
  {
    id: "u-yk",
    name: "yatharth.kaushal@synquic.in",
    initials: "YK",
    avatarColor: "lch(70% 60 210)",
  },
  {
    id: "u-cd",
    name: "chandresh.delwar@synquic.in",
    initials: "CD",
    avatarColor: "lch(60% 60 140)",
  },
];
