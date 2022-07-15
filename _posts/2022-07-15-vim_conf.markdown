# My vim config and installation script.

## Install Vim and python linters

#### pip install pyflakes pep8 pylint ipython

#### sudo apt install vim

## A minimalist Vim plugin manager https://github.com/junegunn/vim-plug
---
#### 1) upload vim-plug

        sh -c 'curl -fLo "${XDG_DATA_HOME:-$HOME/.local/share}"/nvim/site/autoload/plug.vim --create-dirs https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim'


#### 2) add folder for plugins

        mkdir ~/.vim/plugged

#### 3) change vim config

        nano ~/.vimrc

#### 4) add line

        " plugins section
        call plug#begin('~/.vim/plugged')
        
        call plug#end()

        " config section

## Color sheme https://github.com/tomasiser/vim-code-dark
---
#### 1) change vim config

        nano ~/.vimrc

#### 2) add line to plug section

        Plug 'tomasiser/vim-code-dark'

#### 3) isntall plugin

        vim -c 'PlugInstall'

#### 4) add line to config section

        colorscheme codedark

#### 5) If you have vim-airline, you can also enable the provided theme

        let g:airline_theme = 'codedark'

## Vim airline https://github.com/vim-airline/vim-airline
---
#### 1) change vim config

        vim ~/.vimrc

#### 2) add lines to plug section

        Plug 'vim-airline/vim-airline'
        Plug 'vim-airline/vim-airline-themes'
 
#### 3) isntall plugin

        vim -c 'PlugInstall'
 
#### 4) Add airline config
 
        "  vim--airline config
        let laststatus=2
        let g:airline_theme='badwolf'
        let g:airline_powerline_fonts = 1
        let g:airline#extensions#tabline#formatter = 'unique_tail'
        " enabled Smarter tab line
        let g:airline#extensions#tabline#enabled = 1 

## Vim icons https://github.com/ryanoasis/vim-devicons
---
#### 1) change vim config

        vim ~/.vimrc

#### 2) add lines to plug section

        Plug 'ryanoasis/vim-devicons'

Mouse on
---
#### 1) change vim config

        vim ~/.vimrc

#### 2) add lines to config section

        set mouse=a

## Asynchronous Lint Engine https://github.com/dense-analysis/ale
---
#### 1) change vim config

        vim ~/.vimrc

#### 2) add lines to plug section

        Plug 'dense-analysis/ale'

## Nerd Tree https://github.com/preservim/nerdtree
---

Using materials
#### https://github.com/jistr/vim-nerdtree-tabs
#### https://github.com/easymotion/vim-easymotion
#### http://vimdoc.sourceforge.net/htmldoc/options.html#option-summary
#### https://github.com/jez/vim-as-an-ide
#### https://vimawesome.com/
#### https://github.com/junegunn/fzf.vim
#### https://benmccormick.org/2014/07/02/learning-vim-in-2014-vim-as-language
