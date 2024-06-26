---
layout: post
title:  "Подключение Raspberry Pi Pico"
date:   2023-06-12 9:44:44 +0500
categories: asm
---

##### Подключение Raspberry Pi Pico
---
###### Подключение лучше всего производить к Raspberry Pi 3, 4 на OS Raspbian.
1) Припаять пины и разьем Serial Wire Debug (SWD).
2) Подключить Pico к RPI3, 4.

|Raspberry Pi   |Raspberry Pi Pico|
|:--------------|----------------:|
|GND (Pin 20)   |   SWD GND|
|GPIO24 (Pin 18)|   SWDIO|
|GPIO25 (Pin 22)|   SWCLK|

<img src="{{site.url}}/assets/jpeg/SWD_connection.png" width="600px">
3) Скачиваем скрипт установки ПО с официально сайта.
  ```cmd
      wget https://raw.githubusercontent.com/raspberrypi/pico-setup/master/pico_setup.sh
  ```
4) Делаем скрипт запускаемым.
  ```cmd
      chmod +x pico_setup.sh
 ```
5) Запускаем скрипт.
 ```cmd
      ./pico_setup.sh
 ```

###### Устанавливается ПО:

###### Pico SDK
###### OpenOCD (Open On-Chip Debugg), homepage: https://openocd.org/
###### gdb-multiarch, homepage: https://www.sourceware.org/gdb/
###### GCC, homepage: https://gcc.gnu.org/
###### VSCode + plugins, homepage: https://code.visualstudio.com/
###### Git, homepage: https://git-scm.com/
###### minicom, homepage: https://salsa.debian.org/minicom-team/minicom


##### Официальная документация
---
1.  [RP2040 Datasheet .pdf](https://datasheets.raspberrypi.com/rp2040/rp2040-datasheet.pdf)
2.  [Pico datasheet .pdf](https://datasheets.raspberrypi.com/pico/pico-datasheet.pdf)
3.  [Pico W datasheet .pdf](https://datasheets.raspberrypi.com/picow/pico-w-datasheet.pdf)
4.  [Getting started with pico .pdf](https://datasheets.raspberrypi.com/pico/getting-started-with-pico.pdf)
5.  [Pico C SDK .pdf](https://datasheets.raspberrypi.com/pico/raspberry-pi-pico-c-sdk.pdf)
6.  [Pico Python SDK .pdf](https://datasheets.raspberrypi.com/pico/raspberry-pi-pico-python-sdk.pdf)
7.  [Connecting to the internet with Pico W .pdf](https://datasheets.raspberrypi.com/picow/connecting-to-the-internet-with-pico-w.pdf)
8.  [Pico R3 A4 Pinout .pdf](https://datasheets.raspberrypi.com/pico/Pico-R3-A4-Pinout.pdf)
9.  [Pico W A4 Pinout .pdf](https://datasheets.raspberrypi.com/picow/PicoW-A4-Pinout.pdf)
10. [Pico R3 Fritzing .fzpz](https://datasheets.raspberrypi.com/pico/Pico-R3-Fritzing.fzpz)
11. [Pico W Fritzing .fzpz](https://datasheets.raspberrypi.com/picow/PicoW-Fritzing.fzpz)
12. [Pico R3 step .zip](https://datasheets.raspberrypi.com/pico/Pico-R3-step.zip)
13. [Pico H Fritzing .fzpz](https://datasheets.raspberrypi.com/pico/PicoH-Fritzing.fzpz) 
14. [Pico W high res .jpg](https://datasheets.raspberrypi.com/picow/PicoW-HighRes.jpg)
15. [Pico W step .zip](https://datasheets.raspberrypi.com/picow/PicoW-step.zip)
16. [Pico W PUBLIC 2022-06-07 .zip](https://datasheets.raspberrypi.com/picow/RPi-PicoW-PUBLIC-20220607.zip)
17. [Pico R3 PUBLIC 2020-01-19 .zip](https://datasheets.raspberrypi.com/pico/RPi-Pico-R3-PUBLIC-20200119.zip)
18. [Pico product brief .pdf](https://datasheets.raspberrypi.com/picow/pico-w-product-brief.pdf)
19. [Pico W product brief .pdf](https://datasheets.raspberrypi.com/pico/pico-product-brief.pdf)


###### Повернуть изображение на мониторе в режимие CLI Raspbian
---
  ```cmd
      sudo vim /boot/cmdline.txt
  ```

###### Добавить строку: 'fbcon=rotate:2' (цифра означает количество поворотов экрана)

###### Повернуть изображение на мониторе при использовнании Raspbian lite
  ```cmd
      sudo vim /boot/config.txt
  ```

###### Закоментировать строку dtoverlay=vc4-fkms-v3d
###### Добавить строку adding 'display_hdmi_rotate=3' 
