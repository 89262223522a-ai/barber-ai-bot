

/план — составить план продвижения`
  );
});

bot.onText(/\/оффер/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "Напишите: город, район, среднюю цену стрижки, вашу акцию и кому хотите продавать услугу. Я подготовлю несколько сильных офферов."
  );
});

bot.onText(/\/реклама/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "Напишите, где будет реклама (Telegram, VK, Яндекс), город/район, бюджет, услугу и акцию. Я создам варианты объявлений."
  );
});

bot.onText(/\/пост/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "Напишите тему поста, город и цель: привлечь новых клиентов, вернуть старых или рассказать об акции."
  );
});

bot.onText(/\/план/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "Напишите город, район, месячный рекламный бюджет, средний чек и сколько новых клиентов хотите получать. Я составлю план."
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

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      instructions: systemPrompt,
      input: text,
    });

    const answer =
      response.output_text ||
      "Не удалось сформировать ответ. Попробуйте написать запрос ещё раз.";

    // Telegram ограничивает длину одного сообщения.
    const parts = answer.match(/[\s\S]{1,4000}/g) || [];

    for (const part of parts) {
      await bot.sendMessage(chatId, part);
    }
  } catch (error) {
    console.error(error);

    await bot.sendMessage(
      chatId,
      "Произошла техническая ошибка. Проверьте, добавлены ли ключ OpenAI и токен Telegram в переменные окружения BotHost."
    );
  }
});

console.log("Бот запущен");
