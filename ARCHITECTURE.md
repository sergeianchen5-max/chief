# Архитектура "ШЕФ ХОЛОДИЛЬНИК" (Scale to 100k Users)

## 1. High-Level Overview
Приложение спроектировано для высокой нагрузки (20,000 DAU). Используется асинхронная обработка запросов к AI через очереди.

```mermaid
[Client App] 
     |
     v
[Load Balancer (Nginx/ALB)]
     |
     +---> [API Server Cluster (Node.js)] <---> [Redis Cache (Hot Data)]
                 |          ^
                 | (Job)    | (Result)
                 v          |
           [Message Queue (BullMQ/Redis)]
                 |
                 v
           [AI Workers (Background Node.js)] <---> [Google Gemini API]
                 |
                 v
           [PostgreSQL (Persistent Data)]
```

## 2. Компоненты системы

### A. API Gateway (Express Cluster)
- **Role:** Аутентификация, валидация входных данных, чтение из кеша.
- **Scaling:** Горизонтальное масштабирование (3-5 реплик).
- **Rate Limiting:** Ограничение 5 запросов/мин на пользователя (через Redis).

### B. Асинхронная Очередь (Queue)
- **Problem:** Google API имеет лимиты RPM (Requests Per Minute). Пиковые нагрузки (ужин) могут превысить их.
- **Solution:** Все запросы на генерацию меню попадают в очередь.
- **UX:** Клиент получает `job_id` и опрашивает статус (Long Polling / WebSocket).

### C. База Данных (PostgreSQL)
- **Users:** `id`, `email`, `subscription_status`, `tokens_balance`.
- **Plans:** `id`, `user_id`, `created_at`, `inventory_hash`, `json_data` (JSONB).
  - *Logic:* Если `inventory_hash` (хэш продуктов) не изменился за сегодня -> вернуть запись из БД без запроса к AI.

### D. Экономика (Gemini Flash)
- **Лимит:** ~20,000 генераций в сутки.
- **Стоимость:** ~$26/день (~$780/мес).
- **Оптимизация:** Агрессивное кеширование планов питания на 24 часа.

## 3. Модель Данных (SQL Schema Draft)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  is_premium BOOLEAN DEFAULT FALSE
);

CREATE TABLE generated_plans (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  inventory_hash VARCHAR(64), -- MD5 от списка продуктов
  plan_data JSONB, -- Ответ от Gemini
  
  -- Индекс для быстрого поиска сегодняшнего плана
  CONSTRAINT unique_plan_per_day UNIQUE (user_id, inventory_hash, DATE(created_at))
);
```

## 4. Клиенты
Клиенты (Web/Mob) реализуют "Optimistic UI". Если план генерируется долго (очередь), показываем красивый лоадер с фактами о еде.
