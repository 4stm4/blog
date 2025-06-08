---
layout: post
title:  "Обзор библиотеки ehatrom для работы с EEPROM Raspberry Pi HAT"
date:   2025-06-08 17:11:00 +0500
categories: raspberry pi, linux
---

# Библиотека `ehatrom`: работа с EEPROM-образами Raspberry Pi HAT на Rust

## Введение

Если вы создаёте HAT (расширение) для Raspberry Pi, то уже сталкивались с необходимостью создавать специальный EEPROM-образ с метаданными о вашей плате. Этот бинарный файл читается загрузчиком Raspberry Pi и позволяет системе автоматически распознавать параметры устройства: GPIO, I²C, драйверы и прочее.

Мы рады представить [ehatrom](https://crates.io/crates/ehatrom) — библиотеку на языке **Rust**, созданную для удобной генерации и анализа EEPROM-образов формата HAT.

---

## Что такое HAT EEPROM

Согласно [официальной спецификации Raspberry Pi HAT EEPROM](https://github.com/raspberrypi/hats/blob/master/eeprom-format.md), EEPROM на плате HAT содержит информацию о производителе, продукте, версии, а также может включать `.dtbo`-файлы (Device Tree Overlay) и пользовательские данные.

Формат бинарного файла включает:

* заголовок (магическое число, версия, CRC32),
* таблицу записей (структура TLV),
* собственно данные.

Генерация корректного EEPROM-файла вручную — задача не из простых. `ehatrom` упрощает этот процесс.

---

## Что умеет `ehatrom`

Библиотека реализует:

✅ Чтение и запись EEPROM-образов HAT
✅ Генерацию всех обязательных TLV-полей
✅ Автоматический расчёт CRC32
✅ Поддержку пользовательских данных
✅ Возможность работы без `std` (для embedded-приложений)
✅ Простое API и сериализацию в `Vec<u8>` или файл

---

## Установка

Добавьте в ваш `Cargo.toml`:

```toml
[dependencies]
ehatrom = "0.1"
```

---

## Пример использования

Допустим, вы создаёте плату "4STM4 Battery HAT" и хотите сгенерировать EEPROM-файл с основной информацией.

```rust
use ehatrom::{HatEeprom, TlvRecord, TlvType};

fn main() {
    let mut eeprom = HatEeprom::new();

    eeprom.add_record(TlvRecord::new(TlvType::Vendor, b"4STM4"));
    eeprom.add_record(TlvRecord::new(TlvType::Product, b"Battery HAT"));
    eeprom.add_record(TlvRecord::new(TlvType::ProductId, 0x0420u16.to_le_bytes().as_slice()));
    eeprom.add_record(TlvRecord::new(TlvType::ProductVer, 0x0001u16.to_le_bytes().as_slice()));
    eeprom.add_record(TlvRecord::new(TlvType::MacAddr, &[0xDE, 0xAD, 0xBE, 0xEF, 0x00, 0x01]));
    eeprom.add_record(TlvRecord::new(TlvType::Uuid, &[
        0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0,
        0x10, 0x32, 0x54, 0x76, 0x98, 0xBA, 0xDC, 0xFE,
    ]));

    // Генерируем бинарные данные
    let bin = eeprom.to_bytes().expect("failed to generate EEPROM");

    // Сохраняем в файл
    std::fs::write("eeprom.bin", &bin).expect("failed to write file");
}
```

После этого вы можете прошить файл `eeprom.bin` в микросхему 24C32 или использовать `rpi-eeprom` утилиту на Raspberry Pi.

---

## Для встраиваемых проектов

Библиотека поддерживает режим `#![no_std]`, что делает её пригодной для использования в микроконтроллерах. Например, вы можете формировать EEPROM-образ прямо на STM32, RP2040 или других платформах.

Пример использования без `std`:

```rust
#![no_std]
use ehatrom::{HatEeprom, TlvRecord, TlvType};

fn generate_eeprom(buf: &mut [u8]) -> Result<usize, ehatrom::Error> {
    let mut eeprom = HatEeprom::new();

    eeprom.add_record(TlvRecord::new(TlvType::Vendor, b"4STM4"));
    eeprom.add_record(TlvRecord::new(TlvType::Product, b"LoRa HAT"));

    let result = eeprom.serialize_into(buf)?;
    Ok(result)
}
```

---

## Заключение

`ehatrom` — удобный и безопасный способ создавать и проверять HAT EEPROM-образы на языке Rust. Библиотека пригодится как разработчикам HAT-плат, так и авторам встроенных прошивок, где важно максимальное соответствие формату Raspberry Pi.

Ссылка на проект:
 [https://crates.io/crates/ehatrom](https://crates.io/crates/ehatrom)
 Документация: [https://docs.rs/ehatrom/latest/ehatrom/](https://docs.rs/ehatrom/latest/ehatrom/)

Если вы разрабатываете своё железо под Raspberry Pi — обязательно попробуйте!

---

Если хотите, я могу:

* сгенерировать версию статьи в Markdown,
* добавить больше примеров (например, с `.dtbo`),
* сделать CLI-пример (если у вас есть такая утилита),
* подготовить пошаговую инструкцию по прошивке EEPROM-файла.
