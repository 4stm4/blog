---
layout: post
title:  "Выжимка: Linux для сетевых инженеров. Глава 2. Базовая конфигурация сети  в Linux."
date:   2024-06-25 18:18:18 +0500
categories: linux
---

## Выжимка: Linux для сетевых инженеров. Глава 2. Базовая конфигурация сети  в Linux.

##### Установка устаревших команд (ifconfig, etc):
Применяется на старых системах, устанавливаем для изучения. Можно пропустить.

```bash
sudo apt install net-tools
```

##### Вывод информации об IP интерфейсах:

```bash
ip address # можно сокращать команду до ip a,  ip addr,  etc
ip -4 a # только IP версии 4
```

Устаревшей командой:

```bash
ifconfig
```

##### Вывод сведений о маршрутизации:

```bash
ip route
```

Устаревшей командой:

```bash
netstat -rn
# или
route -n
```

##### Как назначить IP-адрес интерфейсу (Network Manager Command Line):

Отобразить сетевые подключения:

```bash
sudo nmcli connection show
```

Назначить:

```bash
sudo nmcli connection modify "Wired connection 1" ipv4.addresses 192.168.122.22/24
sudo nmcli connection modify "Wired connection 1" ipv4.gateway 192.168.122.1
sudo nmcli connection modify "Wired connection 1" ipv4.dns "8.8.8.8"
sudo nmcli connection modify "Wired connection 1" ipv4.method manual
sudo nmcli connection up "Wired connection 1" # сохраним
```

##### Добавить маршрут:

временный 

```bash
sudo ip route add 10.10.10.0/24 via
```

постоянный 

```bash
sudo nmcli connection modify "Wired connection 1" +ipv4.routes "10.10.10.0/24 192.168.122.11" # добавляем маршрут к сети через 192.168.122.11
```

проверить добавленный маршрут 

```bash
ip route
```

##### Как отключать и включать сетевой интерфейс:

```bash
sudo ip link set ens33 down # ens33 отключаемый интерфейс
sudo ip link set ens33 up # включить
```

Устаревшей командой:

```bash
sudo ifconfig ens33 down # выключить
sudo ifconfig ens33 up # включить
```

##### Как настроить MTU для интерфейса:

MTU - максимальный размер полезной нагрузки кадра, по умолчанию 1500 байт.
Для интерфейсов хранилищ данных, резервного копирования и т.д. рекомендуется увеличивать размер MTU. Пакет размером 9000 байт называется jumbo - кадром.

```bash
sudo nmcli connection modify "Wired connection 1" 802-3-ethernet.mtu 9000
sudo nmcli connection up "Wired connection 1"
```

##### Интерактивный режим nmcli:

Чтобы войти в оболочку для интерфейса Ethernet:

```bash
sudo nmcli connection edit type ethernet
```

Для вывода информации о Ethernet интерфейсе:

```nmcli
nmcli> print
```

