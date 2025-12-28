---
layout: default
title: "Категории"
permalink: /categories/
description: "Подборки статей по ключевым темам: Linux, Raspberry Pi, безопасность, архитектура и многое другое."
---
<section class="category-archive" aria-labelledby="category-archive-heading">
  <h1 id="category-archive-heading" data-i18n="categories.page_heading">Категории блога</h1>
  <p class="category-intro" data-i18n="categories.page_intro">Мы собрали материалы в пять основных направлений — Linux, Programming, Hardware, Security и Tools — чтобы быстрее находить нужные инструкции, конспекты и примеры.</p>
  <div class="category-grid">
    {%- assign sorted_categories = site.categories | sort -%}
    {%- for category in sorted_categories -%}
    {%- assign category_name = category[0] -%}
    {%- assign posts_in_category = category[1] -%}
    <article class="category-card" id="{{ category_name | slugify }}">
      <h2 class="category-title">{{ category_name | replace: '_', ' ' | capitalize }}</h2>
      <p class="category-summary"><span class="category-summary-name">{{ category_name | replace: '_', ' ' | capitalize }}</span> — <span class="category-summary-count">{{ posts_in_category | size }}</span> <span data-i18n="categories.materials_with_guides">материалов с пошаговыми инструкциями и аналитикой.</span></p>
      <ul class="category-links">
        {%- assign date_format = site.minima.date_format | default: "%d.%m.%Y" -%}
  {%- for post in posts_in_category -%}
        <li data-post-lang="{{ post.language | default: 'ru' }}">
          <a href="{{ post.url | relative_url }}">{{ post.title | escape }}</a>
          <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: date_format }}</time>
        </li>
        {%- endfor -%}
      </ul>
    </article>
    {%- endfor -%}
  </div>
</section>
