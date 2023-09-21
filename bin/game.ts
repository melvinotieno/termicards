class Game {
  constructor() {
    console.log("Game constructor");
  }

  private menu(): void {
    const commands = [
      { id: 1, name: "Crazy 8's", description: "Play Crazy 8's" },
      { id: 2, name: "Rules", description: "View the rules" },
      { id: 3, name: "Exit", description: "Exit the game" },
    ];

    console.table(
      commands.map((command) => {
        return {
          "": command.id,
          Game: command.name,
          Description: command.description,
        };
      })
    );
  }

  start(): void {
    this.menu();
  }
}

const game = new Game();
game.start();
