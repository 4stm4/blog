---
layout: post
title:  "Pico: компиляция проекта на asm"
date:   2023-06-12 16:55:55 +0500
categories: asm
---
<BR>

##### Pico: компиляция проекта на asm
---


---
  ```cmd
    rm -rf build
    mkdir build
    cd build
    cmake -DCMAKE_BUILD_TYPE=Debug ..
    make
  ```
##### Подготовка скриптов для упрощения процесса разработки:
---
1) Создаем папку $HOME/bin, в ней будем хранить все созаваемые далее скрипты.
2) Добавляем в $HOME/.bashrc строку 
  ```cmd
    export PATH=$PATH:$HOME/bin
  ```
3) Создаем скрипт с именем m-uart, для прослушивания присылаемых данных по UART.
  ```cmd
    minicom -b 115200 -o -D /dev/serial0
  ```
4) Скрипт m-usb, прослушиваем данные от Pico по USB.
  ```cmd
    minicom -b 115200 -o -D /dev/ttyACM0
  ```
minicom -b 115200 -o -D /dev/ttyACM0
5) Для debug сборки скрипт  cmaked.
  ```cmd
    cmake -DCMAKE_BUILD_TYPE=Debug ..
  ```
6) Для работы gdb с чипом RP2040, запускаем openocd с помощью скрипта ocdg.
  ```cmd
    openocd -f interface/raspberrypi-swd.cfg -f target/rp2040.cfg
  ```
7) Скрипт gdbm с параметром .elf файлом проекта.
  ```cmd
    gdb-multiarch $1
  ```
8) Для автоматического соединения gdb с openocd, создаем скрипт .gdbinit в папке $HOME.
  ```cmd
    target remote localhost:3333
  ```
###### Все скрипты должны иметь свойство для запуска:
  ```cmd
    chmod +x filename
  ```