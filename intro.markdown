---
layout: default
title: "О блоге"
permalink: /intro/
description: "Знакомство с блогом 4stm4, список актуальных проектов и краткое введение."
---
<section class="intro-section">
  <p class="intro-text">Здесь собраны конспекты, инструкции и пошаговые эксперименты для тех, кто настраивает инфраструктуру, пишет код, внедряет системы безопасности и любит разбираться в железе. Свежие заметки выходят регулярно — заглядывайте чаще!</p>

  <section class="projects">
    <div class="projects__header">
      <h2>Открытые проекты 4stm4</h2>
      <p>Инструменты, которыми можно пользоваться прямо сейчас — от фоновых пайплайнов до лаборатории для проверки железа.</p>
    </div>

    <div class="project-grid">
      <article class="project-card">
        <div class="project-card__badge">Python toolkit</div>
        <h3 class="project-card__title"><a href="https://github.com/4stm4/pyjobkit">pyjobkit</a></h3>
        <p class="project-card__lead">Набор утилит для фоновых заданий, пакетных обработок и пайплайнов, которые запускаются локально или в контейнерах.</p>
        <ul class="project-card__meta">
          <li>минималистичное API для воркеров</li>
          <li>управление задачами как кодом</li>
          <li>удобное наблюдение за прогрессом</li>
        </ul>
        <a class="project-card__cta" href="https://github.com/4stm4/pyjobkit" target="_blank" rel="noopener">Открыть репозиторий</a>
      </article>

      <article class="project-card">
        <div class="project-card__badge">Rust crate</div>
        <h3 class="project-card__title"><a href="https://github.com/4stm4/ehatrom">ehatrom</a></h3>
        <p class="project-card__lead">Библиотека для генерации и анализа EEPROM-образов Raspberry Pi HAT с аккуратной моделью TLV-записей.</p>
        <ul class="project-card__meta">
          <li>готовые типы `HatEeprom`, `TlvRecord`, `TlvType`</li>
          <li>валидация структуры TLV перед прошивкой</li>
          <li>без ручного редактирования hex-файлов</li>
        </ul>
        <a class="project-card__cta" href="https://github.com/4stm4/ehatrom" target="_blank" rel="noopener">Открыть репозиторий</a>
      </article>

      <article class="project-card">
        <div class="project-card__badge">Lab automation</div>
        <h3 class="project-card__title"><a href="https://github.com/4stm4/testum">testum</a></h3>
        <p class="project-card__lead">Сценарии и инструменты для автоматизации испытаний экспериментальных плат, прошивок и драйверов.</p>
        <ul class="project-card__meta">
          <li>описание стендов и подключения</li>
          <li>сбор телеметрии и логов</li>
          <li>быстрые отчёты о регрессиях</li>
        </ul>
        <a class="project-card__cta" href="https://github.com/4stm4/testum" target="_blank" rel="noopener">Открыть репозиторий</a>
      </article>
    </div>
  </section>
</section>
