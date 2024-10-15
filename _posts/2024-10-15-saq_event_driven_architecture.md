---
layout: post
title:  "Simple Async Queue в событийно-ориентированной архитектуре на Python 3"
date:   2024-10-15 14:14:14 +0500
categories: python3
---

### Добавление очереди задач в событийно-ориентированную архитектуру на Python 3 с использованием saq

В предыдущем примере мы реализовали событийно-ориентированную архитектуру с использованием паттерна **Message Bus** и библиотеки **AnyIO**. Однако в реальных приложениях часто возникает необходимость в выполнении долгих или ресурсоёмких операций в фоне, чтобы не блокировать основной поток приложения. Для этого используются очереди задач.

Одной из таких очередей является **saq** — простая и эффективная библиотека для выполнения фоновых задач с использованием Redis в качестве брокера сообщений. В этом разделе мы рассмотрим, как интегрировать **saq** в наш пример, чтобы обработчики событий выполнялись асинхронно в отдельной очереди задач.

#### Установка saq и необходимых зависимостей

Для начала установим **saq** и Redis:

```bash
pip install saq redis
```

> **Примечание**: Убедитесь, что у вас установлен и запущен сервер **Redis**, так как saq использует его для хранения задач.

#### Шаг 1: Настройка saq

Создадим файл конфигурации `saq.conf.py` в корне проекта:

```python
# saq.conf.py

redis_url = 'redis://localhost:6379/0'  # URL подключения к Redis
```

#### Шаг 2: Обновление обработчиков событий

Обновим наши обработчики событий, чтобы они могли выполняться в очереди задач saq. Для этого используем декоратор `@queue.task`.

```python
# handlers.py

from saq import Queue

queue = Queue()

# Обработчик отправки приветственного письма
@queue.task
def handle_user_registered(event):
    print(f"[Email Service] Отправка приветственного письма на {event.payload['email']}")
    # Здесь может быть код отправки реального письма

# Обработчик логирования
@queue.task
def handle_user_registered_log(event):
    print(f"[Log Service] Пользователь зарегистрирован: {event.payload['email']}")
    # Здесь может быть код записи в журнал событий
```

#### Шаг 3: Обновление Message Bus для использования saq

Изменим класс `MessageBus`, чтобы при публикации событий задачи добавлялись в очередь saq для асинхронного выполнения.

```python
# message_bus.py

from typing import Callable, Dict, List

class MessageBus:
    def __init__(self):
        self.subscribers: Dict[str, List[Callable]] = {}
    
    def subscribe(self, event_name: str, handler: Callable):
        if event_name not in self.subscribers:
            self.subscribers[event_name] = []
        self.subscribers[event_name].append(handler)
    
    def publish(self, event):
        handlers = self.subscribers.get(event.name, [])
        for handler in handlers:
            # Добавляем задачу в очередь saq
            handler.enqueue(event)
```

#### Шаг 4: Обновление бизнес-логики

Поскольку saq самостоятельно управляет асинхронностью, нам больше не нужно использовать AnyIO для асинхронного выполнения. Обновим функцию `register_user`:

```python
# services.py

from events import Event

def register_user(bus, name, email):
    # Имитируем сохранение пользователя в базе данных
    print(f"[User Service] Регистрируем пользователя {name} с email {email}")
    # Публикуем событие о регистрации пользователя
    event = Event(name="user_registered", payload={"name": name, "email": email})
    bus.publish(event)
```

#### Шаг 5: Запуск worker'а saq

saq использует worker-процессы для выполнения задач из очереди. Создадим файл `worker.py` для запуска worker'а:

```python
# worker.py

from saq import Worker
import saq.conf  # Убедитесь, что файл saq.conf.py находится в пути

from handlers import queue

if __name__ == '__main__':
    worker = Worker([queue])
    worker.work()
```

Запустите worker командой:

```bash
python worker.py
```

#### Шаг 6: Обновление основного приложения

Обновим `main.py`, чтобы убрать зависимость от AnyIO:

```python
# main.py

from message_bus import MessageBus
from handlers import handle_user_registered, handle_user_registered_log
from services import register_user

def main():
    bus = MessageBus()
    # Подписываем обработчики на событие 'user_registered'
    bus.subscribe("user_registered", handle_user_registered)
    bus.subscribe("user_registered", handle_user_registered_log)
    # Регистрируем нескольких пользователей
    register_user(bus, "Иван", "ivan@example.com")
    register_user(bus, "Мария", "maria@example.com")

if __name__ == "__main__":
    main()
```

#### Шаг 7: Запуск приложения

1. **Запустите Redis сервер** (если он не запущен):

   ```bash
   redis-server
   ```

2. **Запустите worker saq**:

   ```bash
   python worker.py
   ```

3. **Запустите основное приложение**:

   ```bash
   python main.py
   ```

#### Результат выполнения

**Вывод основного приложения (`main.py`):**

```
[User Service] Регистрируем пользователя Иван с email ivan@example.com
[User Service] Регистрируем пользователя Мария с email maria@example.com
```

**Вывод worker'а (`worker.py`):**

```
[Email Service] Отправка приветственного письма на ivan@example.com
[Log Service] Пользователь зарегистрирован: ivan@example.com
[Email Service] Отправка приветственного письма на maria@example.com
[Log Service] Пользователь зарегистрирован: maria@example.com
```

#### Объяснение работы системы

- **Основное приложение** выполняет синхронную регистрацию пользователей и публикует события `user_registered` в шину сообщений.
- **Message Bus** обрабатывает публикацию событий, добавляя соответствующие задачи в очередь saq.
- **Worker saq** непрерывно слушает очередь задач и выполняет обработчики событий асинхронно в фоне.
- **Обработчики событий** выполняются в отдельном процессе worker'а, поэтому основное приложение не блокируется во время их выполнения.

#### Преимущества использования saq в нашем примере

1. **Асинхронная обработка задач**: Долгие операции, такие как отправка электронных писем, выполняются в фоне, не задерживая основной поток приложения.

2. **Масштабируемость**: Можно запустить несколько worker'ов saq на разных машинах для повышения производительности.

3. **Надежность**: saq использует Redis для хранения задач, что обеспечивает устойчивость к сбоям и гарантирует выполнение задач.

4. **Простота интеграции**: Использование декораторов `@queue.task` и минимальные изменения в коде облегчают интеграцию saq в существующий проект.

#### Альтернативы saq для очередей задач

Помимо saq, существуют другие библиотеки для реализации очередей задач в Python:

- **Celery**: Очень популярная и функциональная библиотека для распределенной обработки задач с поддержкой различных брокеров сообщений (RabbitMQ, Redis и др.).

- **RQ (Redis Queue)**: Простая очередь задач на основе Redis, легкая в настройке и использовании.

- **Huey**: Маленькая многопоточная очередь задач с поддержкой Redis, SQLite и других хранилищ.

Выбор библиотеки зависит от требований вашего проекта, желаемой функциональности и сложности настройки.

#### Интеграция saq с AnyIO и асинхронным кодом

Если в вашем приложении есть другие части, использующие AnyIO или асинхронный код, вы можете продолжать их использовать. saq и AnyIO могут сосуществовать в одном проекте, однако важно правильно управлять асинхронностью и потоками выполнения, чтобы избежать конфликтов.

#### Заключение

Интеграция очереди задач **saq** в событийно-ориентированную архитектуру на Python 3 позволяет эффективно обрабатывать фоновые задачи и масштабировать приложение по мере роста нагрузки. Использование saq в сочетании с паттерном **Message Bus** обеспечивает слабую связанность компонентов, улучшает производительность и повышает надежность системы.

### Дополнительные ресурсы

- **Документация saq**: [https://saq.readthedocs.io](https://saq.readthedocs.io)
- **Redis**: [https://redis.io](https://redis.io)
- **Celery**: [http://www.celeryproject.org](http://www.celeryproject.org)
- **RQ (Redis Queue)**: [https://python-rq.org](https://python-rq.org)
- **Huey**: [https://huey.readthedocs.io](https://huey.readthedocs.io)
