---
layout: post
title:  "Базовые знания Linux"
date:   2024-02-13 18:18:18 +0500
categories: linux
language: ru
---

## Базовые знания Linux

- Система
- Пользователи
- сеть
- Запуск служб
### Система

В системе Linux мы можем получить дополнительную информацию о дистрибутиве и версии выпуска Linux, выполнив поиск файлов или ссылок, которые заканчиваются`-release` на `/etc/`. 

```shell-session
user@host$ ls /etc/*-release
/etc/centos-release  /etc/os-release  /etc/redhat-release  /etc/system-release
$ cat /etc/os-release 
NAME="CentOS Linux"
VERSION="7 (Core)"
[...]
```

Давайте попробуем систему Fedora.

```shell-session
user@host$ ls /etc/*-release
/etc/fedora-release@  /etc/os-release@  /etc/redhat-release@  /etc/system-release@
$ cat /etc/os-release
NAME="Fedora Linux"
VERSION="36 (Workstation Edition)"
[...]
```

Мы можем узнать имя системы с помощью команды `hostname`.

```shell-session
user@host$ hostname
rpm-red-enum.thm
```

Различные файлы в системе могут предоставить много полезной информации. В частности, рассмотрим следующие `/etc/passwd`, `/etc/group`, и `/etc/shadow`. Любой пользователь может читать файлы `passwd`и файлы `group`. Однако `shadow`файл паролей требует привилегий root, поскольку он содержит хешированные пароли. Если вам удастся взломать хеши, вы узнаете исходный пароль пользователя.

```shell-session
user@host$ cat /etc/passwd
root:x:0:0:root:/root:/bin/bash
[...]
michael:x:1001:1001::/home/michael:/bin/bash
peter:x:1002:1002::/home/peter:/bin/bash
jane:x:1003:1003::/home/jane:/bin/bash
randa:x:1004:1004::/home/randa:/bin/bash

$ cat /etc/group
root:x:0:
[...]
michael:x:1001:
peter:x:1002:
jane:x:1003:
randa:x:1004:

$ sudo cat /etc/shadow
root:$6$pZlRFi09$qqgNBS.00qtcUF9x0yHetjJbXsw0PAwQabpCilmAB47ye3OzmmJVfV6DxBYyUoWBHtTXPU0kQEVUQfPtZPO3C.:19131:0:99999:7:::
[...]
michael:$6$GADCGz6m$g.ROJGcSX/910DEipiPjU6clo6Z6/uBZ9Fvg3IaqsVnMA.UZtebTgGHpRU4NZFXTffjKPvOAgPKbtb2nQrVU70:19130:0:99999:7:::
peter:$6$RN4fdNxf$wvgzdlrIVYBJjKe3s2eqlIQhvMrtwAWBsjuxL5xMVaIw4nL9pCshJlrMu2iyj/NAryBmItFbhYAVznqRcFWIz1:19130:0:99999:7:::
jane:$6$Ees6f7QM$TL8D8yFXVXtIOY9sKjMqJ7BoHK1EHEeqM5dojTaqO52V6CPiGq2W6XjljOGx/08rSo4QXsBtLUC3PmewpeZ/Q0:19130:0:99999:7:::
randa:$6$dYsVoPyy$WR43vaETwoWooZvR03AZGPPKxjrGQ4jTb0uAHDy2GqGEOZyXvrQNH10tGlLIHac7EZGV8hSIfuXP0SnwVmnZn0:19130:0:99999:7:::
```

Аналогично, различные каталоги могут раскрывать информацию о пользователях и могут содержать конфиденциальные файлы; один из них — почтовые каталоги, найденные по адресу `/var/mail/`.

```shell-session
user@host$ ls -lh /var/mail/
total 4.0K
-rw-rw----. 1 jane      mail   0 May 18 14:15 jane
-rw-rw----. 1 michael   mail   0 May 18 14:13 michael
-rw-rw----. 1 peter     mail   0 May 18 14:14 peter
-rw-rw----. 1 randa     mail   0 May 18 14:15 randa
-rw-------. 1 root      mail 639 May 19 07:37 root
```

Чтобы найти установленные приложения, вы можете просмотреть список файлов в `/usr/bin/`и `/sbin/`:

- `ls -lh /usr/bin/`
- `ls -lh /sbin/`

В системе Linux на базе RPM вы можете получить список всех установленных пакетов, используя`rpm -qa` . указывает `-qa`, что мы хотим _запросить все_ пакеты.

В системе Linux на базе Debian вы можете получить список установленных пакетов, используя`dpkg -l` . Вывод ниже получен с сервера Ubuntu.

```shell-session
user@host$ dpkg -l
Desired=Unknown/Install/Remove/Purge/Hold
| Status=Not/Inst/Conf-files/Unpacked/halF-conf/Half-inst/trig-aWait/Trig-pend
|/ Err?=(none)/Reinst-required (Status,Err: uppercase=bad)
||/ Name                                  Version                            Architecture Description
+++-=====================================-==================================-============-===================================================================
ii  accountsservice                       0.6.55-0ubuntu12~20.04.5           amd64        query and manipulate user account information
ii  adduser                               3.118ubuntu2                       all          add and remove users and groups
ii  alsa-topology-conf                    1.2.2-1                            all          ALSA topology configuration files
ii  alsa-ucm-conf                         1.2.2-1ubuntu0.13                  all          ALSA Use Case Manager configuration files
ii  amd64-microcode                       3.20191218.1ubuntu1                amd64        Processor microcode firmware for AMD CPUs
[...   ]
ii  zlib1g-dev:amd64                      1:1.2.11.dfsg-2ubuntu1.3           amd64        compression library - development
```

### Пользователи

Такие файлы, как `/etc/passwd`раскрывают имена пользователей; однако различные команды могут предоставить дополнительную информацию и сведения о других пользователях системы и их местонахождении.

Вы можете показать, кто вошел в систему, используя `who`.

```shell-session
user@host$ who
root     tty1         2022-05-18 13:24
jane     pts/0        2022-05-19 07:17 (10.20.30.105)
peter    pts/1        2022-05-19 07:13 (10.20.30.113)
```

Мы видим, что пользователь `root`вошел в систему напрямую, а пользователи `jane`и `peter`подключаются по сети, и мы можем видеть их IP-адреса.

Обратите внимание, что `who`не следует путать с `whoami`тем, что печатает **ваш** эффективный идентификатор пользователя.

```shell-session
user@host$ whoami
jane
```

Чтобы перейти на новый уровень, вы можете использовать `w`, который показывает, кто вошел в систему и что они делают. Судя по выводам терминала ниже, в этом примере выполняется `peter`редактирование .`notes.txt``jane``w`

```shell-session
user@host$ w
 07:18:43 up 18:05,  3 users,  load average: 0.00, 0.01, 0.05
USER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT
root     tty1                      Wed13   17:52m  0.00s  0.00s less -s
jane     pts/0    10.20.30.105     07:17    3.00s  0.01s  0.00s w
peter    pts/1    10.20.30.113     07:13    5:23   0.00s  0.00s vi notes.txt
```

Чтобы распечатать реальный и эффективный идентификатор пользователя и группы , вы можете ввести команду`id` (для идентификатора).

```shell-session
user@host$ id
uid=1003(jane) gid=1003(jane) groups=1003(jane) context=unconfined_u:unconfined_r:unconfined_t:s0-s0:c0.c1023
```

Хотите знать, кто недавно использовал систему? `last`отображает список последних вошедших в систему пользователей; более того, мы можем видеть, кто вышел из системы и насколько они оставались на связи. В приведенном ниже выводе пользователь `randa`оставался в системе почти 17 часов, а `michael`вышел из системы через четыре минуты.

```shell-session
user@host$ last
jane     pts/0        10.20.30.105     Thu May 19 07:17   still logged in   
peter    pts/1        10.20.30.113     Thu May 19 07:13   still logged in   
michael  pts/0        10.20.30.1       Thu May 19 05:12 - 05:17  (00:04)    
randa    pts/1        10.20.30.107     Wed May 18 14:18 - 07:08  (16:49)    
root     tty1                          Wed May 18 13:24   still logged in
[...]
```

Наконец, стоит упомянуть, что `sudo -l`здесь перечислены разрешенные команды для вызывающего пользователя в текущей системе.

### сеть

IP-адреса можно отобразить с помощью `ip address show`(которую можно сократить до `ip a s`) или с помощью более старой команды `ifconfig -a`(ее пакет больше не поддерживается). Вывод терминала ниже показывает сетевой интерфейс `ens33`с IP-адресом `10.20.30.129`и маской подсети `255.255.255.0`в том виде, в котором он есть `24`.

```shell-session
user@host$ ip a s
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host 
       valid_lft forever preferred_lft forever
2: ens33: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc pfifo_fast state UP group default qlen 1000
    link/ether 00:0c:29:a2:0e:7e brd ff:ff:ff:ff:ff:ff
    inet 10.20.30.129/24 brd 10.20.30.255 scope global noprefixroute dynamic ens33
       valid_lft 1580sec preferred_lft 1580sec
    inet6 fe80::761a:b360:78:26cd/64 scope link noprefixroute 
       valid_lft forever preferred_lft forever
```

DNS - серверы можно найти в папке `/etc/resolv.conf`. Рассмотрим следующий вывод терминала для системы, которая использует DHCP для сетевых конфигураций. DNS, то есть сервер имен, установлен на`10.20.30.2` .

```shell-session
user@host$ cat /etc/resolv.conf
# Generated by NetworkManager
search localdomain thm
nameserver 10.20.30.2
```

`netstat`— полезная команда для изучения сетевых подключений, таблиц маршрутизации и статистики интерфейса. Мы объясним некоторые из его многочисленных вариантов в таблице ниже.

|Вариант|Описание|
|---|---|
|`-a`|показывать как прослушиваемые, так и неслушающие сокеты|
|`-l`|показывать только сокеты прослушивания|
|`-n`|показывать числовой вывод вместо разрешения IP-адреса и номера порта|
|`-t`|TCP|
|`-u`|UDP|
|`-x`|UNIX|
|`-p`|Показать PID и имя программы, которой принадлежит сокет|

Вы можете использовать любую комбинацию, которая соответствует вашим потребностям. Например, `netstat -plt`вернет _программы, прослушивающие TCP-_ сокеты. Как мы видим на выводе терминала ниже, он прослушивает `sshd`порт SSH и порт SMTP как на адресах IPv4, так и на IPv6. Обратите внимание: чтобы получить все PID (идентификатор процесса) и имена программ, вам необходимо запускать их от имени пользователя root или использовать .`master``netstat``sudo netstat`

```shell-session
user@host$ sudo netstat -plt
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name    
tcp        0      0 0.0.0.0:ssh             0.0.0.0:*               LISTEN      978/sshd            
tcp        0      0 localhost:smtp          0.0.0.0:*               LISTEN      1141/master         
tcp6       0      0 [::]:ssh                [::]:*                  LISTEN      978/sshd            
tcp6       0      0 localhost:smtp          [::]:*                  LISTEN      1141/master
```

`netstat -atupn`отобразит _все_ прослушиваемые и установленные соединения _TCP_ _и UDP_ _, а также имена программ_ с адресами и портами в _числовом_ формате.

```shell-session
user@host$ sudo netstat -atupn
Active Internet connections (servers and established)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name    
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      978/sshd            
tcp        0      0 127.0.0.1:25            0.0.0.0:*               LISTEN      1141/master         
tcp        0      0 10.20.30.129:22         10.20.30.113:38822        ESTABLISHED 5665/sshd: peter [p 
tcp        0      0 10.20.30.129:22         10.20.30.105:38826        ESTABLISHED 5723/sshd: jane [pr 
tcp6       0      0 :::22                   :::*                    LISTEN      978/sshd            
tcp6       0      0 ::1:25                  :::*                    LISTEN      1141/master         
udp        0      0 127.0.0.1:323           0.0.0.0:*                           640/chronyd         
udp        0      0 0.0.0.0:68              0.0.0.0:*                           5638/dhclient       
udp6       0      0 ::1:323                 :::*                                640/chronyd
```

Можно подумать, что использование `nmap`до получения доступа к целевой машине дало бы сопоставимый результат. Однако это не совсем так. Nmap необходимо генерировать относительно большое количество пакетов для проверки открытых портов, что может активировать системы обнаружения и предотвращения вторжений. Кроме того, брандмауэры на маршруте могут отбрасывать определенные пакеты и препятствовать сканированию, что приводит к неполным результатам Nmap.

`lsof`означает «Список открытых файлов». Если мы хотим отображать только Интернет и сетевые подключения, мы можем использовать `lsof -i`. Вывод терминала ниже показывает службы прослушивания IPv4 и IPv6 и текущие соединения. Пользователь `peter`подключается к серверу `rpm-red-enum.thm`по `ssh`порту. Обратите внимание: чтобы получить полный список подходящих программ, вам необходимо запустить их `lsof`от имени пользователя root или использовать `sudo lsof`.

```shell-session
user@host$ sudo lsof -i
COMMAND   PID      USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
chronyd   640    chrony    5u  IPv4  16945      0t0  UDP localhost:323 
chronyd   640    chrony    6u  IPv6  16946      0t0  UDP localhost:323 
sshd      978      root    3u  IPv4  20035      0t0  TCP *:ssh (LISTEN)
sshd      978      root    4u  IPv6  20058      0t0  TCP *:ssh (LISTEN)
master   1141      root   13u  IPv4  20665      0t0  TCP localhost:smtp (LISTEN)
master   1141      root   14u  IPv6  20666      0t0  TCP localhost:smtp (LISTEN)
dhclient 5638      root    6u  IPv4  47458      0t0  UDP *:bootpc 
sshd     5693     peter    3u  IPv4  47594      0t0  TCP rpm-red-enum.thm:ssh->10.20.30.113:38822 (ESTABLISHED)
[...]
```

Поскольку список может получиться довольно длинным, вы можете дополнительно отфильтровать выходные данные, указав интересующие вас порты, например SMTP- порт 25. Запустив`lsof -i :25` , мы ограничиваем выходные данные теми, которые относятся к порту 25, как показано в выводе терминала ниже. . Сервер прослушивает порт 25 как по адресам IPv4, так и по IPv6.

```shell-session
user@host$ sudo lsof -i :25
COMMAND  PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
master  1141 root   13u  IPv4  20665      0t0  TCP localhost:smtp (LISTEN)
master  1141 root   14u  IPv6  20666      0t0  TCP localhost:smtp (LISTEN)
```

### Запуск служб

Получение снимка запущенных процессов может дать много полезной информации. `ps`позволяет вам обнаружить запущенные процессы и получить множество информации о них.

Вы можете перечислить все процессы в системе, используя `ps -e`, где `-e`выбираются все процессы. Более подробную информацию о процессе можно добавить `-f`для полноформатного и `-l`для длинного формата. Поэкспериментируйте с `ps -e`, `ps -ef`, и `ps -el`.

Вы можете получить сопоставимый результат и увидеть все процессы, используя синтаксис BSD: `ps ax`или `ps aux`. Обратите внимание, что `a`и `x`необходимы при использовании синтаксиса BSD, поскольку они снимают ограничения «только вы» и «должен иметь tty»; другими словами, становится возможным отображать все процессы. Для `u`получения подробной информации о пользователе, у которого есть процесс.

|Вариант|Описание|
|---|---|
|`-e`|все процессы|
|`-f`|полноформатный листинг|
|`-j`|формат вакансий|
|`-l`|длинный формат|
|`-u`|ориентированный на пользователя формат|

Для более «наглядного» вывода можно вывести `ps axjf`на печать дерево процессов. Означает `f`«лес» и создает иерархию художественных процессов ASCII, как показано в выводе терминала ниже.

```shell-session
user@host$ ps axf
   PID TTY      STAT   TIME COMMAND
     2 ?        S      0:00 [kthreadd]
     4 ?        S<     0:00  \_ [kworker/0:0H]
     5 ?        S      0:01  \_ [kworker/u256:0]
[...]
   978 ?        Ss     0:00 /usr/sbin/sshd -D
  5665 ?        Ss     0:00  \_ sshd: peter [priv]
  5693 ?        S      0:00  |   \_ sshd: peter@pts/1
  5694 pts/1    Ss     0:00  |       \_ -bash
  5713 pts/1    S+     0:00  |           \_ vi notes.txt
  5723 ?        Ss     0:00  \_ sshd: jane [priv]
  5727 ?        S      0:00      \_ sshd: jane@pts/0
  5728 pts/0    Ss     0:00          \_ -bash
  7080 pts/0    R+     0:00              \_ ps axf
   979 ?        Ssl    0:12 /usr/bin/python2 -Es /usr/sbin/tuned -l -P
   981 ?        Ssl    0:07 /usr/sbin/rsyslogd -n
  1141 ?        Ss     0:00 /usr/libexec/postfix/master -w
  1147 ?        S      0:00  \_ qmgr -l -t unix -u
  6991 ?        S      0:00  \_ pickup -l -t unix -u
  1371 ?        Ss     0:00 login -- root
  1376 tty1     Ss     0:00  \_ -bash
  1411 tty1     S+     0:00      \_ man man
  1420 tty1     S+     0:00          \_ less -s
[...]
```

Подводя итог, не забудьте использовать `ps -ef`или `ps aux`получить список всех запущенных процессов. Рассмотрите возможность передачи вывода через `grep`для отображения строк вывода с определенными словами. Вывод терминала ниже показывает строки с `peter`ними.

```shell-session
user@host$ ps -ef | grep peter
root       5665    978  0 07:11 ?        00:00:00 sshd: peter [priv]
peter      5693   5665  0 07:13 ?        00:00:00 sshd: peter@pts/1
peter      5694   5693  0 07:13 pts/1    00:00:00 -bash
peter      5713   5694  0 07:13 pts/1    00:00:00 vi notes.txt
```

|Команда Linux|Описание|
|---|---|
|`hostname`|показывает имя хоста системы|
|`who`|показывает, кто вошел в систему|
|`whoami`|показывает эффективное имя пользователя|
|`w`|показывает, кто вошел в систему и что они делают|
|`last`|показывает список последних вошедших в систему пользователей|
|`ip address show`|показывает сетевые интерфейсы и адреса|
|`arp`|показывает кэш ARP|
|`netstat`|печатает сетевые подключения|
|`ps`|показывает снимок текущих процессов|
