---
layout: default
title: "Категории"
permalink: /categories/
description: "Подборки статей по ключевым темам: Linux, Raspberry Pi, безопасность, архитектура и многое другое."
---
<section class="category-archive" aria-labelledby="category-archive-heading">
  <h1 id="category-archive-heading">Категории блога</h1>
  <p class="category-intro">Выберите направление и найдите подборку статей с инструкциями, примерами и конспектами для решения практических задач.</p>
  <div class="category-grid">
    {%- assign sorted_categories = site.categories | sort_natural -%}
    {%- for category in sorted_categories -%}
    {%- assign category_name = category[0] -%}
    {%- assign posts_in_category = category[1] -%}
    <article class="category-card" id="{{ category_name | slugify }}">
      <h2 class="category-title">{{ category_name | replace: '_', ' ' | capitalize }}</h2>
      <p class="category-summary">{{ category_name | replace: '_', ' ' | capitalize }} — {{ posts_in_category | size }} материалов с пошаговыми инструкциями и аналитикой.</p>
      <ul class="category-links">
        {%- assign date_format = site.minima.date_format | default: "%d.%m.%Y" -%}
        {%- for post in posts_in_category limit:3 -%}
        <li>
          <a href="{{ post.url | relative_url }}">{{ post.title | escape }}</a>
          <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: date_format }}</time>
        </li>
        {%- endfor -%}
      </ul>
    </article>
    {%- endfor -%}
  </div>
</section>
