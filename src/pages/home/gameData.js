import { GAME_TYPES } from "../../utils/gameTypes";
import { getTotalCountries, getTotalCountriesByContinent } from "../../hooks/useGameState";
import { getTotalFlagCountries, getTotalFlagCountriesByContinent } from "../../hooks/useFlagGameState";
import { getTotalCapitalCountries, getTotalCapitalCountriesByContinent } from "../../hooks/useCapitalsGameState";
import { CONTINENTS } from "../../utils/continents";
import { ASCENSION_PRESETS } from "../../utils/ascensionPresets";

const DIFFICULTY_COLORS = {
  Facile: "#4ade80",
  Moyen: "#00d4ff",
  Difficile: "#fbbf24",
  Impossible: "#f97316",
  Hardcore: "#f87171",
};

export function getDifficultiesForGame(gameId) {
  const countFn =
    gameId === GAME_TYPES.FLAGS || gameId === GAME_TYPES.MISSING_FLAG
      ? getTotalFlagCountries
      : gameId === GAME_TYPES.CAPITALS
        ? getTotalCapitalCountries
        : getTotalCountries;

  return [
    { name: "Facile", count: countFn("Facile"), color: DIFFICULTY_COLORS.Facile },
    { name: "Moyen", count: countFn("Moyen"), color: DIFFICULTY_COLORS.Moyen },
    { name: "Difficile", count: countFn("Difficile"), color: DIFFICULTY_COLORS.Difficile },
    { name: "Impossible", count: countFn("Impossible"), color: DIFFICULTY_COLORS.Impossible },
    { name: "Hardcore", count: countFn("Hardcore"), color: DIFFICULTY_COLORS.Hardcore },
  ];
}

export function getDifficultyCaps(gameId) {
  return getDifficultiesForGame(gameId)
    .filter((difficulty) => difficulty.name !== "Hardcore")
    .reduce((acc, difficulty) => {
      acc[difficulty.name] = difficulty.count;
      return acc;
    }, {});
}

export function getContinentsForGame(gameId) {
  const countFn =
    gameId === GAME_TYPES.FLAGS || gameId === GAME_TYPES.MISSING_FLAG
      ? getTotalFlagCountriesByContinent
      : gameId === GAME_TYPES.CAPITALS
        ? getTotalCapitalCountriesByContinent
        : getTotalCountriesByContinent;

  return CONTINENTS.map(c => ({ ...c, count: countFn(c.name) }));
}

export function buildPresetPhases(name) {
  const preset = ASCENSION_PRESETS.find((item) => item.name === name) ?? ASCENSION_PRESETS[1];
  return { ...preset.phases };
}

// Like the app (mobile/src/games.ts): `kind` 'daily' games have a daily challenge and an infinite mode, 'setup' and
// 'survival' games open their settings first (`dailyOnly`: no infinite mode). `multiId`: the game's id in multiplayer rooms (null: not playable there).
export const GAMES = [
  {
    id: GAME_TYPES.DAILY_CHALLENGE,
    kind: "daily",
    // Only a daily challenge: no infinite mode
    dailyOnly: true,
    multiId: null,
    icon: "🎯",
    titleKey: "games.daily_challenge.title",
    descKey: "games.daily_challenge.description",
    route: "/challenge",
    active: true,
  },
  {
    id: GAME_TYPES.PLACEMENT,
    kind: "setup",
    multiId: "placement",
    icon: "\u{1F30D}",
    titleKey: "games.placement.title",
    descKey: "games.placement.description",
    route: "/game",
    active: true,
  },
  {
    id: GAME_TYPES.HARDCORE,
    kind: "setup",
    multiId: null,
    icon: "💀",
    titleKey: "games.hardcore.title",
    descKey: "games.hardcore.description",
    route: "/game",
    active: true,
    noAscension: true,
  },
  {
    id: GAME_TYPES.FLAGS,
    kind: "setup",
    multiId: "flags",
    icon: "\u{1F6A9}",
    titleKey: "games.flags.title",
    descKey: "games.flags.description",
    route: "/flag-game",
    active: true,
  },
  {
    id: GAME_TYPES.MISSING_FLAG,
    kind: "setup",
    multiId: null,
    icon: "🧩",
    titleKey: "games.missing_flag.title",
    descKey: "games.missing_flag.description",
    route: "/missing-flag",
    active: true,
    noAscension: true,
  },
  {
    id: GAME_TYPES.CAPITALS,
    kind: "setup",
    multiId: "capitals",
    icon: "\u{1F3DB}\uFE0F",
    titleKey: "games.capitals.title",
    descKey: "games.capitals.description",
    route: "/capitals-game",
    active: true,
  },
  {
    id: GAME_TYPES.BORDER_GUESS,
    kind: "daily",
    multiId: "border_guess",
    icon: "\u{1F9ED}",
    titleKey: "games.border_guess.title",
    descKey: "games.border_guess.description",
    route: "/border-guess",
    active: true,
  },
  {
    id: GAME_TYPES.COUNTRY_CLUE,
    kind: "daily",
    multiId: "country_clue",
    icon: "\u{1F50E}",
    titleKey: "games.country_clue.title",
    descKey: "games.country_clue.description",
    route: "/country-clue",
    active: true,
  },
  {
    id: GAME_TYPES.VOYAGE_VOYAGE,
    kind: "daily",
    multiId: null,
    icon: "✈️",
    titleKey: "games.voyage_voyage.title",
    descKey: "games.voyage_voyage.description",
    route: "/voyage-voyage",
    cardType: "voyage",
    active: true,
  },
  {
    id: "ranking",
    kind: "daily",
    multiId: null,
    icon: "🏆",
    titleKey: "games.ranking.title",
    descKey: "games.ranking.description",
    route: "/ranking",
    cardType: "ranking",
    active: true,
  },
  {
    id: GAME_TYPES.QUIZ,
    kind: "daily",
    multiId: "quiz",
    icon: "🧠",
    titleKey: "games.quiz.title",
    descKey: "games.quiz.description",
    route: "/quiz",
    active: true,
  },
  {
    id: "placement",
    icon: "\u{1F4CD}",
    titleKey: "games.placement_map.title",
    descKey: "games.placement_map.description",
    route: null,
    active: false,
  },
  {
    id: GAME_TYPES.SURVIVAL,
    kind: "survival",
    multiId: "survival",
    icon: "\u2764\uFE0F",
    titleKey: "games.survival.title",
    descKey: "games.survival.description",
    route: "/survival",
    active: true,
  },
];
