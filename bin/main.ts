import select, { Separator } from "@inquirer/select";
import chalk from "chalk";
import figlet from "figlet";

const games = [
  {
    name: "Crazy Eights",
    value: "crazy_eights",
    description: "The classic game where eights are wild.",
  },
  {
    name: "Spades",
    value: "spades",
    description: "Trick-taking game where spades are always trump.",
  },
  new Separator(),
  { name: "Back", value: "back" },
];

async function selectGame() {
  const answer = await select({
    message: "Select a game:",
    choices: games,
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
    console.error(chalk.red(error));
  }
}

async function mainMenu() {
  while (true) {
    const answer = await select({
      message: "What would you like to do?",
      choices: [
        { name: "New Game", value: "new_game" },
        new Separator(),
        { name: "Exit", value: "exit" },
      ],
    });

    if (answer === "exit") break;

    await selectGame();
  }
}

function main() {
  const title = "TermiCards";

  figlet(title, (_, result) => {
    console.log(chalk.yellow(result ?? title));
    mainMenu();
  });
}

main();
