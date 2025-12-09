FROM node:20-alpine

WORKDIR /app

# Копируем package.json и package-lock.json (если есть)
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем остальные файлы
COPY server.js ./

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["node", "server.js"]

