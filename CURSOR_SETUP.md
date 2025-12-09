# Настройка прокси для Cursor

## Проблема

Cursor может делать запросы не только к OpenAI API, но и к своему собственному API (`api.cursor.com`). Настройка "Override OpenAI Base URL" в Cursor влияет только на запросы к OpenAI API.

## Решение

### 1. Настройка в Cursor

В настройках Cursor:
- **OpenAI API Key**: Укажите любой валидный ключ (он будет заменен прокси)
- **Override OpenAI Base URL**: Укажите URL вашего прокси: `https://pro-deploy-proxy-5800.twc1.net/v1`

⚠️ **Важно**: URL должен заканчиваться на `/v1`, так как Cursor добавляет путь к эндпоинту (например, `/chat/completions`).

### 2. Проверка работы прокси

Проверьте, что прокси работает:

```bash
curl https://pro-deploy-proxy-5800.twc1.net/health
```

Должен вернуться ответ:
```json
{"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

### 3. Тестирование эндпоинта

Проверьте, что прокси правильно обрабатывает запросы:

```bash
curl -X POST https://pro-deploy-proxy-5800.twc1.net/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {
        "role": "user",
        "content": "Hello, how are you?"
      }
    ]
  }'
```

### 4. Логирование

Прокси теперь логирует все входящие запросы и ответы. Проверьте логи, чтобы увидеть:
- Какие запросы приходят от Cursor
- Какие заголовки передаются
- Какие ответы возвращаются

### 5. Возможные проблемы

#### Проблема: Запросы не проходят через прокси

**Причина**: Cursor может делать запросы к своему собственному API (`api.cursor.com`), которые не проходят через прокси OpenAI Base URL.

**Решение**: Это нормальное поведение. Прокси обрабатывает только запросы к OpenAI API.

#### Проблема: Ошибки авторизации

**Причина**: Неправильный `AUTHORIZATION_TOKEN` в переменных окружения.

**Решение**: Убедитесь, что `AUTHORIZATION_TOKEN` в `.env` файле содержит правильный токен от Timeweb.

#### Проблема: 404 ошибки

**Причина**: Неправильный `AGENT_ACCESS_ID` или неподдерживаемый эндпоинт.

**Решение**: 
- Проверьте, что `AGENT_ACCESS_ID` правильный
- Проверьте логи прокси, чтобы увидеть, какие эндпоинты запрашиваются

### 6. Поддерживаемые эндпоинты

Прокси поддерживает следующие эндпоинты OpenAI API:

- `POST /v1/chat/completions` - Chat completions
- `POST /v1/completions` - Text completions (legacy)
- `GET /v1/models` - Список моделей
- `POST /v1/responses` - Создание ответа
- `GET /v1/responses/:response_id` - Получение ответа
- `DELETE /v1/responses/:response_id` - Удаление ответа
- `POST /v1/responses/:response_id/cancel` - Отмена ответа
- `POST /v1/conversations` - Создание диалога
- `GET /v1/conversations/:conversation_id` - Получение диалога
- `POST /v1/conversations/:conversation_id` - Обновление диалога
- `DELETE /v1/conversations/:conversation_id` - Удаление диалога
- `GET /v1/conversations/:conversation_id/items` - Список элементов диалога
- `POST /v1/conversations/:conversation_id/items` - Создание элементов диалога
- `GET /v1/conversations/:conversation_id/items/:item_id` - Получение элемента
- `DELETE /v1/conversations/:conversation_id/items/:item_id` - Удаление элемента

### 7. Отладка

Если прокси не работает правильно:

1. Проверьте логи прокси-сервера
2. Проверьте, что все переменные окружения установлены правильно
3. Проверьте, что прокси доступен из интернета
4. Проверьте, что Timeweb API доступен и токен валиден

### 8. Улучшения в последней версии

- ✅ Добавлена поддержка CORS
- ✅ Улучшено логирование запросов и ответов
- ✅ Добавлена передача полезных заголовков от клиента
- ✅ Улучшена обработка ошибок
- ✅ Добавлен обработчик для неизвестных эндпоинтов (для отладки)

