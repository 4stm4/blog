---
layout: post
title:  "Введение в Multiprocessing (python) с примерами"
date:   2024-04-07 21:21:21 +0500
categories: python
---
<BR>

## Введение в Multiprocessing (python) с примерами

#### Process

 `Process` в модуле `multiprocessing` в Python представляет собой класс, который позволяет создавать отдельные процессы в операционной системе. Каждый экземпляр класса `Process` представляет отдельный процесс в системе, который может выполнять определенную задачу параллельно с другими процессами.

Основные особенности и методы класса `multiprocessing.Process` включают:

1. **`target`**: Атрибут, который определяет функцию, которая будет выполнена в создаваемом процессе.
2. **`args` и `kwargs`**: Параметры, которые передаются в целевую функцию.
3. **`start()`**: Метод, запускающий процесс.
4. **`join()`**: Метод, ожидающий завершения процесса.
5. **`is_alive()`**: Метод, проверяющий, активен ли процесс.
6. **`terminate()`**: Метод, завершающий процесс принудительно.

Создание процессов с использованием класса `Process` из модуля `multiprocessing` позволяет распараллеливать выполнение задач в Python, что особенно полезно для многозадачных вычислений или исполнения задач, требующих параллельной обработки.

Пример использования класса `Process`:
```python
import multiprocessing
import os

# Функция, которая будет выполнена в каждом процессе
def print_info(name):
	print(f'Процесс {name}, ID процесса: {os.getpid()}')

if __name__ == '__main__': # Создание объектов процессов
    process1 = multiprocessing.Process(target=print_info, args=('Процесс 1',))
    process2 = multiprocessing.Process(target=print_info, args=('Процесс 2',))
    # Запуск процессов
    process1.start()
    process2.start()

    # Ожидание завершения процессов
    process1.join()
    process2.join()
```
Обратите внимание на ключевую проверку `if __name__ == '__main__':`, которая необходима для избежания проблем при работе с модулем `multiprocessing` на платформах, поддерживающих процессы. После запуска этого кода вы должны увидеть вывод, подобный следующему: 
```
Процесс 1, ID процесса: 5425
Процесс 2, ID процесса: 5426
```
Здесь `5425` и `5426` - это идентификаторы процессов. Каждый процесс запускает функцию `print_info` с заданным именем и выводит результат с соответствующим идентификатором процесса.

____
#### Pool
`Pool` в модуле `multiprocessing` в Python представляет собой класс, который предоставляет удобный интерфейс для создания пула процессов, которые могут выполнять задачи параллельно. Пул процессов `Pool` управляет группой рабочих процессов и распределяет задачи между ними, обеспечивая параллельное выполнение операций.

Некоторые ключевые особенности и методы класса `multiprocessing.Pool` включают:

1. **`map(func, iterable)`**: Метод, позволяющий применять функцию `func` к каждому элементу в `iterable` параллельно.
2. **`apply(func, args)`**: Метод, позволяющий применять функцию `func` к аргументам `args` в одном процессе пула.
3. **`close()`**: Метод, закрывающий пул процессов для дальнейших задач.
4. **`terminate()`**: Метод, завершающий все процессы в пуле.
5. **`join()`**: Метод, блокирующий выполнение программы до завершения всех задач в пуле.

Использование класса `Pool` упрощает работу с параллельными вычислениями за счет автоматической диспетчеризации задач между процессами пула.
`cpu_count()` используется для определения количества доступных CPU на вашей машине, исходя из этого задействуются соответствующее количество рабочих процессов. 

Пример кода с `Pool`:

```python
import multiprocessing from multiprocessing
import Pool

def square(n):
return n * n

if __name__ == '__main__':
# Определяем количество доступных ядер процессора
num_processors = multiprocessing.cpu_count()
# Создаем пул процессов
with Pool(processes=num_processors) as pool:
    # Задаем список чисел для обработки
    numbers = [1, 2, 3, 4, 5]
    # Используем Pool для распределения работы по процессам
    results = pool.map(square, numbers)
print(results)
```
 Затем мы используем `pool.map()` для распределения работы по процессам. В данном случае функция `square` просто возводит число в квадрат. Результаты вычислений будут сохранены в `results`, и мы выводим их на экран. Этот код будет выполняться параллельно на нескольких процессорах, ускоряя выполнение, особенно при выполнении длительных и вычислительно затратных операций.

____
#### Queue
`Queue` в Python - это механизм, который позволяет организовать обмен данными между процессами. Он обеспечивает безопасную передачу информации между различными потоками выполнения в многопроцессорной среде.

`multiprocessing.Queue` в частности является реализацией очереди, предоставляемой модулем `multiprocessing` стандартной библиотеки Python. Он обеспечивает функциональность многопоточного доступа к общей очереди для обмена данными между процессами.

Основные характеристики и принципы работы `multiprocessing.Queue` включают:

1. **Помещение элементов в очередь (put)**: Вызов метода `put()` вставляет элемент в конец очереди.
2. **Извлечение элементов из очереди (get)**: Вызов метода `get()` удаляет и возвращает элемент из начала очереди.
3. **Проверка наличия элементов (empty)**: Метод `empty()` проверяет, пуста ли очередь.
4. **Блокировка доступа к элементам**: `multiprocessing.Queue` использует механизм блокировок для обеспечения безопасности доступа к общим данным из разных процессов.

Использование `Queue` упрощает взаимодействие между процессами и может быть полезным при распределенной обработке данных, создании потоков обработки или реализации других задач, связанных с параллельным выполнением в Python.

 ```python
 import multiprocessing
 import time
 
def write_data(queue, data):
	 for item in data:
		 queue.put(item)
		 print(f"Процесс сообщает: {item}")
		 time.sleep(1) # Имитация некоторой работы
		 print("Данные успешно записаны в очередь")

def read_data(queue):
	result = []
	while not queue.empty():
		item = queue.get()
		result.append(item)
	print("Данные успешно прочитаны из очереди")
	return result

if __name__ == '__main__':
	shared_queue = multiprocessing.Queue()
	data_to_send = [1, 2, 3, 4, 5]
	writer_process = multiprocessing.Process(target=write_data, args=(shared_queue, data_to_send))
	reader_process = multiprocessing.Process(target=read_data, args=(shared_queue,))

	writer_process.start()
	reader_process.start()

	writer_process.join()
	reader_process.join()

	result = read_data(shared_queue)
	print("Результат из очереди:", result)
 ```

____
#### Manager
`Manager` в модуле `multiprocessing` в Python - это класс, который предоставляет способы синхронизации данных между процессами. Он обеспечивает возможность создания разделяемых объектов, таких как списки, словари, пространства имен и т. д., которые могут использоваться различными процессами для обмена данными. Некоторые ключевые возможности и методы класса `multiprocessing.Manager` включают:
1. **`list()`**: Создает разделяемый список для использования между процессами.
2. **`dict()`**: Создает разделяемый словарь для использования между процессами.
3. **`Value()`**: Создает разделяемую переменную для использования между процессами.
4. **`Array()`**: Создает разделяемый массив для использования между процессами.
5. **`Lock()`**: Создает объект блокировки для синхронизации доступа к разделяемым ресурсам.
Использование менеджера (Manager) в многопроцессорной среде позволяет синхронизировать доступ к общим данным и избегать конфликтов при параллельной обработке. Менеджер обеспечивает безопасное взаимодействие между процессами, предоставляя удобные средства для работы с общими ресурсами. Пример использования `Manager` может быть полезен, когда необходимо обмениваться данными между процессами и обеспечивать безопасный доступ к общим ресурсам в многопроцессорной среде.

Приведу небольшие примеры использования `Manager` с различными типами переменных в модуле `multiprocessing`. 
1. Пример с разделяемым списком (`list()`):

```python
import multiprocessing

def append_to_list(shared_list, value):
	shared_list.append(value)

if __name__ == "__main__":
	manager = multiprocessing.Manager()
	shared_list = manager.list()
	process = multiprocessing.Process(target=append_to_list, args=(shared_list, 42))
	process.start()
	process.join()
	print("Разделяемый список:", shared_list)
```

2. Пример с разделяемым словарем (`dict()`):

```python
import multiprocessing

def update_dict(shared_dict, key, value):
	shared_dict[key] = value

if __name__ == "__main__":
	manager = multiprocessing.Manager()
	shared_dict = manager.dict()
	process = multiprocessing.Process(target=update_dict, args=(shared_dict, 'key', 'value'))
	process.start()
	process.join()
	print("Разделяемый словарь:", shared_dict)
```

3. Пример с разделяемой переменной (`Value()`):

```python
import multiprocessing

def update_value(shared_value):
	shared_value.value = 100

if __name__ == "__main__":
	manager = multiprocessing.Manager()
	shared_value = manager.Value('i', 0) # 'i' указывает на целое число
	process = multiprocessing.Process(target=update_value, args=(shared_value,)) 
	process.start()
	process.join()
	print("Разделяемая переменная:", shared_value.value)
```

4. Пример с разделяемым массивом (`Array()`):

```python
import multiprocessing

def update_array(shared_array):
	shared_array[0] = 99

if __name__ == "__main__":
	manager = multiprocessing.Manager()
	shared_array = manager.Array('i', [0, 0, 0]) # 'i' указывает на целые числа
	process = multiprocessing.Process(target=update_array, args=(shared_array,))
	process.start()
	process.join()
	print("Разделяемый массив:", shared_array[:])
```

5. Пример использования блокировки (`Lock()`):

```python
 import multiprocessing

def increment_counter(counter, lock):
    with lock:
        counter.value += 1

if __name__ == "__main__":
	manager = multiprocessing.Manager()
	counter = manager.Value('i', 0) # Счетчик
	lock = manager.Lock()

	processes = []
	for _ in range(3):
		process = multiprocessing.Process(target=increment_counter, args=(counter, lock))
		processes.append(process)
		process.start()

	for process in processes:
		process.join()

	print("Итоговое значение счетчика:", counter.value)
```

Эти примеры иллюстрируют использование менеджера `Manager` с различными типами переменных для обмена данными между процессами и обеспечения безопасного доступа к общим ресурсам в многопроцессорной среде.

____
#### Lock, Event, Condition и Semaphore
`Lock`, `Event`, `Condition` и `Semaphore` являются инструментами синхронизации, которые предоставляют различные способы управления доступом к общим ресурсам и координации выполнения многопоточных или многопроцессорных программ. Вот более подробное объяснение каждого из этих механизмов и их области применения:

1. **Lock (блокировка)**:
    - **Назначение**: `Lock` применяется для обеспечения эксклюзивного доступа к критическим участкам кода или общим ресурсам между потоками или процессами. Он помогает избежать конфликтов при параллельном доступе к данным.
    - **Пример применения**: Когда несколько процессов или потоков должны обновлять какое-то общее значение, `Lock` гарантирует, что только один процесс/поток имеет доступ к редактированию данного значения в определенный момент времени.
    
2. **Event (событие)**:
    - **Назначение**: `Event` используется для сигнализации между процессами или потоками. Один процесс/поток может уведомить другие о том, что событие произошло.
    - **Пример применения**: Пусть один процесс ждет, пока другой процесс завершит свою работу. В этом случае `Event` может использоваться для синхронизации и уведомления о завершении работы.
    
3. **Condition (условие)**:
    - **Назначение**: `Condition` обычно используется в сочетании с `Lock` для блокировки и разблокировки выполнения потоков/процессов на основе некоторого условия.
    - **Пример применения**: Множество потоков ждут произошедшего события или изменения состояния, и только когда условие становится истинным, потоки могут продолжить выполнение.
    
4. **Semaphore (семафор)**:
    - **Назначение**: `Semaphore` используется для управления ограниченным набором ресурсов путем установки определенного количества разрешений доступа к ресурсу.
    - **Пример применения**: Предположим, имеется пул из нескольких ресурсов, и разные процессы могут запрашивать доступ к этим ресурсам. Семафор гарантирует, что одновременно не более определенного числа процессов будет иметь доступ к ресурсам.

**Разница между `Lock`, `Event`, `Condition` и `Semaphore`**:
- `Lock` используется для обеспечения критической секции в многопоточной среде.
- `Event` используется для сигнализации между процессами/потоками.
- `Condition` обычно используется в сочетании с `Lock` для ожидания некоторого условия.
- `Semaphore` управляет доступом к общим ресурсам, устанавливая ограничения на количество процессов, имеющих к ним доступ одновременно.

Разные механизмы синхронизации использовать в зависимости от конкретной ситуации и требований вашего приложения в многопоточной или многопроцессорной среде.

1. Пример с `Lock`:

```python
import multiprocessing

def increment(counter, lock):
    for _ in range(1000):
        lock.acquire()
        counter.value += 1
        lock.release()

if __name__ == "__main__":
    counter = multiprocessing.Value('i', 0)
    lock = multiprocessing.Lock()

    processes = [multiprocessing.Process(target=increment, args=(counter, lock)) for _ in range(5)]

    for process in processes:
        process.start()

    for process in processes:
        process.join()

    print("Итоговое значение счетчика с Lock:", counter.value)
```

2. Пример с `Event`:

```python
import multiprocessing

def wait_for_event(event, message):
    print(f"Ожидание события в процессе: {message}")
    event.wait()
    print(f"Событие произошло в процессе: {message}")

if __name__ == "__main__":
    event = multiprocessing.Event()

    process1 = multiprocessing.Process(target=wait_for_event, args=(event, "Процесс 1"))
    process2 = multiprocessing.Process(target=wait_for_event, args=(event, "Процесс 2"))

    process1.start()
    process2.start()

    print("Запускаем событие")
    event.set()

    process1.join()
    process2.join()
```

3. Пример с `Condition`:

```python
import multiprocessing

def worker_with_condition(condition, shared_resource):
    with condition:
        shared_resource.value += 1
        print(f"Процесс {multiprocessing.current_process().name} увеличил общий ресурс до {shared_resource.value}")
        condition.notify()

if __name__ == "__main__":
    condition = multiprocessing.Condition()
    shared_resource = multiprocessing.Value('i', 0)

    processes = [multiprocessing.Process(target=worker_with_condition, args=(condition, shared_resource)) for _ in range(3)]

    for process in processes:
        process.start()

    for process in processes:
        process.join()
```

4. Пример с `Semaphore`:

```python
import multiprocessing

def worker_with_semaphore(semaphore, value):
    semaphore.acquire()
    try:
        print(f"Поток {multiprocessing.current_process().name} захватил семафор")
        print(f"Значение переменной: {value.value}")
        value.value += 1
    finally:
        semaphore.release()
        print(f"Поток {multiprocessing.current_process().name} освободил семафор")

if __name__ == "__main__":
    semaphore = multiprocessing.Semaphore(2)
    value = multiprocessing.Value('i', 0)

    processes = [
        multiprocessing.Process(target=worker_with_semaphore, args=(semaphore, value)),
        multiprocessing.Process(target=worker_with_semaphore, args=(semaphore, value))
    ]

    for process in processes:
        process.start()

    for process in processes:
        process.join()

    print("Итоговое значение переменной:", value.value)
```

____
#### Pipe
`Pipe` в Python относится к механизму для обмена данными между процессами. Пайп позволяет установить двунаправленный канал связи между родительским и дочерним процессами. Он предоставляет способ для передачи данных в обе стороны между процессами, когда это необходимо.

### Как используется `Pipe`?

1. **Обмен данными между процессами**: Когда двум процессам или потокам требуется обмениваться данными, `Pipe` может обеспечить связь между ними. В канал `Pipe`  можно передавать множество типов данных, включая базовые типы данных и пользовательские объекты.
2. **Синхронизация**: `Pipe` также может использоваться для согласования работы между параллельными процессами.
3. **Канал коммуникации**: Это полезный инструмент для передачи информации и управления потоками данных между отдельными процессами.

### Проблемы, связанные с использованием `Pipe`:
1. **Гонки данных**: При неправильной синхронизации при чтении и записи из канала возможны ситуации гонок данных (race conditions).
2. **Блокировки**: Если не обработать внимательно логику работы с каналом, процессы могут заблокироваться, например, при чтении из пустого канала.
3. **Очередь данных**: `Pipe` - это простой канал, и по мере роста сложности обмена данными и сигналами между процессами может потребоваться более сложное управление очередью данных и сообщений.
4. **Сложность отладки**: Обмен данными через каналы может сделать отладку приложения сложной, особенно при несоответствии ожидаемых данных.
5. **Производительность**: Использование каналов для обмена большими объемами данных или в случае высоких частот обмена может повлиять на производительность из-за накладных расходов на коммуникацию и синхронизацию.

Хотя `Pipe` является полезным инструментом для межпроцессорного обмена данными, важно правильно управлять этим механизмом, учитывая потенциальные проблемы синхронизации, безопасности данных и производительности.

Пример использования Pipe:
```python
import multiprocessing

# Функция производителя, отправляющая данные через канал
def producer(connection):
    data_to_send = ["сообщение 1", "сообщение 2", "сообщение 3"]
    for msg in data_to_send:
        connection.send(msg)
        print(f"Отправлено: {msg}")
    connection.close()

# Функция потребителя, получающая данные из канала
def consumer(connection):
    while connection.poll():  # Проверка наличия данных в канале
        msg = connection.recv()
        print(f"Получено: {msg}")
    print("Процесс получил все данные")
    connection.close()

if __name__ == '__main__':
    parent_conn, child_conn = multiprocessing.Pipe()

    producer_process = multiprocessing.Process(target=producer, args=(parent_conn,))
    consumer_process = multiprocessing.Process(target=consumer, args=(child_conn,))

    producer_process.start()
    consumer_process.start()

    producer_process.join()

    # Чтобы завершить работу потребителя, отправляем None
    parent_conn.send(None)

    consumer_process.join()
```