---
layout: post
title:  "Тестируем Rust-проекты с помощью Docker и Makefile"
date:   2025-06-10 09:09:00 +0500
categories: rust, docker, cargo
---


##  Тестируем Rust-проекты с помощью Docker и Makefile

Когда проект становится частью CI/CD-пайплайна или работает в гетерогенной среде, удобно использовать **контейнеризированную среду для тестирования**, чтобы избежать различий в версиях Rust и зависимостях. Ниже — пример того, как это можно сделать с помощью `Docker` и `Makefile`.

---

### 📁 Структура проекта

```txt
project-root/
├── Makefile          # Makefile на верхнем уровне
└── ehatrom/          # Исходный код Rust-проекта
    ├── Cargo.toml
    └── src/
        └── lib.rs
```

---

### 🐋 Dockerfile

В папке `ehatrom/` создаём `Dockerfile` для окружения с nightly Rust и необходимыми компонентами:

```Dockerfile
FROM rustlang/rust:nightly

WORKDIR /ehatrom

RUN rustup component add rustfmt clippy
```

Создаём образ:

```bash
docker build -t ehatrom-ci ./ehatrom
```

---

### 🛠️ Makefile

На уровень выше (в `project-root/`) создаём `Makefile`, чтобы упростить сборку и тестирование:

```makefile
build:
	docker build -t ehatrom-ci ./ehatrom

ci:
	docker run --rm -it \
		-v "$(PWD)/ehatrom":/ehatrom \
		-w /ehatrom \
		ehatrom-ci \
		bash -c "cargo +nightly clippy --workspace --all-targets -- -D warnings && \
		         cargo build --workspace --all-targets --verbose && \
		         cargo test --workspace --all-targets --verbose"
```

---

### 🚀 Использование

Теперь мы можем:

* Построить Docker-образ:

  ```bash
  make build
  ```

* Проверить и протестировать проект:

  ```bash
  make ci
  ```

---

### ✅ Что делает `make ci`

Контейнер запускает следующую цепочку команд:

```bash
cargo +nightly clippy --workspace --all-targets -- -D warnings
cargo build --workspace --all-targets --verbose
cargo test --workspace --all-targets --verbose
```

Это гарантирует:

* соответствие стилю кода (через `clippy`);
* успешную сборку всех целей;
* прохождение всех тестов.

---

### 🧪 Вывод

Такой подход полезен, если:

* команда работает на разных ОС;
* вы хотите зафиксировать конкретную версию toolchain;
* нужно легко запускать CI-джобы локально.

Также он хорошо масштабируется в более сложные пайплайны и может быть использован в GitHub Actions, GitLab CI или Drone CI.
