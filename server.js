import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Базовый URL целевого API из api-1.yaml
const TARGET_API_BASE = process.env.TARGET_API_BASE || 'https://agent.timeweb.cloud';

// Agent Access ID - обязательно из переменной окружения
const AGENT_ACCESS_ID = process.env.AGENT_ACCESS_ID;
if (!AGENT_ACCESS_ID) {
  console.error('⚠️  WARNING: AGENT_ACCESS_ID не задан в переменных окружения!');
}

// Authorization токен для Timeweb API
const AUTHORIZATION_TOKEN = process.env.AUTHORIZATION_TOKEN || process.env.AUTH_TOKEN;

// x-proxy-source заголовок
const PROXY_SOURCE = process.env.PROXY_SOURCE || 'openai-proxy';

// Middleware для CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware для парсинга JSON
app.use(express.json());

// Middleware для логирования
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Функция для получения agent_access_id (только из переменной окружения)
function getAgentAccessId() {
  return AGENT_ACCESS_ID;
}

// Функция для создания заголовков для целевого API
function createTargetHeaders(req) {
  const headers = {
    'Content-Type': 'application/json',
  };

  // Копируем полезные заголовки от клиента (кроме Authorization, Host, Content-Length)
  const headersToForward = [
    'user-agent',
    'x-request-id',
    'x-forwarded-for',
    'x-forwarded-proto',
    'accept',
    'accept-encoding',
    'accept-language',
    'referer',
    'origin'
  ];

  headersToForward.forEach(headerName => {
    if (req.headers[headerName]) {
      headers[headerName] = req.headers[headerName];
    }
  });

  // Authorization из переменной окружения (всегда используем наш токен)
  if (AUTHORIZATION_TOKEN) {
    headers['Authorization'] = AUTHORIZATION_TOKEN.startsWith('Bearer ') 
      ? AUTHORIZATION_TOKEN 
      : `Bearer ${AUTHORIZATION_TOKEN}`;
  }

  // x-proxy-source из переменной окружения
  headers['x-proxy-source'] = PROXY_SOURCE;

  return headers;
}

// Прокси для /v1/chat/completions -> /api/v1/cloud-ai/agents/{agent_access_id}/v1/chat/completions
app.post('/v1/chat/completions', async (req, res) => {
  try {
    const agentAccessId = getAgentAccessId();
    
    if (!agentAccessId) {
      return res.status(500).json({
        error: {
          message: 'Agent access ID is not configured. Set AGENT_ACCESS_ID environment variable.',
          type: 'server_error'
        }
      });
    }

    const targetUrl = `${TARGET_API_BASE}/api/v1/cloud-ai/agents/${agentAccessId}/v1/chat/completions`;
    const headers = createTargetHeaders(req);

    console.log(`Proxying to: ${targetUrl}`);
    console.log('Request headers:', JSON.stringify(headers, null, 2));

    const response = await axios.post(targetUrl, req.body, { headers });
    console.log(`Response status: ${response.status}`);
    
    // Копируем важные заголовки из ответа
    if (response.headers['content-type']) {
      res.setHeader('Content-Type', response.headers['content-type']);
    }
    if (response.headers['x-request-id']) {
      res.setHeader('X-Request-ID', response.headers['x-request-id']);
    }
    
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error proxying chat completions:', error.message);
    if (error.response) {
      console.error('Response error:', error.response.status, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else if (error.request) {
      console.error('Request error:', error.request);
      res.status(502).json({
        error: {
          message: 'Bad Gateway - Unable to reach target API',
          type: 'server_error'
        }
      });
    } else {
      res.status(500).json({
        error: {
          message: 'Internal server error',
          type: 'server_error'
        }
      });
    }
  }
});

// Прокси для /v1/completions -> /api/v1/cloud-ai/agents/{agent_access_id}/v1/completions
app.post('/v1/completions', async (req, res) => {
  try {
    const agentAccessId = getAgentAccessId();
    
    if (!agentAccessId) {
      return res.status(500).json({
        error: {
          message: 'Agent access ID is not configured. Set AGENT_ACCESS_ID environment variable.',
          type: 'server_error'
        }
      });
    }

    const targetUrl = `${TARGET_API_BASE}/api/v1/cloud-ai/agents/${agentAccessId}/v1/completions`;
    const headers = createTargetHeaders(req);

    console.log(`Proxying to: ${targetUrl}`);

    const response = await axios.post(targetUrl, req.body, { headers });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error proxying completions:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: {
          message: 'Internal server error',
          type: 'server_error'
        }
      });
    }
  }
});

// Прокси для /v1/models -> /api/v1/cloud-ai/agents/{agent_access_id}/v1/models
app.get('/v1/models', async (req, res) => {
  try {
    const agentAccessId = getAgentAccessId();
    
    if (!agentAccessId) {
      return res.status(500).json({
        error: {
          message: 'Agent access ID is not configured. Set AGENT_ACCESS_ID environment variable.',
          type: 'server_error'
        }
      });
    }

    const targetUrl = `${TARGET_API_BASE}/api/v1/cloud-ai/agents/${agentAccessId}/v1/models`;
    const headers = createTargetHeaders(req);

    console.log(`Proxying to: ${targetUrl}`);

    const response = await axios.get(targetUrl, { headers });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error proxying models:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: {
          message: 'Internal server error',
          type: 'server_error'
        }
      });
    }
  }
});

// Прокси для /v1/responses (POST) -> /api/v1/cloud-ai/agents/{agent_access_id}/v1/responses
app.post('/v1/responses', async (req, res) => {
  try {
    const agentAccessId = getAgentAccessId();
    
    if (!agentAccessId) {
      return res.status(500).json({
        error: {
          message: 'Agent access ID is not configured. Set AGENT_ACCESS_ID environment variable.',
          type: 'server_error'
        }
      });
    }

    const targetUrl = `${TARGET_API_BASE}/api/v1/cloud-ai/agents/${agentAccessId}/v1/responses`;
    const headers = createTargetHeaders(req);

    console.log(`Proxying to: ${targetUrl}`);

    const response = await axios.post(targetUrl, req.body, { headers });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error proxying responses:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: {
          message: 'Internal server error',
          type: 'server_error'
        }
      });
    }
  }
});

// Прокси для /v1/responses/:response_id (GET)
app.get('/v1/responses/:response_id', async (req, res) => {
  try {
    const agentAccessId = getAgentAccessId();
    const { response_id } = req.params;
    
    if (!agentAccessId) {
      return res.status(500).json({
        error: {
          message: 'Agent access ID is not configured. Set AGENT_ACCESS_ID environment variable.',
          type: 'server_error'
        }
      });
    }

    const targetUrl = `${TARGET_API_BASE}/api/v1/cloud-ai/agents/${agentAccessId}/v1/responses/${response_id}`;
    const headers = createTargetHeaders(req);

    // Добавляем query параметры если есть
    const queryParams = new URLSearchParams(req.query).toString();
    const fullUrl = queryParams ? `${targetUrl}?${queryParams}` : targetUrl;

    console.log(`Proxying to: ${fullUrl}`);

    const response = await axios.get(fullUrl, { headers });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error proxying get response:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: {
          message: 'Internal server error',
          type: 'server_error'
        }
      });
    }
  }
});

// Прокси для /v1/responses/:response_id (DELETE)
app.delete('/v1/responses/:response_id', async (req, res) => {
  try {
    const agentAccessId = getAgentAccessId();
    const { response_id } = req.params;
    
    if (!agentAccessId) {
      return res.status(500).json({
        error: {
          message: 'Agent access ID is not configured. Set AGENT_ACCESS_ID environment variable.',
          type: 'server_error'
        }
      });
    }

    const targetUrl = `${TARGET_API_BASE}/api/v1/cloud-ai/agents/${agentAccessId}/v1/responses/${response_id}`;
    const headers = createTargetHeaders(req);

    console.log(`Proxying to: ${targetUrl}`);

    const response = await axios.delete(targetUrl, { headers });
    res.status(response.status).json(response.data || {});
  } catch (error) {
    console.error('Error proxying delete response:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: {
          message: 'Internal server error',
          type: 'server_error'
        }
      });
    }
  }
});

// Прокси для /v1/responses/:response_id/cancel (POST)
app.post('/v1/responses/:response_id/cancel', async (req, res) => {
  try {
    const agentAccessId = getAgentAccessId();
    const { response_id } = req.params;
    
    if (!agentAccessId) {
      return res.status(500).json({
        error: {
          message: 'Agent access ID is not configured. Set AGENT_ACCESS_ID environment variable.',
          type: 'server_error'
        }
      });
    }

    const targetUrl = `${TARGET_API_BASE}/api/v1/cloud-ai/agents/${agentAccessId}/v1/responses/${response_id}/cancel`;
    const headers = createTargetHeaders();

    console.log(`Proxying to: ${targetUrl}`);

    const response = await axios.post(targetUrl, req.body || {}, { headers });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error proxying cancel response:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: {
          message: 'Internal server error',
          type: 'server_error'
        }
      });
    }
  }
});

// Прокси для /v1/conversations (POST)
app.post('/v1/conversations', async (req, res) => {
  try {
    const agentAccessId = getAgentAccessId();
    
    if (!agentAccessId) {
      return res.status(500).json({
        error: {
          message: 'Agent access ID is not configured. Set AGENT_ACCESS_ID environment variable.',
          type: 'server_error'
        }
      });
    }

    const targetUrl = `${TARGET_API_BASE}/api/v1/cloud-ai/agents/${agentAccessId}/v1/conversations`;
    const headers = createTargetHeaders(req);

    console.log(`Proxying to: ${targetUrl}`);

    const response = await axios.post(targetUrl, req.body, { headers });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error proxying create conversation:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: {
          message: 'Internal server error',
          type: 'server_error'
        }
      });
    }
  }
});

// Прокси для /v1/conversations/:conversation_id (GET, POST, DELETE)
app.get('/v1/conversations/:conversation_id', async (req, res) => {
  try {
    const agentAccessId = getAgentAccessId();
    const { conversation_id } = req.params;
    
    if (!agentAccessId) {
      return res.status(500).json({
        error: {
          message: 'Agent access ID is not configured. Set AGENT_ACCESS_ID environment variable.',
          type: 'server_error'
        }
      });
    }

    const targetUrl = `${TARGET_API_BASE}/api/v1/cloud-ai/agents/${agentAccessId}/v1/conversations/${conversation_id}`;
    const headers = createTargetHeaders(req);

    console.log(`Proxying to: ${targetUrl}`);

    const response = await axios.get(targetUrl, { headers });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error proxying get conversation:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: {
          message: 'Internal server error',
          type: 'server_error'
        }
      });
    }
  }
});

app.post('/v1/conversations/:conversation_id', async (req, res) => {
  try {
    const agentAccessId = getAgentAccessId();
    const { conversation_id } = req.params;
    
    if (!agentAccessId) {
      return res.status(500).json({
        error: {
          message: 'Agent access ID is not configured. Set AGENT_ACCESS_ID environment variable.',
          type: 'server_error'
        }
      });
    }

    const targetUrl = `${TARGET_API_BASE}/api/v1/cloud-ai/agents/${agentAccessId}/v1/conversations/${conversation_id}`;
    const headers = createTargetHeaders(req);

    console.log(`Proxying to: ${targetUrl}`);

    const response = await axios.post(targetUrl, req.body, { headers });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error proxying update conversation:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: {
          message: 'Internal server error',
          type: 'server_error'
        }
      });
    }
  }
});

app.delete('/v1/conversations/:conversation_id', async (req, res) => {
  try {
    const agentAccessId = getAgentAccessId();
    const { conversation_id } = req.params;
    
    if (!agentAccessId) {
      return res.status(500).json({
        error: {
          message: 'Agent access ID is not configured. Set AGENT_ACCESS_ID environment variable.',
          type: 'server_error'
        }
      });
    }

    const targetUrl = `${TARGET_API_BASE}/api/v1/cloud-ai/agents/${agentAccessId}/v1/conversations/${conversation_id}`;
    const headers = createTargetHeaders(req);

    console.log(`Proxying to: ${targetUrl}`);

    const response = await axios.delete(targetUrl, { headers });
    res.status(response.status).json(response.data || {});
  } catch (error) {
    console.error('Error proxying delete conversation:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: {
          message: 'Internal server error',
          type: 'server_error'
        }
      });
    }
  }
});

// Прокси для /v1/conversations/:conversation_id/items (GET, POST)
app.get('/v1/conversations/:conversation_id/items', async (req, res) => {
  try {
    const agentAccessId = getAgentAccessId();
    const { conversation_id } = req.params;
    
    if (!agentAccessId) {
      return res.status(500).json({
        error: {
          message: 'Agent access ID is not configured. Set AGENT_ACCESS_ID environment variable.',
          type: 'server_error'
        }
      });
    }

    const targetUrl = `${TARGET_API_BASE}/api/v1/cloud-ai/agents/${agentAccessId}/v1/conversations/${conversation_id}/items`;
    const headers = createTargetHeaders(req);

    const queryParams = new URLSearchParams(req.query).toString();
    const fullUrl = queryParams ? `${targetUrl}?${queryParams}` : targetUrl;

    console.log(`Proxying to: ${fullUrl}`);

    const response = await axios.get(fullUrl, { headers });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error proxying list items:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: {
          message: 'Internal server error',
          type: 'server_error'
        }
      });
    }
  }
});

app.post('/v1/conversations/:conversation_id/items', async (req, res) => {
  try {
    const agentAccessId = getAgentAccessId();
    const { conversation_id } = req.params;
    
    if (!agentAccessId) {
      return res.status(500).json({
        error: {
          message: 'Agent access ID is not configured. Set AGENT_ACCESS_ID environment variable.',
          type: 'server_error'
        }
      });
    }

    const targetUrl = `${TARGET_API_BASE}/api/v1/cloud-ai/agents/${agentAccessId}/v1/conversations/${conversation_id}/items`;
    const headers = createTargetHeaders(req);

    const queryParams = new URLSearchParams(req.query).toString();
    const fullUrl = queryParams ? `${targetUrl}?${queryParams}` : targetUrl;

    console.log(`Proxying to: ${fullUrl}`);

    const response = await axios.post(fullUrl, req.body, { headers });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error proxying create items:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: {
          message: 'Internal server error',
          type: 'server_error'
        }
      });
    }
  }
});

// Прокси для /v1/conversations/:conversation_id/items/:item_id (GET, DELETE)
app.get('/v1/conversations/:conversation_id/items/:item_id', async (req, res) => {
  try {
    const agentAccessId = getAgentAccessId();
    const { conversation_id, item_id } = req.params;
    
    if (!agentAccessId) {
      return res.status(500).json({
        error: {
          message: 'Agent access ID is not configured. Set AGENT_ACCESS_ID environment variable.',
          type: 'server_error'
        }
      });
    }

    const targetUrl = `${TARGET_API_BASE}/api/v1/cloud-ai/agents/${agentAccessId}/v1/conversations/${conversation_id}/items/${item_id}`;
    const headers = createTargetHeaders(req);

    const queryParams = new URLSearchParams(req.query).toString();
    const fullUrl = queryParams ? `${targetUrl}?${queryParams}` : targetUrl;

    console.log(`Proxying to: ${fullUrl}`);

    const response = await axios.get(fullUrl, { headers });
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Error proxying get item:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: {
          message: 'Internal server error',
          type: 'server_error'
        }
      });
    }
  }
});

app.delete('/v1/conversations/:conversation_id/items/:item_id', async (req, res) => {
  try {
    const agentAccessId = getAgentAccessId();
    const { conversation_id, item_id } = req.params;
    
    if (!agentAccessId) {
      return res.status(500).json({
        error: {
          message: 'Agent access ID is not configured. Set AGENT_ACCESS_ID environment variable.',
          type: 'server_error'
        }
      });
    }

    const targetUrl = `${TARGET_API_BASE}/api/v1/cloud-ai/agents/${agentAccessId}/v1/conversations/${conversation_id}/items/${item_id}`;
    const headers = createTargetHeaders(req);

    console.log(`Proxying to: ${targetUrl}`);

    const response = await axios.delete(targetUrl, { headers });
    res.status(response.status).json(response.data || {});
  } catch (error) {
    console.error('Error proxying delete item:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({
        error: {
          message: 'Internal server error',
          type: 'server_error'
        }
      });
    }
  }
});

// Обработчик для неизвестных эндпоинтов (для отладки)
app.use((req, res, next) => {
  if (req.path !== '/health' && req.path !== '/') {
    console.warn(`⚠️  Unknown endpoint: ${req.method} ${req.path}`);
    console.warn('Headers:', JSON.stringify(req.headers, null, 2));
    res.status(404).json({
      error: {
        message: `Endpoint not found: ${req.method} ${req.path}`,
        type: 'invalid_request_error',
        available_endpoints: [
          'POST /v1/chat/completions',
          'POST /v1/completions',
          'GET /v1/models',
          'POST /v1/responses',
          'GET /v1/responses/:response_id',
          'DELETE /v1/responses/:response_id',
          'POST /v1/responses/:response_id/cancel',
          'POST /v1/conversations',
          'GET /v1/conversations/:conversation_id',
          'POST /v1/conversations/:conversation_id',
          'DELETE /v1/conversations/:conversation_id',
          'GET /v1/conversations/:conversation_id/items',
          'POST /v1/conversations/:conversation_id/items',
          'GET /v1/conversations/:conversation_id/items/:item_id',
          'DELETE /v1/conversations/:conversation_id/items/:item_id'
        ]
      }
    });
  } else {
    next();
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'OpenAI Proxy Server',
    version: '1.0.0',
    endpoints: [
      'POST /v1/chat/completions',
      'POST /v1/completions',
      'GET /v1/models',
      'POST /v1/responses',
      'GET /v1/responses/:response_id',
      'DELETE /v1/responses/:response_id',
      'POST /v1/responses/:response_id/cancel',
      'POST /v1/conversations',
      'GET /v1/conversations/:conversation_id',
      'POST /v1/conversations/:conversation_id',
      'DELETE /v1/conversations/:conversation_id',
      'GET /v1/conversations/:conversation_id/items',
      'POST /v1/conversations/:conversation_id/items',
      'GET /v1/conversations/:conversation_id/items/:item_id',
      'DELETE /v1/conversations/:conversation_id/items/:item_id'
    ]
  });
});

app.listen(PORT, HOST, () => {
  console.log(`🚀 OpenAI Proxy Server запущен на ${HOST}:${PORT}`);
  console.log(`📍 Базовый URL: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`🎯 Целевой API: ${TARGET_API_BASE}`);
  console.log(`🔑 Agent Access ID: ${AGENT_ACCESS_ID || 'не задан (установите AGENT_ACCESS_ID в переменных окружения)'}`);
  console.log(`✨ Все запросы в формате ChatGPT будут автоматически проксироваться на Timeweb`);
});

