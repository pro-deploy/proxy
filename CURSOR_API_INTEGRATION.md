# Интеграция Cursor Cloud Agents API

## Обзор

Cursor предоставляет [Cloud Agents API](https://cursor.com/docs/cloud-agent/api/endpoints) для программного управления AI-агентами, которые работают с репозиториями. Это отдельный API от текущего Timeweb Cloud AI API, но может быть интегрирован в прокси-сервер.

## Доступные API Cursor

### 1. Cloud Agents API (Beta)
- **Базовый URL**: `https://api.cursor.com/v0`
- **Аутентификация**: Basic Authentication (API ключ как username, пароль пустой)
- **Статус**: Beta, доступен на всех планах

### 2. Admin API (Enterprise)
- Управление командой, настройками, использованием
- Доступен только для Enterprise команд

### 3. Analytics API (Enterprise)
- Аналитика использования Cursor
- Доступен только для Enterprise команд

### 4. AI Code Tracking API (Enterprise)
- Отслеживание AI-генерированного кода
- Доступен только для Enterprise команд

## Эндпоинты Cloud Agents API

### Управление агентами

#### `GET /v0/agents` - Список агентов
```bash
curl --request GET \
  --url https://api.cursor.com/v0/agents \
  -u YOUR_API_KEY:
```

**Параметры:**
- `limit` (optional): Количество агентов (default: 20, max: 100)
- `cursor` (optional): Курсор пагинации

**Ответ:**
```json
{
  "agents": [
    {
      "id": "bc_abc123",
      "name": "Add README Documentation",
      "status": "FINISHED",
      "source": {
        "repository": "https://github.com/your-org/your-repo",
        "ref": "main"
      },
      "target": {
        "branchName": "cursor/add-readme-1234",
        "url": "https://cursor.com/agents?id=bc_abc123",
        "prUrl": "https://github.com/your-org/your-repo/pull/1234",
        "autoCreatePr": false
      },
      "summary": "Added README.md with installation instructions",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "nextCursor": "bc_ghi789"
}
```

#### `POST /v0/agents` - Создание агента
```bash
curl --request POST \
  --url https://api.cursor.com/v0/agents \
  -u YOUR_API_KEY: \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Fix authentication bug",
    "source": {
      "repository": "https://github.com/your-org/your-repo",
      "ref": "main"
    },
    "target": {
      "branchName": "cursor/fix-auth-5678",
      "autoCreatePr": true
    },
    "instructions": "Fix the authentication bug in login.js",
    "model": "claude-4-sonnet-thinking"
  }'
```

#### `GET /v0/agents/:id` - Получение агента
#### `PATCH /v0/agents/:id` - Обновление агента
#### `POST /v0/agents/:id/cancel` - Отмена агента

### Дополнительные эндпоинты

#### `GET /v0/me` - Информация о пользователе
```json
{
  "apiKeyName": "Production API Key",
  "createdAt": "2024-01-15T10:30:00Z",
  "userEmail": "developer@example.com"
}
```

#### `GET /v0/models` - Список моделей
```json
{
  "models": [
    "claude-4-sonnet-thinking",
    "o3",
    "claude-4-opus-thinking"
  ]
}
```

#### `GET /v0/repositories` - Список GitHub репозиториев
**⚠️ Внимание**: Очень строгие лимиты - 1 запрос/пользователь/минуту, 30/пользователь/час

## Аутентификация

### Получение API ключа
1. Перейти в [Cursor Dashboard → Integrations](https://cursor.com/dashboard?tab=integrations)
2. Создать новый API ключ
3. Использовать Basic Authentication:
   ```bash
   Authorization: Basic {base64_encode('YOUR_API_KEY:')}
   ```

## Возможности интеграции

### Вариант 1: Добавить прокси для Cursor Cloud Agents API

Создать отдельные эндпоинты для проксирования запросов к Cursor API:

```javascript
// Новые эндпоинты:
POST /cursor/v0/agents          -> POST https://api.cursor.com/v0/agents
GET  /cursor/v0/agents          -> GET  https://api.cursor.com/v0/agents
GET  /cursor/v0/agents/:id      -> GET  https://api.cursor.com/v0/agents/:id
PATCH /cursor/v0/agents/:id     -> PATCH https://api.cursor.com/v0/agents/:id
POST /cursor/v0/agents/:id/cancel -> POST https://api.cursor.com/v0/agents/:id/cancel
GET  /cursor/v0/me              -> GET  https://api.cursor.com/v0/me
GET  /cursor/v0/models          -> GET  https://api.cursor.com/v0/models
GET  /cursor/v0/repositories    -> GET  https://api.cursor.com/v0/repositories
```

### Вариант 2: Унифицированный прокси

Создать единый прокси, который может работать с обоими API:
- Timeweb Cloud AI API (текущий)
- Cursor Cloud Agents API (новый)

### Вариант 3: Middleware для автоматического выбора API

Определять, какой API использовать на основе:
- Пути запроса (`/v1/*` -> Timeweb, `/v0/*` -> Cursor)
- Заголовков
- Конфигурации

## Рекомендации по реализации

### 1. Добавить переменные окружения

```env
# Cursor API
CURSOR_API_KEY=your-cursor-api-key
CURSOR_API_BASE=https://api.cursor.com
ENABLE_CURSOR_API=true
```

### 2. Создать функцию для Cursor аутентификации

```javascript
function createCursorHeaders() {
  const apiKey = process.env.CURSOR_API_KEY;
  if (!apiKey) {
    throw new Error('CURSOR_API_KEY is not configured');
  }
  
  const auth = Buffer.from(`${apiKey}:`).toString('base64');
  return {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json'
  };
}
```

### 3. Добавить роуты для Cursor API

```javascript
// Прокси для Cursor Cloud Agents API
if (process.env.ENABLE_CURSOR_API === 'true') {
  app.get('/cursor/v0/agents', async (req, res) => {
    try {
      const headers = createCursorHeaders();
      const queryParams = new URLSearchParams(req.query).toString();
      const url = `${CURSOR_API_BASE}/v0/agents${queryParams ? `?${queryParams}` : ''}`;
      
      const response = await axios.get(url, { headers });
      res.status(response.status).json(response.data);
    } catch (error) {
      // Обработка ошибок
    }
  });
  
  // ... другие эндпоинты
}
```

## Rate Limits

### Cloud Agents API
- Стандартные лимиты (не указаны в документации, но рекомендуется использовать exponential backoff)

### Repositories API
- **1 запрос / пользователь / минуту**
- **30 запросов / пользователь / час**

## Best Practices

1. **Использовать exponential backoff** при получении 429 ошибок
2. **Кэшировать результаты** `/v0/models` и `/v0/repositories` (они редко меняются)
3. **Логировать все запросы** для мониторинга использования
4. **Обрабатывать ошибки** gracefully с понятными сообщениями

## Примеры использования

### Создание агента через прокси

```bash
curl -X POST http://localhost:3000/cursor/v0/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Add documentation",
    "source": {
      "repository": "https://github.com/your-org/your-repo",
      "ref": "main"
    },
    "target": {
      "branchName": "cursor/add-docs",
      "autoCreatePr": true
    },
    "instructions": "Add comprehensive documentation to README.md"
  }'
```

### Получение списка агентов

```bash
curl http://localhost:3000/cursor/v0/agents?limit=50
```

## Сравнение API

| Функция | Timeweb Cloud AI | Cursor Cloud Agents |
|---------|------------------|---------------------|
| Назначение | AI-чат и completions | Управление AI-агентами для репозиториев |
| Формат | OpenAI-compatible | Собственный формат |
| Аутентификация | Bearer token | Basic Auth (API key) |
| Основное использование | Чат, генерация текста | Автоматизация работы с кодом |

## Заключение

Интеграция Cursor Cloud Agents API может быть полезной для:
- Автоматизации работы с репозиториями
- Создания AI-агентов для выполнения задач в коде
- Управления Pull Request'ами через AI

Рекомендуется реализовать как опциональную функцию, активируемую через переменную окружения.


