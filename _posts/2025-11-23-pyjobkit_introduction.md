---
layout: post
title:  "Pyjobkit: Асинхронный toolkit для обработки заданий в Python"
date:   2025-11-23 16:16:16 +0500
categories: python
---

## Pyjobkit: Асинхронный toolkit для обработки заданий в Python

### Введение

В мире современных приложений, где требуется надежная обработка фоновых задач, библиотеки для управления очередями заданий (job queues) играют ключевую роль. Pyjobkit — это легковесный, backend-независимый toolkit на Python, предназначенный для создания асинхронных систем обработки заданий. Разработанный для интеграции с различными инфраструктурами, он предоставляет абстракции для постановки задач в очередь, их выполнения и мониторинга. Библиотека построена на базе asyncio, что делает её идеальной для высокопроизводительных приложений, где важна concurrency без блокировки.

Pyjobkit не привязан к конкретному хранилищу или исполнителю: вы можете использовать in-memory backend для тестов или SQL-backend для production. Встроенные исполнители поддерживают HTTP-запросы и локальные subprocess, а кастомные расширения позволяют адаптировать под любые нужды, включая удалённый запуск по SSH. Библиотека распространяется под MIT License и требует Python 3.13+.

В этой статье мы разберём архитектуру pyjobkit, процесс установки, подробное описание работы и примеры запуска для разных сценариев. Это поможет вам понять, как интегрировать библиотеку в ваши проекты.
### Установка

Установка pyjobkit проста и осуществляется через pip:

```bash
pip install pyjobkit
```

Для работы с SQL-backend потребуются асинхронные драйверы баз данных (устанавливаются отдельно в зависимости от выбранной БД):

- PostgreSQL: `pip install asyncpg`
- MySQL: `pip install aiomysql`
- SQLite: `pip install aiosqlite`

Библиотека зависит от SQLAlchemy 2.x для SQL-backend и использует asyncio.TaskGroup, поэтому убедитесь, что ваша среда поддерживает Python 3.13+.

### Архитектура pyjobkit

Pyjobkit построен вокруг нескольких ключевых компонентов, которые обеспечивают гибкость и масштабируемость. Давайте разберём их подробнее.
### 1. Backends (Хранилища очередей)

Backend — это абстракция для хранения задач. Pyjobkit реализует протокол `QueueBackend`, позволяющий легко менять хранилище без изменения остального кода.

- MemoryBackend: In-memory хранилище для тестов и простых сценариев. Задачи хранятся в памяти процесса, что быстро, но не persistently.
- SQLBackend: Production-ready backend на базе SQLAlchemy. Поддерживает PostgreSQL, MySQL и SQLite с асинхронными драйверами. Использует lease-механизм (аренду задач) для предотвращения дубликатов, jittered polling (с случайными задержками) для избежания "thundering herd" и опцию `SKIP LOCKED` для PostgreSQL.

Схема БД создаётся с помощью метаданных из `pyjobkit.backends.sql.schema`. Вы можете использовать Alembic или ручные миграции.
### 2. Executors (Исполнители задач)

Executors — это модули, отвечающие за выполнение задач. Они реализуют простой протокол `Executor` с методом run(job_`id, payload, ctx)`, где `ctx` — контекст для логирования, прогресса и проверки отмены.

Встроенные executors:

- HTTPExecutor (kind="http"): Отправляет webhook-запросы. Payload должен содержать "url", "method" и опционально "headers", "body".
- SubprocessExecutor (kind="subprocess"): Запускает локальные shell-команды или скрипты. Payload: {"cmd": "echo 'Hello'" }.

Кастомные executors легко добавляются: определите класс с атрибутом `kind` и асинхронным методом `run`.

### 3. Engine (Движок)

`Engine` — фасад, объединяющий backend и список executors. Методы:

- `enqueue(kind, payload)`: Постановка задачи в очередь, возвращает job_id.
- `dequeue()`: Извлечение задач (используется worker'ом).

Поддерживает кастомные логгеры и event bus для observability.

### 4. Worker (Рабочий процесс)

`Worker` — асинхронный цикл на базе `asyncio.TaskGroup`. Он опрашивает backend, арендует задачи, распределяет их по executors и управляет concurrency. Параметры: max_concurrency, batch_size, lease_ttl, poll_interval.

### 5. Observability и CLI

- Логи и события: Встроенный in-memory логгер и event bus. Executors могут использовать `ctx.log()` и `ctx.set_progress()`.
- CLI: Команда `pyjobkit` запускает worker с флагами: `--dsn` (для SQL), `--concurrency`, `--lease-ttl`, `--poll-interval` и т.д. Пример: `pyjobkit --dsn postgresql+asyncpg://user:pass@host/db --concurrency 8`.

### Примеры запуска с разными кейсами

Давайте рассмотрим практические примеры. Все они основаны на asyncio, поэтому запускаются через asyncio.run().
### Кейс 1: Базовый in-memory запуск с кастомным executor

Этот пример демонстрирует простую обработку задач в памяти без БД. Создадим executor для приветствия.

```python
import asyncio
from pyjobkit import Engine, Worker
from pyjobkit.backends.memory import MemoryBackend
from pyjobkit.contracts import ExecContext, Executor

class HelloExecutor(Executor):
    kind = "hello"

    async def run(self, *, job_id, payload, ctx: ExecContext):
        await ctx.log(f"Обработка задачи {job_id}")
        name = payload.get("name", "мир")
        return {"message": f"Привет, {name}!"}

async def main():
    backend = MemoryBackend()
    engine = Engine(backend=backend, executors=[HelloExecutor()])
    worker = Worker(engine, max_concurrency=2)

    # Постановка задачи в очередь
    job_id = await engine.enqueue(kind="hello", payload={"name": "Ада"})
    print("Задача поставлена:", job_id)

    # Запуск worker (в production — в отдельном процессе)
    await worker.run()

asyncio.run(main())
```

Результат: Worker обработает задачу, выведет лог и вернёт сообщение. Идеально для тестов.

### Кейс 2: Использование SQL-backend с локальными скриптами

Переходим к persistent хранилищу. Сначала создайте схему БД.

```python
from sqlalchemy.ext.asyncio import create_async_engine
from pyjobkit.backends.sql.schema import metadata

async def create_schema():
    engine = create_async_engine("postgresql+asyncpg://user:pass@host/db")
    async with engine.begin() as conn:
        await conn.run_sync(metadata.create_all)

asyncio.run(create_schema())
```

Теперь запуск с SubprocessExecutor для bash-скрипта:

```python
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from pyjobkit import Engine, Worker
from pyjobkit.backends.sql import SQLBackend
from pyjobkit.executors import SubprocessExecutor

async def main():
    sql_engine = create_async_engine("postgresql+asyncpg://user:pass@host/db")
    backend = SQLBackend(sql_engine, lease_ttl_s=60)
    engine = Engine(backend=backend, executors=[SubprocessExecutor()])
    worker = Worker(engine, max_concurrency=4)

    # Постановка задачи: запуск bash-команды
    job_id = await engine.enqueue(kind="subprocess", payload={"cmd": "echo 'Hello from bash' && sleep 1"})
    print("Задача поставлена:", job_id)

    await worker.run()

asyncio.run(main())
```

Worker арендует задачу из БД и выполнит команду локально. Для production используйте CLI: `pyjobkit --dsn postgresql+asyncpg://user:pass@host/db --concurrency 4`.

### Кейс 3: Кастомный executor для удалённого запуска по SSH

Pyjobkit не имеет встроенной поддержки SSH, но её легко добавить через кастомный executor. Используем библиотеку asyncssh (установите `pip install asyncssh`).

```python
import asyncio
from asyncssh import connect as ssh_connect
from pyjobkit.contracts import ExecContext, Executor

class SSHExecutor(Executor):
    kind = "ssh"

    async def run(self, *, job_id, payload, ctx: ExecContext):
        host = payload["host"]
        cmd = payload["cmd"]
        username = payload.get("username", "user")
        key_path = payload.get("key_path")

        await ctx.log(f"Подключение к {host} для задачи {job_id}")
        async with ssh_connect(host, username=username, client_keys=[key_path]) as conn:
            result = await conn.run(cmd)
            if result.exit_status != 0:
                raise RuntimeError(f"Ошибка SSH: {result.stderr}")
            return {"output": result.stdout}

# В main добавьте SSHExecutor в executors
job_id = await engine.enqueue(kind="ssh", payload={
    "host": "example.com",
    "cmd": "bash remote_script.sh",
    "username": "deploy",
    "key_path": "/path/to/key"
})
```

Этот executor подключается по SSH, выполняет команду и возвращает вывод. Подходит для распределённых систем.

### Кейс 4: HTTP-запросы и продвинутый worker

Используем HTTPExecutor для webhook'ов.

```python
from pyjobkit.executors import HTTPExecutor

# В engine: executors=[HTTPExecutor()]

job_id = await engine.enqueue(kind="http", payload={
    "url": "https://api.example.com/webhook",
    "method": "POST",
    "body": {"data": "test"}
})
```

Worker отправит запрос асинхронно. Для мониторинга добавьте кастомный event bus в Engine.

### Расширения и продвинутые фичи

- Кастомные backends: Реализуйте `QueueBackend` для интеграции с Redis или Kafka.
- Observability: Замените дефолтный логгер на интеграцию с Loki или Prometheus.
- Масштабирование: Запускайте несколько worker'ов с общим SQL-backend для распределённой обработки.
- Обработка ошибок: Executors могут бросать исключения; worker продлит lease или отметит задачу как failed.

### Заключение

Pyjobkit — мощный инструмент для создания асинхронных job-систем с минимальным кодом. Его гибкость позволяет адаптировать под локальные скрипты, удалённые команды по SSH или веб-запросы. Начните с простого in-memory примера и масштабируйте до production с SQL. Для детальной документации загляните в репозиторий на GitHub. Если вы строите backend-сервисы, pyjobkit сэкономит вам время и сделает код надёжным.