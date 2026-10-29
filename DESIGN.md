---
name: QA Study Portfolio — Fieldwork
description: Локальная мастерская для изучения тестирования и сохранения своей работы.
colors:
  paper: "#f3f0e9"
  raised-paper: "#fbfaf6"
  graphite: "#232521"
  sage: "#e6e8df"
  muted-ink: "#66695e"
  accent: "#b74026"
  accent-hover: "#97351f"
  signal-vermilion: "#c6482d"
  on-signal: "#fffaf4"
  rule: "#caccc1"
  rule-soft: "#dedfd6"
  success: "#496345"
  danger: "#ad3424"
  warning: "#80601a"
  dark-paper: "#22251f"
  dark-raised: "#2c3028"
  dark-sage: "#353d30"
  dark-ink: "#efeee5"
  dark-muted: "#b7bbad"
  dark-accent: "#ed8a6c"
  dark-accent-hover: "#ffab90"
  dark-on-accent: "#2b201a"
  dark-rule: "#535b4c"
  dark-rule-soft: "#41473c"
typography:
  display:
    fontFamily: "Unbounded, Manrope, sans-serif"
    fontSize: "clamp(36px, 4.1vw, 62px)"
    fontWeight: 550
    lineHeight: 1.2
    letterSpacing: "-0.037em"
  headline:
    fontFamily: "Unbounded, Manrope, sans-serif"
    fontSize: "clamp(26px, 3vw, 40px)"
    fontWeight: 550
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Manrope, Segoe UI, sans-serif"
    fontSize: "21px"
    fontWeight: 750
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Manrope, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "normal"
  button:
    fontFamily: "Manrope, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.5
  label:
    fontFamily: "Manrope, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 750
  mono:
    fontFamily: "ui-monospace, Cascadia Code, Consolas, monospace"
    fontSize: "12px"
    lineHeight: 1.8
rounded:
  sm: "6px"
  button: "7px"
  tag: "5px"
  md: "12px"
  lg: "16px"
spacing:
  control-gap: "8px"
  control-inline: "17px"
  content-gap: "20px"
  panel-padding: "22px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-signal}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "10px 17px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.on-signal}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.graphite}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "10px 17px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-signal}"
    typography: "{typography.button}"
    rounded: "{rounded.button}"
    padding: "10px 17px"
  text-field:
    backgroundColor: "{colors.raised-paper}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.sm}"
    padding: "0 12px"
  tag:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.tag}"
    padding: "3px 7px"
  panel:
    backgroundColor: "{colors.raised-paper}"
    textColor: "{colors.graphite}"
    rounded: "{rounded.md}"
    padding: "22px"
  course-register-current:
    backgroundColor: "{colors.signal-vermilion}"
    textColor: "{colors.on-signal}"
    padding: "14px 15px 12px"
---

# Design System: QA Study Portfolio — Fieldwork

## Overview

**Creative North Star: "Fieldwork — редакционная мастерская тестировщика"**

Fieldwork — редакционная мастерская тестировщика: тёплая бумага, графитовый текст, чёткая типографика и небольшое число выразительных акцентов. Геометрия показывает структуру реального курса; рабочие формы остаются спокойными и читаемыми.

Это описание реализованной версии, извлечённое из `css/fieldwork.css` и текущей разметки. Направление выбрал исполнитель в рамках разрешённой обратимой переработки. Оно не записывается как подтверждённое предпочтение пользователя. Стратегия отдельных экранов и допущения проекта находятся в `docs/superpowers/specs/2026-10-29-fieldwork-design.md` и `PRODUCT.md`.

**Key Characteristics:**

- Локальные шрифты с кириллицей
- Плоские рабочие поверхности
- Реальная структура курса
- Семантические формы
- Светлая, тёмная и системная темы

## Colors

Основные семантические переменные определены в `css/fieldwork.css`; файл загружается последним и переопределяет прежнюю палитру.

- **Paper / `--surface`** — фон рабочей области.
- **Raised paper / `--surface-raised`** — поля, панели, диалоги.
- **Graphite / `--text-primary`** — основной текст; тот же графит образует постоянный тёмный фон навигации.
- **Sage / `--surface-soft`** — спокойная выделенная поверхность, состояния и теги.
- **Accent / `--accent`** — основные действия и текстовые акценты; более тёмная киноварь сохраняет контраст небольшого текста.
- **Signal vermilion** — выделение текущего модуля и знак бренда. Это отдельное фактическое значение, а не ещё один режим `--accent`.
- **Rule / `--border` и `--border-light`** — реестры, разделители и границы.

Светлая, тёмная и системная темы используют одни семантические имена. Тёмная тема меняет бумагу на угольно-зелёную поверхность и акцент на светлый терракотовый. Палитра навигации остаётся тёмной в обеих темах. Статусные цвета обозначают успех, предупреждение и ошибку; смысл также передаётся текстом и состоянием элемента. В тёмной и системной тёмной теме текст опасного действия использует `--text-on-danger: #2b201a` на светлом фоне ошибки.

## Typography

**Display:** локальный variable Unbounded, веса 200–900. **Body:** локальный variable Manrope, веса 200–800. Оба файла содержат кириллицу, включая Ё/ё; исходники, хеши и полные лицензии OFL сохранены в `assets/fonts/`. Загрузка внешнего сервиса шрифтов не требуется. Моноширинный стек применяется для кода и измеряемых значений.

Размеры и веса основных ролей находятся во frontmatter. Общие h1/h2 используют Unbounded; h3/h4, навигация, поля и пояснения — Manrope. Заголовок раздела в шапке — Manrope 16px/800, на небольшом телефоне 13px. Для крупного display в широком варианте предусмотрены 66px; на телефоне размер уменьшается до диапазона 30–36px. Межбуквенный интервал не плотнее −0.04em.

Тексты справки имеют размер 16px и интерлиньяж 1.85 с шириной до 75ch; на телефоне — 15px. Мелкие числа и подписи служат вторичным указателем. Название действия или урока остаётся основной читаемой информацией.

## Layout

Приложение — SPA без сборки. `#app-wrapper` содержит боковую панель и растягиваемую `.main-container`; содержимое сохраняет `min-width: 0`, чтобы длинные строки не раздвигали страницу. Максимальная ширина центральной колонки — 1800px. Основной горизонтальный отступ — `clamp(24px, 3.3vw, 58px)`.

- От 1024px: тёмная боковая панель 244px, sticky, высотой 100dvh, со своей прокруткой. Свёрнутое состояние — доступная рейка 76px; кнопка разворачивания остаётся видимой.
- До 1023px: панель фиксирована поверх страницы, убрана из потока; ширина `min(290px, 100vw - 50px)`. Закрытая панель смещена за левый край. Открытое меню сопровождает отдельная затемняющая кнопка-подложка.
- До 760px: поиск занимает вторую строку шапки, основные парные области переходят в одну колонку; горизонтальные отступы 23px.
- До 440px: отступы 20px; размеры заголовков и подписей уменьшаются.

Шапка имеет минимальную высоту 84px на компьютере и 78px на планшете. Контекстная область становится тихим нижним блоком; на Главной, Сегодня и узком экране она скрыта. Основные кнопки, поля и строки боковой навигации имеют минимальную высоту 44px.

## Elevation & Depth

По умолчанию поверхности плоские. Границы и различие тонов дают структуру; hover не поднимает панели. Декоративных стеклянных слоёв и градиентов в Fieldwork нет. Тени оставлены для перекрывающих интерфейс объектов.

- `--shadow-sm`: `0 2px 8px rgba(27,34,24,.06)`.
- `--shadow-md`: `0 9px 26px rgba(27,34,24,.1)` — уведомления.
- `--shadow-lg`: `0 20px 70px rgba(16,23,14,.2)` — диалоги и открытая мобильная панель.

## Shapes

Основной язык — прямые линии, тонкие разделители и умеренные скругления. Реестр модулей состоит из общих ячеек без скругления каждой ячейки. Поля имеют радиус 6px, кнопки 7px, панели 12px, выделенные крупные поверхности и диалоги 16px. Теги используют радиус 5px. Нативные checkbox и radio сохраняют свою форму и семантику.

## Components

**Buttons.** `.btn` — минимум 44px по высоте, внутренний отступ 10px 17px, Manrope 13px/700, граница 1px. `.btn--primary` / `.btn-primary` используют семантический акцент, `.btn--danger` / `.btn-danger` — цвет ошибки. Hover меняет цвет без подъёма или тени. Disabled уменьшает непрозрачность и меняет курсор.

**Fields.** Светлая приподнятая поверхность, тонкая граница, минимальная высота 44px, каретка цвета акцента. `:focus-visible` — контур 2px с отступом 4px. Checkbox, radio и range используют `accent-color`; настоящие checkbox не заменяются декоративным переключателем.

**Navigation.** Групповые подписи разделяют 15 существующих маршрутов. Активная строка выделена шалфейным тёмным тоном и тёплой иконкой. Закрытие мобильной панели доступно кнопкой, подложкой и предусмотренным кодом клавиатурным сценарием. Иконки берутся из встроенного SVG-спрайта.

**Panels and tags.** Панели — фон `--surface-raised`, граница `--border`, радиус 12px и отступ 22px. Вложенные панели превращаются в спокойные секции с разделителем. Теги и badges используют `--surface-soft` и читаемый основной текст.

**Course register.** `.course-atlas` — единый нумерованный реестр, а не набор отдельных карточек. Ячейка показывает номер, реальный прогресс и количество завершённых тем. Текущая ячейка киноварная, завершённая — шалфейная. Сетка имеет 8 колонок, до 760px — 6, до 440px — 4. Процент передаётся в `--module-progress` на `.atlas-module__progress`; CSS не придумывает данные.

**Dialogs.** Оба существующих вида DOM поддерживаются: статическая `.modal` с `.modal__dialog` и runtime `.modal-overlay > .modal`. Внешний слой фиксирован и центрирует одну прокручиваемую панель; runtime-панель имеет `position: relative`. Высота ограничена 85dvh, на телефоне — 90dvh. `[hidden]` всегда скрыт.

**Motion and print.** Переходы состояний занимают 160ms, мобильная панель — 240ms с `cubic-bezier(.16,1,.3,1)`. При `prefers-reduced-motion: reduce` переходы и анимации отключены. Режим презентации и печать скрывают навигацию и служебные области.

## Do's and Don'ts

- **Do** брать текущие семантические значения из `css/fieldwork.css`, сохраняя режимы light/dark/system.
- **Do** использовать реальные данные курса и пользовательские записи для чисел, подписей и прогресса.
- **Do** сохранять нативную семантику форм, видимый фокус и клавиатурный доступ.
- **Do** добавлять новые общие компоненты в существующую систему, сохраняя спокойное чтение и тонкие разделители.
- **Don't** подключать `theme-pro.css`, `motion.js` и старый декоративный слой поверх Fieldwork: эти исторические файлы не участвуют в текущем runtime.
- **Don't** возвращать декоративные градиенты, стеклянные фоны и повторяющиеся орнаменты в эту реализованную тему.
- **Don't** выдавать проценты обучения за профессиональную квалификацию или придумывать достижения.
- **Don't** трактовать выбор Fieldwork исполнителем как согласованное навсегда предпочтение пользователя.
