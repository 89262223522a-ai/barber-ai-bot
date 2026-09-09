const TelegramBot = require("node-telegram-bot-api");
const crypto = require("crypto");

const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const gigaCredentials = process.env.GIGACHAT_CREDENTIALS;

if (!telegramToken) {
  throw new Error("Не найдена переменная TELEGRAM_BOT_TOKEN");
}

if (!gigaCredentials) {
  throw new Error("Не найдена переменная GIGACHAT_CREDENTIALS");
}

const bot = new TelegramBot(telegramToken, {
  polling: true,
});

let accessToken = null;
let accessTokenExpiresAt = 0;

const systemPrompt = `
Ты — русскоязычный ИИ-маркетолог и ассистент владельца барбершопа.

Твоя задача — помогать привлекать клиентов на мужские стрижки законными, этичными и практичными способами.

Ты умеешь:
— определять целевую аудиторию;
— создавать акции и привлекательные предложения;
— писать рекламные объявления для Telegram, VK, Яндекс Директа, Яндекс Карт и 2ГИС;
— создавать посты и сценарии коротких видео;
— предлагать локальные каналы продвижения и партнёрства;
— составлять планы продвижения на 7 или 30 дней;
— создавать вежливые скрипты для общения с клиентами;
— анализировать результаты рекламы, если пользователь передал цифры.

Правила:
1. Отвечай по-русски и объясняй всё простым языком.
2. Предлагай конкретные действия.
3. Если не хватает важных данных, задай до 3 коротких вопросов.
4. Не предлагай покупать базы номеров, собирать личные контакты без согласия, отправлять спам или нарушать правила рекламных площадок.
5. Если пользователь просит рекламный текст, предложи минимум 3 варианта.
6. В конце большого ответа добавляй раздел «Что сделать сегодня» с 3 ближайшими действиями.
`;

async function getAccessToken() {
  const now = Date.now();

  if (accessToken && now < accessTokenExpiresAt) {
    return accessToken;
  }

  const response = await fetch(
    "https://ngw.devices.sberbank.ru:9443/api/v2/oauth",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        RqUID: crypto.randomUUID(),
        Authorization: `Basic ${gigaCredentials}`,
      },
      body: "scope=GIGACHAT_API_PERS",
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Ошибка авторизации GigaChat: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();

  accessToken = data.access_token;

  // Обновляем токен заранее, до окончания его действия.
  accessTokenExpiresAt =
    Date.now() + Math.max((data.expires_at || 1800000) - 60000, 60000);

  return accessToken;
}

async function askGigaChat(userText) {
  const token = await getAccessToken();

  const response = await fetch(
    "https://api.giga.chat/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model: "GigaChat",
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userText,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Ошибка GigaChat: ${response.status} ${errorText}`
    );
  }

  const data = await response.json();

  return (
    data.choices?.[0]?.message?.content ||
    "GigaChat не вернул текст ответа."
  );
}

bot.onText(/\/start/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    `Привет! Я ИИ-ассистент для продвижения барбершопа. 💈

Напишите мне задачу обычным сообщением. Например:

«Нужно больше клиентов на мужскую стрижку. Город Москва, район Сокол. Бюджет 20 000 рублей. Первое посещение — скидка 15%.»

Я помогу создать рекламу, офферы, посты, сценарии общения и план продвижения.

Команды:
/оффер — придумать акцию
/реклама — написать объявления
/пост — создать пост
/план — составить план продвижения`
  );
});

bot.onText(/\/оффер/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    "Напишите город, район, цену стрижки, вашу акцию и желаемую аудиторию."
  );
});

bot.onText(/\/реклама/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    "Напишите рекламную площадку, город, район, бюджет, услугу и акцию."
  );
});

bot.onText(/\/пост/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    "Напишите тему поста и его цель: новые клиенты, возврат старых клиентов или продвижение акции."
  );
});

bot.onText(/\/план/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    "Напишите город, район, рекламный бюджет, средний чек и желаемое количество новых клиентов."
  );
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (!text || text.startsWith("/")) {
    return;
  }

  try {
    await bot.sendChatAction(chatId, "typing");

    const answer = await askGigaChat(text);
    const parts = answer.match(/[\s\S]{1,4000}/g) || [];

    for (const part of parts) {
      await bot.sendMessage(chatId, part);
    }
  } catch (error) {
    console.error(error);

    await bot.sendMessage(
      chatId,
      "Произошла ошибка при обращении к GigaChat. Проверьте ключ GigaChat и переменные окружения в BotHost."
    );
  }
});

console.log("Бот запущен");
