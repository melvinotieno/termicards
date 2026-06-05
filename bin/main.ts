import chalk from "chalk";
import figlet from "figlet";
import { selectMenu, clearScreen, showCursor, hideCursor, readKey, bar, KEY } from "@/tui";
import { readSave } from "@/save";
import { readStats } from "@/stats";
import { readSettings, writeSettings, type Settings } from "@/settings";
import { RULES } from "@/rules";

type SaveInfo = { key: string; label: string; savedAt: string };

// ── How to Play ──────────────────────────────────────────────────────────────

async function showRules(gameKey: string): Promise<void> {
  const rules = RULES[gameKey];
  if (!rules) return;

  const sections = rules.sections;
  let page = 0;
  hideCursor();

  for (;;) {
    clearScreen();
    const b = bar();
    process.stdout.write(
      `\n  ${chalk.bold.yellow("TermiCards")} ${chalk.dim("─")} ${chalk.cyan(`How to Play: ${rules.title}`)}\n  ${b}\n\n`
    );

    const section = sections[page];
    process.stdout.write(`  ${chalk.bold.white(section.heading)}\n\n`);
    for (const line of section.body.split("\n")) {
      process.stdout.write(`  ${chalk.white(line)}\n`);
    }

    process.stdout.write(`\n  ${b}\n  `);
    process.stdout.write(chalk.dim(`${page + 1} / ${sections.length}`));
    if (page > 0) process.stdout.write(`   ${chalk.dim("↑")} Prev`);
    if (page < sections.length - 1) process.stdout.write(`   ${chalk.dim("↓")} Next`);
    process.stdout.write(`   ${chalk.dim("Q / Esc")} Back\n`);

    const key = await readKey();
    if ((key === KEY.UP || key === KEY.LEFT) && page > 0) {
      page--;
    } else if ((key === KEY.DOWN || key === KEY.RIGHT) && page < sections.length - 1) {
      page++;
    } else if (key === "q" || key === "Q" || key === KEY.ESCAPE) {
      showCursor();
      return;
    }
  }
}

async function selectRules(art: string): Promise<void> {
  const answer = await selectMenu({
    art,
    title: "TermiCards",
    subtitle: "How to Play",
    items: [
      { name: "Crazy Eights", value: "crazy_eights", description: "The classic wild-card game." },
      { name: "Spades",       value: "spades",        description: "Trump-based trick-taking game." },
      "separator",
      { name: "Back",         value: "back" },
    ],
  });

  if (answer !== "back") await showRules(answer);
}

// ── Statistics ───────────────────────────────────────────────────────────────

async function showStats(): Promise<void> {
  const stats = await readStats();
  hideCursor();
  clearScreen();
  const b = bar();

  process.stdout.write(
    `\n  ${chalk.bold.yellow("TermiCards")} ${chalk.dim("─")} ${chalk.cyan("Statistics")}\n  ${b}\n\n`
  );

  const ce = stats.crazy_eights;
  const sp = stats.spades;
  const ceRate = ce.gamesPlayed > 0 ? Math.round((ce.wins / ce.gamesPlayed) * 100) : 0;
  const spRate = sp.gamesPlayed > 0 ? Math.round((sp.wins / sp.gamesPlayed) * 100) : 0;

  process.stdout.write(`  ${chalk.bold.cyan("Crazy Eights")}\n`);
  process.stdout.write(
    `    Played ${chalk.white(String(ce.gamesPlayed))}  ·  ` +
    `Wins ${chalk.green(String(ce.wins))}  ·  ` +
    `Losses ${chalk.red(String(ce.losses))}  ·  ` +
    `Win rate ${chalk.yellow(`${ceRate}%`)}\n\n`
  );

  process.stdout.write(`  ${chalk.bold.cyan("Spades")}\n`);
  process.stdout.write(
    `    Played ${chalk.white(String(sp.gamesPlayed))}  ·  ` +
    `Wins ${chalk.green(String(sp.wins))}  ·  ` +
    `Losses ${chalk.red(String(sp.losses))}  ·  ` +
    `Win rate ${chalk.yellow(`${spRate}%`)}\n`
  );
  process.stdout.write(`    High score ${chalk.yellow(String(sp.highScore))}\n\n`);

  process.stdout.write(`  ${b}\n  ${chalk.dim("Press any key…")}\n`);
  await readKey();
  showCursor();
}

// ── Settings ─────────────────────────────────────────────────────────────────

type SettingsRow = {
  label: string;
  values: readonly string[];
  get: (s: Settings) => string;
  set: (s: Settings, v: string) => void;
};

const SETTINGS_ROWS: SettingsRow[] = [
  {
    label: "Animation Speed",
    values: ["slow", "normal", "fast"],
    get: (s) => s.animationSpeed,
    set: (s, v) => { s.animationSpeed = v as Settings["animationSpeed"]; },
  },
  {
    label: "Highlight Valid Plays",
    values: ["on", "off"],
    get: (s) => s.highlightValidPlays ? "on" : "off",
    set: (s, v) => { s.highlightValidPlays = v === "on"; },
  },
  {
    label: "Auto-save on Quit",
    values: ["on", "off"],
    get: (s) => s.autoSaveOnQuit ? "on" : "off",
    set: (s, v) => { s.autoSaveOnQuit = v === "on"; },
  },
];

async function showSettings(): Promise<void> {
  const settings = await readSettings();
  let cursor = 0;
  hideCursor();

  for (;;) {
    clearScreen();
    const b = bar();
    process.stdout.write(
      `\n  ${chalk.bold.yellow("TermiCards")} ${chalk.dim("─")} ${chalk.cyan("Settings")}\n  ${b}\n\n`
    );

    for (let i = 0; i < SETTINGS_ROWS.length; i++) {
      const row = SETTINGS_ROWS[i];
      const sel = cursor === i;
      const pfx   = sel ? chalk.cyan("  ❯ ") : "    ";
      const label = sel ? chalk.bold.cyan(row.label) : chalk.white(row.label);
      const cur   = row.get(settings);
      const vals  = row.values.map((v) =>
        v === cur ? chalk.bold.white(`[${v}]`) : chalk.dim(v)
      ).join("  ");
      process.stdout.write(`${pfx}${label.padEnd(sel ? 42 : 28)}${vals}\n`);
    }

    process.stdout.write(`\n  ${b}\n`);
    process.stdout.write(
      `  ${chalk.dim("↑/↓")} Move   ${chalk.dim("← / →")} Change   ${chalk.dim("S / Esc")} Save & Back\n`
    );

    const key = await readKey();
    if (key === KEY.UP) {
      cursor = (cursor - 1 + SETTINGS_ROWS.length) % SETTINGS_ROWS.length;
    } else if (key === KEY.DOWN) {
      cursor = (cursor + 1) % SETTINGS_ROWS.length;
    } else if (key === KEY.LEFT || key === KEY.RIGHT) {
      const row = SETTINGS_ROWS[cursor];
      const cur = row.get(settings);
      const idx = row.values.indexOf(cur);
      const step = key === KEY.LEFT ? -1 : 1;
      row.set(settings, row.values[(idx + step + row.values.length) % row.values.length]);
    } else if (key === "s" || key === "S" || key === KEY.ESCAPE) {
      await writeSettings(settings);
      showCursor();
      return;
    }
  }
}

// ── Game selection ────────────────────────────────────────────────────────────

async function selectGame(art: string): Promise<void> {
  const answer = await selectMenu({
    art,
    title: "TermiCards",
    subtitle: "Select a Game",
    items: [
      { name: "Crazy Eights", value: "crazy_eights", description: "The classic game where eights are wild." },
      { name: "Spades",       value: "spades",        description: "Trick-taking game where spades are always trump." },
      "separator",
      { name: "Back",         value: "back" },
    ],
  });

  if (answer === "back") return;

  try {
    const module = await import(`@/${answer}`);
    if (module.default) {
      const game = new module.default();
      await game.play();
    } else {
      throw new Error("Game not implemented");
    }
  } catch (error) {
    clearScreen();
    process.stdout.write(chalk.red(`\n  Error: ${error}\n\n`));
    await new Promise((r) => setTimeout(r, 2000));
  }
}

// ── Continue game ─────────────────────────────────────────────────────────────

async function continueGame(art: string, saves: SaveInfo[]): Promise<void> {
  let key: string;

  if (saves.length === 1) {
    key = saves[0].key;
  } else {
    key = await selectMenu({
      art,
      title: "TermiCards",
      subtitle: "Continue Game",
      items: saves.map((s) => ({
        name: s.label,
        value: s.key,
        description: `saved ${new Date(s.savedAt).toLocaleString()}`,
      })),
    });
  }

  try {
    const module = await import(`@/${key}`);
    if (module.default) {
      const game = new module.default();
      await game.play(true);
    } else {
      throw new Error("Game not implemented");
    }
  } catch (error) {
    clearScreen();
    process.stdout.write(chalk.red(`\n  Error: ${error}\n\n`));
    await new Promise((r) => setTimeout(r, 2000));
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const art = await new Promise<string>((resolve) =>
    figlet("TermiCards", (_, result) => resolve(result ?? "TermiCards"))
  );

  while (true) {
    const rawSaves = await Promise.all([
      readSave("crazy_eights").then((s) =>
        s ? { key: "crazy_eights", label: "Crazy Eights", savedAt: s.savedAt } : null
      ),
      readSave("spades").then((s) =>
        s ? { key: "spades", label: "Spades", savedAt: s.savedAt } : null
      ),
    ]);
    const saves = rawSaves.filter((s): s is SaveInfo => s !== null);

    const menuItems: Array<{ name: string; value: string; description?: string } | "separator"> = [
      { name: "New Game",      value: "new_game" },
      ...(saves.length > 0
        ? [{ name: "Continue Game", value: "continue_game" } as { name: string; value: string }]
        : []),
      "separator",
      { name: "How to Play",  value: "how_to_play" },
      { name: "Statistics",   value: "statistics" },
      { name: "Settings",     value: "settings" },
      "separator",
      { name: "Exit",         value: "exit" },
    ];

    const answer = await selectMenu({ art, title: "TermiCards", items: menuItems });

    if      (answer === "exit")          break;
    else if (answer === "new_game")      await selectGame(art);
    else if (answer === "continue_game") await continueGame(art, saves);
    else if (answer === "how_to_play")   await selectRules(art);
    else if (answer === "statistics")    await showStats();
    else if (answer === "settings")      await showSettings();
  }

  clearScreen();
  showCursor();
}

main();
