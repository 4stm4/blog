---
layout: default
title: "О блоге"
permalink: /intro/
description: "Знакомство с блогом 4stm4, список актуальных проектов и краткое введение."
---
<section class="intro-section">
  <p class="intro-text" data-i18n="projects.intro_text">Здесь собраны конспекты, инструкции и пошаговые эксперименты для тех, кто настраивает инфраструктуру, пишет код, внедряет системы безопасности и любит разбираться в железе. Свежие заметки выходят регулярно — заглядывайте чаще!</p>

  <section class="projects">
    <div class="projects__header">
      <h2 data-i18n="projects.header_title">Открытые проекты 4stm4</h2>
      <p data-i18n="projects.header_subtitle">Инструменты, которыми можно пользоваться прямо сейчас — от фоновых пайплайнов до лаборатории для проверки железа.</p>
    </div>

    <div class="project-grid">
      <article class="project-card">
        <div class="project-card__badge" data-i18n="projects.pyjobkit.badge">Python toolkit</div>
        <h3 class="project-card__title"><a href="https://github.com/4stm4/pyjobkit">pyjobkit</a></h3>
        <p class="project-card__lead" data-i18n="projects.pyjobkit.lead">Набор утилит для фоновых заданий, пакетных обработок и пайплайнов, которые запускаются локально или в контейнерах.</p>
        <ul class="project-card__meta">
          <li data-i18n="projects.pyjobkit.meta1">минималистичное API для воркеров</li>
          <li data-i18n="projects.pyjobkit.meta2">управление задачами как кодом</li>
          <li data-i18n="projects.pyjobkit.meta3">удобное наблюдение за прогрессом</li>
        </ul>
        <a class="project-card__cta" href="https://github.com/4stm4/pyjobkit" target="_blank" rel="noopener" data-i18n="projects.pyjobkit.cta">Открыть репозиторий</a>
      </article>

      <article class="project-card">
        <div class="project-card__badge" data-i18n="projects.ehatrom.badge">Rust crate</div>
        <h3 class="project-card__title">
          <a href="https://github.com/4stm4/ehatrom">ehatrom</a>
          <span class="project-version">v0.3.3</span>
        </h3>
        <p class="project-card__lead" data-i18n="projects.ehatrom.lead">Библиотека для генерации и анализа EEPROM-образов Raspberry Pi HAT с аккуратной моделью TLV-записей.</p>
        <ul class="project-card__meta">
          <li data-i18n="projects.ehatrom.meta1">готовые типы `HatEeprom`, `TlvRecord`, `TlvType`</li>
          <li data-i18n="projects.ehatrom.meta2">валидация структуры TLV перед прошивкой</li>
          <li data-i18n="projects.ehatrom.meta3">без ручного редактирования hex-файлов</li>
        </ul>
        <div class="project-card__actions">
          <a class="project-card__cta" href="https://github.com/4stm4/ehatrom" target="_blank" rel="noopener" data-i18n="projects.ehatrom.cta">Открыть репозиторий</a>
          <a class="project-card__cta project-card__cta--secondary" href="https://crates.io/crates/ehatrom/0.3.3" target="_blank" rel="noopener">crates.io</a>
        </div>
      </article>

      <article class="project-card">
        <div class="project-card__badge" data-i18n="projects.testum.badge">Lab automation</div>
        <h3 class="project-card__title"><a href="https://github.com/4stm4/testum">testum</a></h3>
        <p class="project-card__lead" data-i18n="projects.testum.lead">Сценарии и инструменты для автоматизации испытаний экспериментальных плат, прошивок и драйверов.</p>
        <ul class="project-card__meta">
          <li data-i18n="projects.testum.meta1">описание стендов и подключения</li>
          <li data-i18n="projects.testum.meta2">сбор телеметрии и логов</li>
          <li data-i18n="projects.testum.meta3">быстрые отчёты о регрессиях</li>
        </ul>
        <a class="project-card__cta" href="https://github.com/4stm4/testum" target="_blank" rel="noopener" data-i18n="projects.testum.cta">Открыть репозиторий</a>
      </article>
    </div>
  </section>
</section>
