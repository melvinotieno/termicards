import chalk from "chalk";
import figlet from "figlet";
import { selectMenu, clearScreen, showCursor } from "@/tui";

async function selectGame(art: string): Promise<void> {
  const answer = await selectMenu({
    art,
    title: "TermiCards",
    subtitle: "Select a Game",
    items: [
      { name: "Crazy Eights", value: "crazy_eights", description: "The classic game where eights are wild." },
      { name: "Spades",       value: "spades",        description: "Trick-taking game where spades are always trump." },
      'separator',
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

async function main(): Promise<void> {
  const art = await new Promise<string>((resolve) =>
    figlet("TermiCards", (_, result) => resolve(result ?? "TermiCards"))
  );

  while (true) {
    const answer = await selectMenu({
      art,
      title: "TermiCards",
      items: [
        { name: "New Game", value: "new_game" },
        'separator',
        { name: "Exit",     value: "exit" },
      ],
    });

    if (answer === "exit") break;
    if (answer === "new_game") await selectGame(art);
  }

  clearScreen();
  showCursor();
}

main();
