import chalk from "chalk";

export const KEY = {
  UP:     '\x1b[A',
  DOWN:   '\x1b[B',
  RIGHT:  '\x1b[C',
  LEFT:   '\x1b[D',
  ENTER:  '\r',
  CTRL_C: '\x03',
  ESCAPE: '\x1b',
} as const;

process.on('exit', () => {
  const stdin = process.stdin as NodeJS.ReadStream;
  try { if (stdin.isTTY) stdin.setRawMode(false); } catch {}
  process.stdout.write('\x1b[?25h');
});

export function clearScreen(): void {
  process.stdout.write('\x1b[2J\x1b[H');
}

export function hideCursor(): void {
  process.stdout.write('\x1b[?25l');
}

export function showCursor(): void {
  process.stdout.write('\x1b[?25h');
}

export function screenWidth(): number {
  return process.stdout.columns || 80;
}

export function bar(): string {
  return chalk.dim('─'.repeat(Math.max(screenWidth() - 4, 4)));
}

export async function readKey(): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin as NodeJS.ReadStream;
    if (stdin.isTTY && !stdin.isRaw) {
      stdin.setRawMode(true);
      stdin.resume();
    } else if (!stdin.isTTY) {
      stdin.resume();
    }
    stdin.once('data', (data: Buffer) => {
      const key = data.toString();
      if (key === KEY.CTRL_C) {
        const s = process.stdin as NodeJS.ReadStream;
        if (s.isTTY) s.setRawMode(false);
        showCursor();
        process.exit(0);
      }
      resolve(key);
    });
  });
}

export interface MenuItem {
  name: string;
  value: string;
  description?: string;
}

export async function selectMenu(options: {
  title: string;
  subtitle?: string;
  items: Array<MenuItem | 'separator'>;
  art?: string;
}): Promise<string> {
  const { title, subtitle, items, art } = options;
  const selectable = items.filter((i): i is MenuItem => i !== 'separator');
  let cursor = 0;

  hideCursor();

  for (;;) {
    clearScreen();
    const b = bar();
    if (art) process.stdout.write(chalk.yellow(art) + '\n');
    const sub = subtitle ? ` ${chalk.dim('─')} ${chalk.cyan(subtitle)}` : '';
    process.stdout.write(`\n  ${chalk.bold.yellow(title)}${sub}\n  ${b}\n\n`);

    for (const item of items) {
      if (item === 'separator') {
        process.stdout.write(`  ${chalk.dim('──────────────────────')}\n`);
        continue;
      }
      const sel = selectable[cursor] === item;
      const pfx = sel ? chalk.cyan('  ❯ ') : '    ';
      const name = sel ? chalk.bold.cyan(item.name) : chalk.white(item.name);
      const desc = item.description ? chalk.dim(`  ${item.description}`) : '';
      process.stdout.write(`${pfx}${name}${desc}\n`);
    }

    process.stdout.write(`\n  ${b}\n`);
    process.stdout.write(
      `  ${chalk.dim('↑/↓')} Move   ${chalk.dim('Enter')} Select   ${chalk.dim('Ctrl+C')} Exit\n`
    );

    const key = await readKey();
    if      (key === KEY.UP)    cursor = (cursor - 1 + selectable.length) % selectable.length;
    else if (key === KEY.DOWN)  cursor = (cursor + 1) % selectable.length;
    else if (key === KEY.ENTER) { showCursor(); return selectable[cursor].value; }
  }
}
