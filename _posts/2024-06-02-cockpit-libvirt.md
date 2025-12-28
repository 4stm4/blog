---
layout: post
title:  "Установка Cockpit, KVM и Libvirt на Raspberry Pi (Raspbian OS)"
date:   2024-06-02 16:16:16 +0500
categories: linux
language: ru
--- 

## Инструкция по установке Cockpit, KVM и Libvirt на Raspberry Pi (Raspbian OS)


##### 1. Обновление системы:
```bash
sudo apt update
sudo apt upgrade
```
#### 2. Установка необходимых пакетов:
```bash
sudo apt install cockpit cockpit-packagekit cockpit-system cockpit-storaged cockpit-networkmanager cockpit-machines
sudo apt install qemu-system-x86 qemu-kvm libvirt-clients libvirt-daemon-system bridge-utils virtinst
```
#### 3. Добавление пользователя в группы libvirt и kvm:
```bash
sudo usermod -a -G libvirt $(whoami)
sudo usermod -a -G kvm $(whoami)
```
#### 4. Запуск и активация служб:
```bash
sudo systemctl start cockpit
sudo systemctl enable cockpit

sudo systemctl start libvirtd
sudo systemctl enable libvirtd
```
#### 5. Настройка брандмауэра:
Убедитесь, что порты 9090 (для Cockpit) и 16509 (для libvirt) открыты.

#### 6. Доступ к Cockpit:
Откройте браузер и введите http://<IP-адрес вашего Raspberry Pi>:9090 для доступа к Cockpit. Используйте учетные данные вашего пользователя для входа.

#### 7. Доступ к Libvirt:
Вы можете использовать команды в терминале или графический интерфейс Cockpit для управления виртуальными машинами через Libvirt.