/**
 * Сервис голосового ввода (Web Speech API) и парсинга параметров ремонта через DeepSeek API.
 */

export async function parseRoomVoiceTextWithDeepSeek(spokenText, customApiKey) {
  const apiKey = customApiKey || import.meta.env.VITE_DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('Не указан ключ DeepSeek API (VITE_DEEPSEEK_API_KEY или в настройках приложения).');
  }

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Ты строительный инженер-сметчик. Извлеки из голосовой заметки параметры помещения и верни СТРОГО валидный JSON со следующими полями:
          {
            "name": "название комнаты или объекта",
            "length": число_длина_в_метрах (по умолчанию 5.2),
            "width": число_ширина_в_метрах (по умолчанию 3.8),
            "height": число_высота_в_метрах (по умолчанию 2.75),
            "doors": число_дверей (по умолчанию 1),
            "windows": число_окон (по умолчанию 1),
            "screedThickness": число_толщина_стяжки_мм (от 10 до 100, по умолчанию 45),
            "plasterThickness": число_толщина_штукатурки_мм (от 10 до 40, по умолчанию 15),
            "layoutAngle": "straight" или "diagonal",
            "tier": "econom" | "standard" | "premium"
          }`
        },
        {
          role: 'user',
          content: spokenText
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Ошибка DeepSeek API: ${response.status}`);
  }

  const result = await response.json();
  return JSON.parse(result.choices[0].message.content);
}

export function startNativeVoiceRecognition(onResult, onError) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    onError('Ваш браузер или WebView не поддерживает встроенное распознавание речи. Введите текст заметки вручную.');
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'ru-RU';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    onResult(transcript);
  };

  recognition.onerror = (event) => {
    onError(`Ошибка микрофона: ${event.error}`);
  };

  recognition.start();
  return recognition;
}
