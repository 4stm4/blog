---
layout: post
title:  "Базовые знания Windows"
date:   2024-02-14 23:23:23 +0500
categories: windows
---
<BR>

## Базовые знания Windows


### Система

Одной из команд, которая может предоставить нам подробную информацию о системе, такую ​​как номер ее сборки и установленные исправления, будет `systeminfo`. В примере ниже мы видим, какие исправления были установлены.

```shell-session
C:\>systeminfo

Host Name:                 WIN-SERVER-CLI
OS Name:                   Microsoft Windows Server 2022 Standard
OS Version:                10.0.20348 N/A Build 20348
OS Manufacturer:           Microsoft Corporation
[...]
Hotfix(s):                 3 Hotfix(s) Installed.
                           [01]: KB5013630
                           [02]: KB5013944
                           [03]: KB5012673
Network Card(s):           1 NIC(s) Installed.
                           [01]: Intel(R) 82574L Gigabit Network Connection
[...]
```

Проверить установленные обновления с помощью `wmic qfe get Caption,Description`. Эта информация даст вам представление о том, как быстро устанавливаются исправления и обновления систем.

```shell-session
C:\>wmic qfe get Caption,Description
Caption                                     Description      
http://support.microsoft.com/?kbid=5013630  Update
https://support.microsoft.com/help/5013944  Security Update
                                            Update
```

Проверить установленные и запущенные службы Windows можно с помощью `net start`. Ожидайте получить длинный список; вывод ниже был обрезан.

```shell-session
C:\>net start
These Windows services are started:

   Base Filtering Engine
   Certificate Propagation
   Client License Service (ClipSVC)
   COM+ Event System
   Connected User Experiences and Telemetry
   CoreMessaging
   Cryptographic Services
   DCOM Server Process Launcher
   DHCP Client
   DNS Client
[...]
   Windows Time
   Windows Update
   WinHTTP Web Proxy Auto-Discovery Service
   Workstation

The command completed successfully.
```

Если вас интересуют только установленные приложения, вы можете отправить файл `wmic product get name,version,vendor`. Если вы запустите эту команду на подключенной виртуальной машине, вы получите что-то похожее на следующий вывод.

```shell-session
C:\>wmic product get name,version,vendor
Name                                                            Vendor                                   Version
Microsoft Visual C++ 2019 X64 Minimum Runtime - 14.28.29910     Microsoft Corporation                    14.28.29910
[...]
Microsoft Visual C++ 2019 X64 Additional Runtime - 14.28.29910  Microsoft Corporation                    14.28.29910
```

### Пользователи

Чтобы узнать, кто вы, вы можете набрать `whoami`; более того, чтобы узнать, на что вы способны, т. е. ваши привилегии, вы можете использовать `whoami /priv`.

```shell-session
C:\>whoami
win-server-cli\strategos

> whoami /priv

PRIVILEGES INFORMATION
----------------------

Privilege Name                            Description                                                        State
========================================= ================================================================== =======
SeIncreaseQuotaPrivilege                  Adjust memory quotas for a process                                 Enabled
SeSecurityPrivilege                       Manage auditing and security log                                   Enabled
SeTakeOwnershipPrivilege                  Take ownership of files or other objects                           Enabled
[...]
```

Кроме того, вы можете использовать `whoami /groups`, чтобы узнать, к каким группам вы принадлежите. Вывод терминала ниже показывает, что этот пользователь принадлежит к `NT AUTHORITY\Local account and member of Administrators group`другим группам.

```shell-session
C:\>whoami /groups

GROUP INFORMATION
-----------------

Group Name                                                    Type             SID          Attributes
============================================================= ================ ============ ===============================================================
Everyone                                                      Well-known group S-1-1-0      Mandatory group, Enabled by default, Enabled group
NT AUTHORITY\Local account and member of Administrators group Well-known group S-1-5-114    Mandatory group, Enabled by default, Enabled group
BUILTIN\Administrators                                        Alias            S-1-5-32-544 Mandatory group, Enabled by default, Enabled group, Group owner
[...]
```

Вы можете просмотреть пользователей, запустив `net user`.

```shell-session
C:\>net user

User accounts for \\WIN-SERVER-CLI

-------------------------------------------------------------------------------
Administrator            DefaultAccount           Guest
michael                  peter                    strategos
WDAGUtilityAccount
The command completed successfully.
```

Обнаружить доступные группы, указав `net group`, является ли система контроллером домена Windows или `net localgroup`нет, как показано в терминале ниже.

```shell-session
C:\>net localgroup

Aliases for \\WIN-SERVER-CLI

-------------------------------------------------------------------------------
*Access Control Assistance Operators
*Administrators
*Backup Operators
*Certificate Service DCOM Access
*Cryptographic Operators
*Device Owners
[...]
```

Вы можете перечислить пользователей, принадлежащих к группе локальных администраторов, с помощью команды `net localgroup administrators`.

```shell-session
C:\>net localgroup administrators
Alias name     administrators
Comment        Administrators have complete and unrestricted access to the computer/domain

Members

-------------------------------------------------------------------------------
Administrator
michael
peter
strategos
The command completed successfully.
```

Используйте `net accounts`для просмотра локальных настроек на машине; более того, вы можете использовать, `net accounts /domain`если машина принадлежит домену. Эта команда помогает узнать о политике паролей, такой как минимальная длина пароля, максимальный срок действия пароля и продолжительность блокировки.

### Сеть

Используйте эту `ipconfig`команду, чтобы узнать о конфигурации сети вашей системы. Если вы хотите узнать все настройки, связанные с сетью, вы можете использовать `ipconfig /all`. Вывод терминала ниже показывает вывод при использовании `ipconfig`. Например, мы могли бы использовать это `ipconfig /all`, если бы хотели изучить DNS- серверы.

```shell-session
C:\>ipconfig

Windows IP Configuration


Ethernet adapter Ethernet0:

   Connection-specific DNS Suffix  . : localdomain
   Link-local IPv6 Address . . . . . : fe80::3dc5:78ef:1274:a740%5
   IPv4 Address. . . . . . . . . . . : 10.20.30.130
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : 10.20.30.2
```

В MS Windows мы можем использовать `netstat`различную информацию, например, какие порты прослушивает система, какие соединения активны и кто их использует. В этом примере мы используем параметры `-a`для отображения всех прослушиваемых портов и активных соединений. Позволяет `-b`нам найти двоичный файл, участвующий в соединении, а `-n`используется, чтобы избежать разрешения IP-адресов и номеров портов. Наконец, `-o`отобразите идентификатор процесса ( PID ).

В частичном выводе, показанном ниже, мы видим, что `netstat -abno`сервер прослушивает TCP- порты 22, 135, 445 и 3389. Процессы`sshd.exe` , `RpcSs`и `TermService`находятся на портах `22`, `135`и `3389`соответственно. Более того, мы видим два установленных подключения к SSH- серверу, о чем свидетельствует состояние`ESTABLISHED` .

```shell-session
C:\>netstat -abno

Active Connections

  Proto  Local Address          Foreign Address        State           PID
  TCP    0.0.0.0:22             0.0.0.0:0              LISTENING       2016
 [sshd.exe]
  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING       924
  RpcSs
 [svchost.exe]
  TCP    0.0.0.0:445            0.0.0.0:0              LISTENING       4
 Can not obtain ownership information
  TCP    0.0.0.0:3389           0.0.0.0:0              LISTENING       416
  TermService
 [svchost.exe]
[...]
  TCP    10.20.30.130:22        10.20.30.1:39956       ESTABLISHED     2016
 [sshd.exe]
  TCP    10.20.30.130:22        10.20.30.1:39964       ESTABLISHED     2016
 [sshd.exe]
[...]
```

Вы можете подумать, что можно получить идентичный результат, просканировав порты целевой системы; однако это неточно по двум причинам. Возможно, брандмауэр блокирует доступ сканирующего узла к определенным сетевым портам. Более того, сканирование портов в системе генерирует значительный объем трафика, в отличие от системы `netstat`, которая не создает шума.

Наконец, стоит упомянуть, что использование `arp -a`помогает вам обнаружить другие системы в той же локальной сети, которые недавно обменивались данными с вашей системой. ARP означает протокол разрешения адресов; `arp -a`показывает текущие записи ARP , т. е. физические адреса систем в той же локальной сети, которая взаимодействовала с вашей системой. Пример вывода показан ниже. Это указывает на то, что эти IP-адреса каким-то образом связались с нашей системой; связь может быть попыткой подключения или даже простым пингом. Обратите внимание, что это`10.10.255.255` не представляет систему, поскольку это широковещательный адрес подсети.

```shell-session
C:\>arp -a

Interface: 10.10.204.175 --- 0x4 
  Internet Address      Physical Address      Type
  10.10.0.1             02-c8-85-b5-5a-aa     dynamic
  10.10.16.117          02-f2-42-76-fc-ef     dynamic
  10.10.122.196         02-48-58-7b-92-e5     dynamic
  10.10.146.13          02-36-c1-4d-05-f9     dynamic
  10.10.161.4           02-a8-58-98-1a-d3     dynamic
  10.10.217.222         02-68-10-dd-be-8d     dynamic
  10.10.255.255         ff-ff-ff-ff-ff-ff     static
```

|Команда Windows|Описание|
|---|---|
|`systeminfo`|показывает информацию о конфигурации ОС , включая уровни пакетов обновлений|
|`whoami`|показывает имя пользователя и информацию о группе вместе с соответствующими идентификаторами безопасности|
|`netstat`|показывает статистику протокола и текущие сетевые соединения TCP/IP|
|`net user`|показывает учетные записи пользователей на компьютере|
|`net localgroup`|показывает локальные группы на компьютере|
|`arp`|показывает таблицы преобразования IP-адресов в физические.|