import select, { Separator } from "@inquirer/select";
import chalk from "chalk";
import figlet from "figlet";

const choices = [
  {
    name: "Crazy Eights",
    value: "crazy_eights",
    description: "The classic game where eights are wild.",
  },
  new Separator(),
  {
    name: "Exit",
    value: "exit",
  },
];

/**
 * Display the menu and start the selected game.
 */
async function menu() {
  const answer = await select({
    message: "Which game would you like to play?",
    choices: choices,
  });

  if (answer === "exit") return;

  try {
    const module = await import(`@/${answer}`);

    if (module.default) {
      const game = new module.default();
      game.play();
    } else {
      throw new Error("Game not implemented");
    }
  } catch (error) {
    console.error(chalk.red(error));
  }
}

/**
 * Main entry point for the application.
 */
function main() {
  let title = "TermiCards";

  figlet(title, (_, result) => {
    console.log(chalk.yellow(result ?? title));
    menu();
  });
}

main();
