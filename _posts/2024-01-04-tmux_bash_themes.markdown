---
layout: post
title:  "Настройка powerline в bash и tmux"
date:   2024-01-04 16:44:44 +0500
categories: linux
---
<BR>

##### Настраиваем Powerline для bash
---

1) Устанавливаем powerline
  ```cmd
    git clone https://github.com/b-ryan/powerline-shell
    cd powerline-shell
    sudo python setup.py install
  ```
2) Добавляем в ~/.bashrc
  ```cmd
    function _update_ps1() {
        PS1=$(powerline-shell $?)
    }

    if [[ $TERM != linux && ! $PROMPT_COMMAND =~ _update_ps1 ]]; then
        PROMPT_COMMAND="_update_ps1; $PROMPT_COMMAND"
    fi
  ```
3) Создаём конфигурационный файл, проверяем создался файл или нет и содержимое.
   Файл конфигурации не должен быть пустым.
  ```cmd
    mkdir -p ~/.config/powerline-shell && \
    powerline-shell --generate-config > ~/.config/powerline-shell/config.json
  ```
4) Добавляем(изменяем) тему в файл конфигурации, созданный выше
   темы находятся в папке ~/powerline-shell/powerline-shell/themes
  ```cmd
    "theme": "washed"
  ```
5) Обновляем bash
   ```cmd
    source ~/.bashrc
   ```
  

##### Настраиваем Powerline для tmux
---

1) Копируем плагин менеджер tpm
  ```cmd
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
```
2) Добавляем в ~/.tmux.conf
  ```cmd
    # List of plugins
    set -g @plugin 'tmux-plugins/tpm'
    set -g @plugin 'tmux-plugins/tmux-sensible'

    # Other examples:
    # set -g @plugin 'github_username/plugin_name'
    # set -g @plugin 'github_username/plugin_name#branch'
    # set -g @plugin 'git@github.com:user/plugin'
    # set -g @plugin 'git@bitbucket.com:user/plugin'

    # Initialize TMUX plugin manager (keep this line at the very bottom of tmux.conf)
    run '~/.tmux/plugins/tpm/tpm'
  ```
3) Обновляем tmux конфиг
```cmd
  tmux source ~/.tmux.conf
```
4) Добавляем плагин в powerline в ~/.tmux.conf
```cmd
   set -g @plugin 'erikw/tmux-powerline'
```
5) Запускаем скрипт для установки плагинов
   ```cmd
    ~/.tmux/plugins/tpm/scripts/install_plugins.sh
  ```