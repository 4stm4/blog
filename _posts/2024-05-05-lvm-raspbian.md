---
layout: post
title:  "LVM на raspberry pi 4: создание логического диска из нескольких дисков"
date:   2024-05-18 01:01:01 +0500
categories: lvm
---


## LVM на raspberry pi 4: создание логического диска из нескольких дисков

**LVM (Logical Volume Manager)** — это удобный инструмент для управления дисками и томами в операционных системах Linux. Его можно применять на многих устройствах, включая Raspberry Pi, чтобы эффективно использовать пространство хранения и управлять им.
### 1) Установка ПО:
Чтобы использовать LVM на Raspberry Pi, вам необходимо убедиться, что соответствующий пакет `lvm2` установлен на вашем устройстве:
```bash
sudo apt-get update
sudo apt-get install lvm2
```
**Активация модуля ядра**:
Перед тем как использовать LVM, убедитесь, что модуль Linux LVM ядра активирован. Выполните:
```bash
sudo modprobe dm_mod
```
### 2) Проверяем доступные диски:
Чтобы проверить доступное оборудование и убедиться, что у вас есть свободное блочное устройство для создания физического тома с помощью LVM, вы можете выполнить несколько команд в терминале. Вот инструкции по проверке доступных блочных устройств:

- a. **Проверьте список блочных устройств**:
   Запустите команду `lsblk` в терминале. Эта команда покажет вам список всех блочных устройств в вашей системе, включая диски и их разделы.
   Пример вывода `lsblk`:
   ```Plain
   NAME   MAJ:MIN RM  SIZE RO TYPE MOUNTPOINT
   sda      8:0    0   20G  0 disk
   └─sda1   8:1    0   10G  0 part /
   sdb      8:16   0   50G  0 disk
   ```
   Здесь `sda` и `sdb` - это имена блочных устройств. Вы должны найти неразмеченный диск, который будет использоваться для создания физического тома.

- b. **Убедитесь, что устройство неразмечено**:
  Вы также можете использовать команду `sudo fdisk -l` для более подробной информации о блочных устройствах и их разметке. Неразмеченный диск обычно не имеет разделов.
  Пример вывода `sudo fdisk -l`:
  ```Plain
  Disk /dev/sdb: 50 GiB, 53687091200 bytes, 104857600 sectors
  Units: sectors of 1 * 512 = 512 bytes
  Sector size (logical/physical): 512 bytes / 512 bytes
  ```

### 3) Удаляем существующую разметку дисков:
Если блочное устройство уже размечено и содержит разделы, вам придется освободить его от текущих разделов, прежде чем можно будет использовать его для создания физического тома с помощью LVM. Вот как вы можете выполнить эту процедуру:

**Предупреждение**: Освобождение разделов приведет к потере данных на этих разделах. Убедитесь, что у вас есть резервные копии всех важных данных, прежде чем продолжить.

- a. **Запустите утилиту разметки дисков**:
   Запустите команду для выбранного блочного устройства. Например:
```bash
   sudo fdisk /dev/sdb
```

- b. **Удалите существующие разделы**:
   Внутри утилиты разметки дисков введите `d` для удаления раздела. Если диск содержит несколько разделов, повторите этот шаг для каждого из них.
- c. **Сохраните изменения и выйдите**:
  После удаления всех разделов нажмите `w`, чтобы сохранить изменения и выйти из утилиты.
- d. **Перезагрузите систему**:
  Перезагрузите вашу систему, чтобы обновления разметки дисков вступили в силу.
- e. **Проверьте изменения**:
  После перезагрузки выполните `lsblk` или `sudo fdisk -l` снова, чтобы убедиться, что блочное устройство теперь не содержит разделов и готово к использованию.
### 4) Создание разделов:
  Используйте `parted` или другой инс_трумент для создания раздела:
```bash
sudo parted /dev/sda
(parted) mklabel disk01  # Создание метки раздела disk01 (если ее еще нет)
(parted) mkpart primary 1MiB 100%  # Создание раздела, занимающего всё пространство
(parted) print  # Проверьте, что раздел создан
```

Для использования LVM на Raspberry Pi (или любом другом устройстве) вам потребуется создать физические тома (Physical Volumes - PVs), затем объединить их в группы томов (Volume Groups - VGs), и, наконец, создать логические тома (Logical Volumes - LVs) внутри этих групп. Вот общий порядок действий:

- a. Создайте физический том на каждом диске, который вы хотите включить в ваше хранилище данных. Используйте команду `pvcreate` для этого.
```bash
sudo pvcreate /dev/sdX  # замените /dev/sdX на ваше устройство, например, /dev/sda
```

- b. Создайте группу томов, используя созданные физические тома. Назовите вашу группу томов (Volume Group - VG) и добавьте в нее физические тома.
```bash
sudo vgcreate my_vg /dev/sdX /dev/sdY  # замените /dev/sdX и /dev/sdY на ваши физические тома
```

- c. Теперь создайте логический том внутри вашей группы томов. Укажите размер и место монтирования для нового логического тома.
```bash
sudo lvcreate -L 10G -n my_lv my_vg  # создаст логический том размером 10 ГБ в вашей группе томов
```

- d. Форматируйте ваш новый логический том с файловой системой и смонтируйте его в системе.
```bash
sudo mkfs.ext4 /dev/my_vg/my_lv  # форматирование логического тома
sudo mkdir /mnt/my_lv            # создание точки монтирования
sudo mount /dev/my_vg/my_lv /mnt/my_lv  # монтирование логического тома
```

После завершения этих шагов, ваш логический том должен быть готов к использованию на Raspberry Pi.