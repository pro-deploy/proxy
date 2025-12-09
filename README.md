# OpenAI Proxy Server

Прокси-сервер для перенаправления запросов в формате OpenAI API на Cloud AI API из `api-1.yaml`.

## Особенности

- ✅ Принимает только тело запроса в формате OpenAI
- ✅ Все параметры (agent_access_id, токены и т.д.) настраиваются через переменные окружения
- ✅ Автоматическое проксирование всех запросов на Timeweb API
- ✅ Готов к развертыванию в Docker

## Быстрый старт с Docker

### 1. Создайте файл `.env`

```bash
cp env.example .env
```

### 2. Заполните переменные окружения в `.env`:

```env
AGENT_ACCESS_ID=your-agent-access-id-here
AUTHORIZATION_TOKEN=Bearer your-api-key-here
TARGET_API_BASE=https://agent.timeweb.cloud
PORT=3000
```

**Примечание:** `AUTHORIZATION_TOKEN` - это ваш API ключ от Timeweb. Можно указать с префиксом `Bearer ` или без него:
- `AUTHORIZATION_TOKEN=Bearer sk-1234567890abcdef`
- `AUTHORIZATION_TOKEN=sk-1234567890abcdef`

### 3. Запустите через Docker Compose:

```bash
docker-compose up -d
```

Или соберите и запустите вручную:

```bash
docker build -t openai-proxy .
docker run -d \
  -p 3000:3000 \
  --env-file .env \
  --name openai-proxy \
  openai-proxy
```

## Переменные окружения

- `AGENT_ACCESS_ID` - **ОБЯЗАТЕЛЬНО** - ID доступа агента для Timeweb API
- `AUTHORIZATION_TOKEN` - **ОБЯЗАТЕЛЬНО** - API ключ (Bearer token) для авторизации в Timeweb API (можно указать с префиксом "Bearer " или без)
- `TARGET_API_BASE` - базовый URL целевого API (по умолчанию https://agent.timeweb.cloud)
- `PORT` - порт для прокси-сервера (по умолчанию 3000)
- `HOST` - хост для прослушивания (по умолчанию 0.0.0.0)
- `PROXY_SOURCE` - значение заголовка x-proxy-source (по умолчанию openai-proxy)

## Установка без Docker

```bash
npm install
```

Создайте файл `.env` и заполните переменные окружения (см. выше).

Запустите:

```bash
npm start
```

Или в режиме разработки:

```bash
npm run dev
```

## Использование

Прокси-сервер принимает стандартные OpenAI эндпоинты и перенаправляет их на соответствующие эндпоинты из `api-1.yaml`.

**Важно:** На вход нужно передавать только тело запроса в формате OpenAI. Все остальные параметры (agent_access_id, токены и т.д.) берутся из переменных окружения.

### Примеры запросов

#### Chat Completions

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
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

#### Получение списка моделей

```bash
curl http://localhost:3000/v1/models
```

#### Text Completions

```bash
curl -X POST http://localhost:3000/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a short story",
    "model": "gpt-3.5-turbo-instruct"
  }'
```

**Примечание:** Не нужно передавать заголовки `Authorization` или `x-agent-access-id` - они берутся из переменных окружения!

## Поддерживаемые эндпоинты

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

## Как это работает

1. Вы отправляете запрос в формате OpenAI на прокси (например, `POST /v1/chat/completions`)
2. Прокси берет все необходимые параметры из переменных окружения:
   - `AGENT_ACCESS_ID` - для формирования URL
   - `AUTHORIZATION_TOKEN` - для заголовка Authorization
   - `PROXY_SOURCE` - для заголовка x-proxy-source
3. Прокси перенаправляет запрос на Timeweb API с правильными заголовками
4. Ответ возвращается клиенту

## Проверка работы

Проверьте, что прокси работает:

```bash
curl http://localhost:3000/health
```

Должен вернуться ответ:
```json
{"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

