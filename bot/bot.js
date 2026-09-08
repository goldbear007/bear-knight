import "dotenv/config";
import { Bot, InlineKeyboard } from "grammy";

const token = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;

if (!token) {
  console.error("Нет BOT_TOKEN. Скопируй .env.example в .env и вставь токен от @BotFather.");
  process.exit(1);
}
if (!webAppUrl || !webAppUrl.startsWith("https://")) {
  console.error("WEBAPP_URL должен быть публичным https-адресом, где лежит игра.");
  process.exit(1);
}

const bot = new Bot(token);

const playKeyboard = new InlineKeyboard().webApp("Войти в Иссохший лес", webAppUrl);

const INTRO = [
  "*Медвежий Рыцарь: Тьма Севера*",
  "",
  "Ты — рыцарь в медвежьем доспехе. Север пал, и Медвежий Король ждёт тебя в своей цитадели.",
  "",
  "• Пять земель, боссы и лут с врагов",
  "• Три ветки прокачки: Урса, Ловчий, Умбра",
  "• Магазин оружия и брони",
  "• Прогресс хранится в облаке Telegram и переносится между устройствами",
].join("\n");

bot.command("start", (ctx) =>
  ctx.reply(INTRO, { parse_mode: "Markdown", reply_markup: playKeyboard })
);

bot.command("play", (ctx) => ctx.reply("Костёр разожжён.", { reply_markup: playKeyboard }));

bot.command("help", (ctx) =>
  ctx.reply(
    [
      "Управление на телефоне — экранные кнопки, на компьютере:",
      "A/D — движение, W или пробел — прыжок, S — вниз",
      "J — атака, K — тяжёлый удар, Shift — рывок",
      "Q — рёв, E — теневой сгусток, R — зелье, F — действие, Esc — пауза",
      "",
      "Прогресс сохраняется автоматически у каждого костра и при выходе с уровня.",
    ].join("\n"),
    { reply_markup: playKeyboard }
  )
);

bot.on("message", (ctx) => ctx.reply("Нажми кнопку, чтобы играть.", { reply_markup: playKeyboard }));

bot.catch((err) => console.error("Ошибка бота:", err));

// The menu button next to the input field opens the game directly.
await bot.api.setChatMenuButton({
  menu_button: { type: "web_app", text: "Играть", web_app: { url: webAppUrl } },
});

await bot.api.setMyCommands([
  { command: "start", description: "Начать игру" },
  { command: "play", description: "Открыть игру" },
  { command: "help", description: "Управление" },
]);

console.log("Бот запущен. Игра:", webAppUrl);
bot.start();
