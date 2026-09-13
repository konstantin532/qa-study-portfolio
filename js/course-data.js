/* course-data.js — статические данные курса QA, глоccарий, дорожная карта, шаблоны */

(function () {
  'use strict';

  // ========================================================================
  // RAW DATA: MODULES
  // ========================================================================

  const MODULES = [
    {
      id: 'm_intro',
      title: 'Введение в QA',
      description: 'Основы тестирования и роли QA-инженера',
      order: 1,
      tags: ['manual', 'beginner', 'theory'],
      durationWeeks: 2,
      progress: 0,
      status: 'in_progress',
      prerequisites: []
    },
    {
      id: 'm_docs',
      title: 'Тестовая документация',
      description: 'Тест-кейсы, чек-листы, тест-планы',
      order: 2,
      tags: ['manual', 'beginner', 'documentation'],
      durationWeeks: 3,
      progress: 0,
      status: 'locked',
      prerequisites: ['m_intro']
    },
    {
      id: 'm_design',
      title: 'Техники тест-дизайна',
      description: 'Эквивалентное разбиение, граничные значения',
      order: 3,
      tags: ['manual', 'intermediate', 'test-design'],
      durationWeeks: 3,
      progress: 0,
      status: 'locked',
      prerequisites: ['m_docs']
    },
    {
      id: 'm_tools',
      title: 'Инструменты и автоматизация',
      description: 'Postman, DevTools, Jira, Selenium/Playwright',
      order: 4,
      tags: ['automation', 'intermediate', 'tools'],
      durationWeeks: 4,
      progress: 0,
      status: 'locked',
      prerequisites: ['m_design']
    },
    {
      id: 'm_project',
      title: 'Практический проект',
      description: 'Итоговый проект и демо-стенд',
      order: 5,
      tags: ['manual', 'automation', 'practice', 'advanced'],
      durationWeeks: 2,
      progress: 0,
      status: 'locked',
      prerequisites: ['m_tools']
    }
  ];

  // ========================================================================
  // RAW DATA: LESSONS
  // ========================================================================

  const LESSONS = [
    // --- Module 1: Введение в QA ---
    {
      id: 'l_intro_1',
      moduleId: 'm_intro',
      title: 'Что такое качество ПО',
      type: 'article',
      content: {
        html: '<h2>Качество ПО</h2><p>Качество программного обеспечения — это совокупность характеристик, определяющих способность ПО удовлетворять установленным и предполагаемым потребностям пользователей.</p><h3>Модели качества</h3><ul><li>ISO/IEC 25010 — 8 характеристик: функциональность, надёжность, производительность, удобство использования, совместимость, безопасность, удобство сопровождения, переносимость.</li><li>McCall — 11 факторов, сгруппированных в 3 категории: характеристики продукта, процесс редактирования, процесс адаптации.</li></ul><h3>Почему важно</h3><p>Качество — это не просто «отсутствие багов». Это соответствие требованиям, надёжность, удобство и удовлетворённость пользователя.</p>',
        summary: 'Качество ПО — совокупность характеристик, определяющих соответствие требованиям. Модель ISO/IEC 25010 описывает 8 характеристик качества.'
      },
      order: 1,
      durationMinutes: 15,
      tags: ['theory', 'quality', 'iso25010'],
      artifactsCount: 0,
      isCompleted: false
    },
    {
      id: 'l_intro_2',
      moduleId: 'm_intro',
      title: 'Роль QA-инженера',
      type: 'video',
      content: {
        source: 'local',
        url: '#',
        transcript: 'QA-инженер — это специалист, который отвечает за качество продукта на всех этапах разработки. Он не просто «ищет баги», а предотвращает их появление. QA участвует в анализе требований, проектировании тестов, автоматизации, анализе рисков и поддержке процессов разработки. QA-инженер работает в связке с разработчиками, аналитиками и продакт-менеджерами, обеспечивая общий язык и общие стандарты качества.'
      },
      order: 2,
      durationMinutes: 20,
      tags: ['theory', 'role', 'responsibilities'],
      artifactsCount: 0,
      isCompleted: false
    },
    {
      id: 'l_intro_3',
      moduleId: 'm_intro',
      title: 'Жизненный цикл разработки (SDLC)',
      type: 'article',
      content: {
        html: '<h2>SDLC — Software Development Life Cycle</h2><p>SDLC — это процесс создания ПО от идеи до вывода из эксплуатации. Основные модели SDLC:</p><h3>Каскадная (Waterfall)</h3><p>Каждая фаза завершается до начала следующей. Просто, но негибко.</p><h3>Итеративная</h3><p>Продукт создаётся циклами, каждый раз улучшая результат.</p><h3>Agile</h3><p>Короткие итерации (спринты), постоянная обратная связь, адаптивность.</p><h3>DevOps</h3><p>Непрерывная интеграция и доставка (CI/CD), автоматизация тестов, мониторинг.</p><h3>Фазы SDLC</h3><ol><li>Сбор и анализ требований</li><li>Проектирование</li><li>Разработка</li><li>Тестирование</li><li>Развёртывание</li><li>Сопровождение</li></ol>',
        summary: 'SDLC описывает процесс создания ПО. Основные модели: Waterfall, Agile, DevOps. Фазы: требования, проектирование, разработка, тестирование, развёртывание, сопровождение.'
      },
      order: 3,
      durationMinutes: 25,
      tags: ['theory', 'sdlc', 'agile', 'waterfall'],
      artifactsCount: 0,
      isCompleted: false
    },
    {
      id: 'l_intro_4',
      moduleId: 'm_intro',
      title: 'Жизненный цикл тестирования (STLC)',
      type: 'quiz',
      content: {
        questions: [
          {
            id: 'q_stlc_1',
            text: 'Что такое STLC?',
            type: 'single',
            options: [
              'Последовательность этапов тестирования в рамках SDLC',
              'Автоматический инструмент тестирования',
              'Стандарт описания баг-репортов',
              'Метод оценки производительности'
            ],
            correct: [0],
            explanation: 'STLC (Software Testing Life Cycle) — это последовательность этапов тестирования, выполняемых в рамках SDLC.'
          },
          {
            id: 'q_stlc_2',
            text: 'Какие этапы включает STLC?',
            type: 'multiple',
            options: [
              'Анализ требований',
              'Планирование тестирования',
              'Разработка тест-кейсов',
              'Настройка тестового окружения',
              'Выполнение тестов',
              'Анализ результатов и отчётность'
            ],
            correct: [0, 1, 2, 3, 4, 5],
            explanation: 'STLC включает все перечисленные этапы — от анализа требований до отчётности.'
          },
          {
            id: 'q_stlc_3',
            text: 'Критерии входа (Entry Criteria) определяют, когда можно начать тестирование.',
            type: 'true_false',
            options: ['Верно', 'Неверно'],
            correct: [0],
            explanation: 'Entry Criteria — это условия, при выполнении которых можно начать определённый этап тестирования.'
          },
          {
            id: 'q_stlc_4',
            text: 'Что такое критерии выхода (Exit Criteria)?',
            type: 'open',
            correct: 'Условия, при выполнении которых тестирование считается завершённым (например, все тест-кейсы выполнены, нет критичных багов, достигнут заданный процент покрытия).',
            explanation: 'Exit Criteria определяют, когда можно остановить тестирование — например, все запланированные тесты выполнены, критических дефектов нет.'
          }
        ]
      },
      order: 4,
      durationMinutes: 30,
      tags: ['theory', 'stlc', 'quiz'],
      artifactsCount: 2,
      isCompleted: false
    },

    // --- Module 2: Тестовая документация ---
    {
      id: 'l_docs_1',
      moduleId: 'm_docs',
      title: 'Тест-кейсы',
      type: 'article',
      content: {
        html: '<h2>Тест-кейс</h2><p>Тест-кейс (test case) — это набор условий, шагов и ожидаемых результатов, которые позволяют проверить, соответствует ли система требованиям.</p><h3>Структура тест-кейса</h3><ul><li><strong>ID</strong> — уникальный идентификатор</li><li><strong>Заголовок</strong> — что проверяется</li><li><strong>Предусловия</strong> — что должно быть выполнено до теста</li><li><strong>Шаги</strong> — последовательность действий</li><li><strong>Ожидаемый результат</strong> — что должно произойти</li><li><strong>Фактический результат</strong> — что произошло на самом деле</li><li><strong>Статус</strong> — Pass / Fail / Blocked / Skipped</li></ul><h3>Виды тест-кейсов</h3><ul><li>Позитивные — проверяют корректную работу системы</li><li>Негативные — проверяют реакцию на некорректные данные</li></ul><h3>Хороший тест-кейс</h3><ul><li>Одна проверка — один тест-кейс</li><li>Понятные и воспроизводимые шаги</li><li>Ожидаемый результат однозначен и проверяем</li></ul>',
        summary: 'Тест-кейс — это описание условий, шагов и ожидаемых результатов для проверки системы. Состоит из предусловий, шагов, ожидаемого и фактического результата, статуса.'
      },
      order: 1,
      durationMinutes: 20,
      tags: ['documentation', 'test-case', 'theory'],
      artifactsCount: 1,
      isCompleted: false
    },
    {
      id: 'l_docs_2',
      moduleId: 'm_docs',
      title: 'Чек-листы',
      type: 'article',
      content: {
        html: '<h2>Чек-лист</h2><p>Чек-лист (checklist) — это список проверок без детальных шагов. Используется для быстрого покрытия функциональности.</p><h3>Когда использовать</h3><ul><li>При регрессионном тестировании</li><li>При исследовательском тестировании</li><li>Когда подробные тест-кейсы не нужны</li></ul><h3>Отличие от тест-кейса</h3><table><tr><th>Тест-кейс</th><th>Чек-лист</th></tr><tr><td>Детальные шаги</td><td>Только пункт проверки</td></tr><tr><td>Один сценарий</td><td>Группа проверок</td></tr><tr><td>Дольше писать</td><td>Быстрее составить</td></tr><tr><td>Лучше для новичков</td><td>Требует опыта</td></tr></table>',
        summary: 'Чек-лист — это список проверок без детальных шагов. Быстрее тест-кейсов, используется для регрессии и исследовательского тестирования.'
      },
      order: 2,
      durationMinutes: 15,
      tags: ['documentation', 'checklist', 'theory'],
      artifactsCount: 2,
      isCompleted: false
    },
    {
      id: 'l_docs_3',
      moduleId: 'm_docs',
      title: 'Тест-планы',
      type: 'article',
      content: {
        html: '<h2>Тест-план</h2><p>Тест-план (test plan) — это документ, описывающий объём, стратегию, ресурсы и расписание тестирования.</p><h3>Структура по IEEE 829</h3><ol><li>Идентификатор тест-плана</li><li>Ссылки (входные документы)</li><li>Вводная часть</li><li>Элементы для тестирования</li><li>Элементы, не подлежащие тестированию</li><li>Подход к тестированию</li><li>Критерии прохождения/провала</li><li>Критерии приостановки и возобновления</li><li>Тестовые материалы</li><li>Тестовое окружение</li><li>Обязанности</li><li>Расписание</li><li>Риски и меры по снижению</li><li>Согласования</li></ol><h3>Виды тест-планов</h3><ul><li>Мастер-тест-план — для всего проекта</li><li>Тест-план уровня — для уровня тестирования (модульное, интеграционное, системное)</li></ul>',
        summary: 'Тест-план описывает объём, стратегию, ресурсы и расписание тестирования. Стандарт IEEE 829 определяет 14 разделов тест-плана.'
      },
      order: 3,
      durationMinutes: 30,
      tags: ['documentation', 'test-plan', 'ieee829'],
      artifactsCount: 1,
      isCompleted: false
    },
    {
      id: 'l_docs_4',
      moduleId: 'm_docs',
      title: 'Матрицы трассируемости',
      type: 'lab',
      content: {
        task: 'Составить матрицу трассируемости для тестирования формы регистрации. Связать 5 требований с тест-кейсами и определить покрытие.',
        environment: 'Local (текстовый редактор / таблица)',
        steps: [
          'Выпишите 5 требований к форме регистрации (валидация email, пароль не менее 8 символов, подтверждение пароля, капча, согласие с условиями)',
          'Создайте 8-10 тест-кейсов, покрывающих эти требования',
          'Постройте таблицу: строки — требования, столбцы — тест-кейсы, на пересечении — отметка покрытия',
          'Определите, какие требования не покрыты тест-кейсами',
          'Добавьте недостающие тест-кейсы'
        ]
      },
      order: 4,
      durationMinutes: 45,
      tags: ['documentation', 'traceability', 'lab'],
      artifactsCount: 1,
      isCompleted: false
    },

    // --- Module 3: Техники тест-дизайна ---
    {
      id: 'l_design_1',
      moduleId: 'm_design',
      title: 'Эквивалентное разбиение',
      type: 'article',
      content: {
        html: '<h2>Эквивалентное разбиение (Equivalence Partitioning)</h2><p>Техника, при которой входные данные делятся на классы эквивалентности. Предполагается, что все значения одного класса ведут себя одинаково, поэтому достаточно проверить по одному значению из каждого класса.</p><h3>Пример</h3><p>Поле принимает возраст от 18 до 65 лет.</p><ul><li>Класс 1 (валидный): 18–65 → например, 30</li><li>Класс 2 (невалидный, меньше): < 18 → например, 10</li><li>Класс 3 (невалидный, больше): > 65 → например, 80</li></ul><p>Достаточно 3 тест-кейсов вместо перебора всех значений.</p>',
        summary: 'Эквивалентное разбиение — техника, при которой входные данные делятся на классы эквивалентности. Достаточно проверить по одному значению из каждого класса.'
      },
      order: 1,
      durationMinutes: 20,
      tags: ['test-design', 'equivalence-partitioning', 'theory'],
      artifactsCount: 0,
      isCompleted: false
    },
    {
      id: 'l_design_2',
      moduleId: 'm_design',
      title: 'Граничные значения',
      type: 'article',
      content: {
        html: '<h2>Анализ граничных значений (Boundary Value Analysis)</h2><p>Ошибки чаще всего возникают на границах диапазонов. Техника дополняет эквивалентное разбиение и фокусируется на значениях, ближайших к границам классов.</p><h3>Правило</h3><p>Для диапазона [A, B] проверяем: A-1, A, A+1, B-1, B, B+1 (где применимо).</p><h3>Пример</h3><p>Поле принимает значения от 1 до 100.</p><ul><li>0 (невалидное)</li><li>1 (граница, валидное)</li><li>2 (валидное, у границы)</li><li>99 (валидное, у границы)</li><li>100 (граница, валидное)</li><li>101 (невалидное)</li></ul><p>Итого 6 тест-кейсов вместо 100.</p>',
        summary: 'Анализ граничных значений — техника тест-дизайна, фокусирующаяся на значениях у границ диапазонов, где ошибки наиболее вероятны.'
      },
      order: 2,
      durationMinutes: 20,
      tags: ['test-design', 'boundary-values', 'theory'],
      artifactsCount: 1,
      isCompleted: false
    },
    {
      id: 'l_design_3',
      moduleId: 'm_design',
      title: 'Таблица решений',
      type: 'lab',
      content: {
        task: 'Построить таблицу решений для системы скидок: если сумма > 5000 и клиент премиум — скидка 15%, если сумма > 5000 и клиент обычный — скидка 10%, если сумма > 1000 и премиум — 5%, иначе 0%. Сгенерировать тест-кейсы из таблицы.',
        environment: 'Local (текстовый редактор / таблица)',
        steps: [
          'Определите условия: «Сумма > 5000», «Сумма > 1000», «Клиент премиум»',
          'Определите действия: «Скидка 15%», «Скидка 10%», «Скидка 5%», «Скидка 0%»',
          'Постройте таблицу решений со всеми комбинациями условий',
          'Исключите невозможные или избыточные комбинации',
          'Для каждой валидной комбинации создайте тест-кейс'
        ]
      },
      order: 3,
      durationMinutes: 40,
      tags: ['test-design', 'decision-table', 'lab'],
      artifactsCount: 1,
      isCompleted: false
    },
    {
      id: 'l_design_4',
      moduleId: 'm_design',
      title: 'Исследовательское тестирование',
      type: 'article',
      content: {
        html: '<h2>Исследовательское тестирование (Exploratory Testing)</h2><p>Одновременное изучение системы, проектирование и выполнение тестов. Тестировщик исследует продукт, опираясь на опыт и интуицию, документируя находки.</p><h3>Когда применять</h3><ul><li>Недостаточно времени на написание тест-кейсов</li><li>Новый функционал, ещё не покрытый документацией</li><li>Дополнение к формальному тестированию</li></ul><h3>Подходы</h3><ul><li><strong>Session-based</strong> — таймбоксированные сессии с чартером (целью)</li><li><strong>Scenario-based</strong> — исследование через сценарии использования</li><li><strong>Free-form</strong> — свободное исследование без ограничений</li></ul><h3>Документирование</h3><p>Даже при исследовательском тестировании важно фиксировать шаги, находки и баги для воспроизводимости.</p>',
        summary: 'Исследовательское тестирование — одновременное изучение и тестирование системы. Подходит для нового функционала и дополнения к формальному тестированию.'
      },
      order: 4,
      durationMinutes: 25,
      tags: ['test-design', 'exploratory', 'theory'],
      artifactsCount: 0,
      isCompleted: false
    },

    // --- Module 4: Инструменты и автоматизация ---
    {
      id: 'l_tools_1',
      moduleId: 'm_tools',
      title: 'Postman — тестирование API',
      type: 'article',
      content: {
        html: '<h2>Postman</h2><p>Postman — инструмент для тестирования REST API. Позволяет отправлять запросы, писать тесты на JavaScript, создавать коллекции и переменные окружения.</p><h3>Основные возможности</h3><ul><li>GET / POST / PUT / DELETE / PATCH запросы</li><li>Заголовки, тело запроса, параметры</li><li>Тесты через pm.test() и pm.expect()</li><li>Переменные окружения (environment variables)</li><li>Коллекции и批量-запуск (collection runner)</li></ul><h3>Пример теста</h3><pre><code>pm.test("Status is 200", function () {\n  pm.response.to.have.status(200);\n});\npm.test("Response has user id", function () {\n  var json = pm.response.json();\n  pm.expect(json).to.have.property("id");\n});</code></pre>',
        summary: 'Postman — инструмент для тестирования REST API: запросы, тесты на JS, коллекции, переменные окружения.'
      },
      order: 1,
      durationMinutes: 30,
      tags: ['tools', 'api', 'postman'],
      artifactsCount: 1,
      isCompleted: false
    },
    {
      id: 'l_tools_2',
      moduleId: 'm_tools',
      title: 'Chrome DevTools',
      type: 'article',
      content: {
        html: '<h2>Chrome DevTools</h2><p>Набор инструментов разработчика в браузере Chrome. Незаменимы для ручного тестирования веб-приложений.</p><h3>Ключевые панели</h3><ul><li><strong>Elements</strong> — инспектирование DOM и CSS</li><li><strong>Console</strong> — ошибки JS, вывод консоли</li><li><strong>Network</strong> — все сетевые запросы, статусы, тайминги</li><li><strong>Application</strong> — localStorage, sessionStorage, cookies</li><li><strong>Performance</strong> — профилирование загрузки и выполнения</li><li><strong>Lighthouse</strong> — аудит производительности и доступности</li></ul><h3>Сценарии использования</h3><ul><li>Проверка, что запрос ушёл и вернулся с корректным статусом</li><li>Изменение CSS «на лету» для проверки адаптивности</li><li>Очистка localStorage для проверки «чистого» старта</li><li>Проверка ошибок в консоли при выполнении действий</li></ul>',
        summary: 'Chrome DevTools — инструменты для тестирования веб-приложений: DOM, сетевые запросы, консоль, хранилище, производительность.'
      },
      order: 2,
      durationMinutes: 25,
      tags: ['tools', 'devtools', 'browser'],
      artifactsCount: 1,
      isCompleted: false
    },
    {
      id: 'l_tools_3',
      moduleId: 'm_tools',
      title: 'Jira и Trello — управление задачами',
      type: 'article',
      content: {
        html: '<h2>Jira и Trello</h2><p>Системы управления задачами и баг-трекинга. QA-инженер использует их для создания баг-репортов, отслеживания статусов и планирования спринтов.</p><h3>Jira</h3><ul><li>Баг-репорты оформляются как Issue типа Bug</li><li>Поля: Summary, Description, Priority, Severity, Assignee, Status</li><li>Канбан-доски и Scrum-борды</li><li>Интеграция с тест-менеджмент-инструментами (Zephyr, TestRail)</li></ul><h3>Trello</h3><ul><li>Простые доски, карточки и колонки</li><li>Удобно для небольших команд и стартапов</li><li>Меньше настроек, чем в Jira, но быстрее старт</li></ul><h3>Жизненный цикл бага в трекере</h3><p>New → Assigned → In Progress → Fixed → Ready for Retest → Verified → Closed (или Reopened)</p>',
        summary: 'Jira и Trello — системы управления задачами и баг-трекинга. Жизненный цикл бага: New → Assigned → Fixed → Verified → Closed.'
      },
      order: 3,
      durationMinutes: 20,
      tags: ['tools', 'jira', 'trello', 'bug-tracking'],
      artifactsCount: 0,
      isCompleted: false
    },
    {
      id: 'l_tools_4',
      moduleId: 'm_tools',
      title: 'Основы Selenium и Playwright (обзор)',
      type: 'video',
      content: {
        source: 'local',
        url: '#',
        transcript: 'Selenium — это инструмент для автоматизации веб-браузеров. Поддерживает множество языков программирования (Java, Python, C#, JavaScript) и браузеров. Использует WebDriver для управления браузером. Playwright — современная альтернатива от Microsoft. Поддерживает Chrome, Firefox, Safari «из коробки», имеет встроенную работу с сетевыми запросами и автожидание элементов. Playwright быстрее и проще для новичков, Selenium — более зрелый и распространённый. Оба инструмента позволяют писать автотесты, запускать их в CI/CD и покрывать регрессию.'
      },
      order: 4,
      durationMinutes: 35,
      tags: ['tools', 'automation', 'selenium', 'playwright'],
      artifactsCount: 0,
      isCompleted: false
    },

    // --- Module 5: Практический проект ---
    {
      id: 'l_proj_1',
      moduleId: 'm_project',
      title: 'Итоговый проект',
      type: 'challenge',
      content: {
        brief: 'Протестировать демо-приложение «Интернет-магазин» (фронтенд). Составить тест-план, написать 20+ тест-кейсов, провести тестирование, оформить 5+ баг-репортов, подготовить итоговый отчёт.',
        acceptanceCriteria: [
          'Тест-план соответствует структуре IEEE 829 (минимум 8 разделов)',
          'Минимум 20 тест-кейсов (позитивные и негативные)',
          'Минимум 5 баг-репортов разной критичности',
          'Минимум 1 чек-лист на регрессию',
          'Итоговый отчёт с метриками: покрытие, найденные дефекты, риски',
          'Все артефакты оформлены в Portfolio-приложении'
        ]
      },
      order: 1,
      durationMinutes: 180,
      tags: ['practice', 'project', 'challenge'],
      artifactsCount: 2,
      isCompleted: false
    },
    {
      id: 'l_proj_2',
      moduleId: 'm_project',
      title: 'Репозиторий тестов',
      type: 'lab',
      content: {
        task: 'Структурировать все тестовые артефакты из предыдущих модулей в единый репозиторий. Создать иерархию папок: test-plans, test-cases, bug-reports, checklists, reports. Снабдить каждый артефакт тегами.',
        environment: 'Local (файловая система / Portfolio-приложение)',
        steps: [
          'Создайте структуру папок для тестовой документации',
          'Разложите все созданные артефакты по папкам',
          'Добавьте теги к каждому артефакту (модуль, тип, приоритет)',
          'Создайте README-файл с описанием структуры репозитория',
          'Проверьте, что все ссылки между документами корректны'
        ]
      },
      order: 2,
      durationMinutes: 60,
      tags: ['practice', 'repository', 'lab'],
      artifactsCount: 0,
      isCompleted: false
    },
    {
      id: 'l_proj_3',
      moduleId: 'm_project',
      title: 'Демо-стенд и защита',
      type: 'challenge',
      content: {
        brief: 'Подготовить демо-презентацию результатов тестирования. Показать тест-план, ключевые баг-репорты, метрики и выводы. Объяснить выбор техник тест-дизайна и инструменты.',
        acceptanceCriteria: [
          'Презентация не более 10 минут',
          'Демонстрация 2-3 ключевых баг-репортов',
          'Показ метрик покрытия и дефектов',
          'Обоснование выбранных техник тест-дизайна',
          'Ответы на вопросы «пользователя»'
        ]
      },
      order: 3,
      durationMinutes: 120,
      tags: ['practice', 'demo', 'challenge'],
      artifactsCount: 0,
      isCompleted: false
    }
  ];

  // ========================================================================
  // RAW DATA: ARTIFACTS
  // ========================================================================

  const ARTIFACTS = [
    // --- Module 1 artifacts ---
    {
      id: 'a_intro_1',
      lessonId: 'l_intro_4',
      type: 'bug_report',
      title: 'Баг-репорт: форма входа не показывает ошибку при пустом пароле',
      data: {
        summary: 'Форма входа не отображает сообщение об ошибке при пустом поле «Пароль»',
        steps: [
          'Открыть страницу входа /login',
          'Оставить поле «Email» заполненным (test@example.com)',
          'Оставить поле «Пароль» пустым',
          'Нажать кнопку «Войти»'
        ],
        expected: 'Под полем «Пароль» появляется сообщение «Введите пароль», форма не отправляется',
        actual: 'Форма отправляется, сервер возвращает 500 Internal Server Error, сообщение об ошибке не показывается',
        severity: 'medium',
        priority: 'high',
        status: 'open',
        attachments: []
      },
      tags: ['bug-report', 'login', 'validation'],
      isEditable: true
    },
    {
      id: 'a_intro_2',
      lessonId: 'l_intro_4',
      type: 'checklist',
      title: 'Чек-лист: проверка формы входа',
      data: {
        title: 'Чек-лист тестирования формы входа',
        items: [
          { text: 'Форма отображается на странице /login', isChecked: false },
          { text: 'Все поля имеют placeholder', isChecked: false },
          { text: 'Кнопка «Войти» кликабельна', isChecked: false },
          { text: 'Валидация email при пустом поле', isChecked: false },
          { text: 'Валидация пароля при пустом поле', isChecked: false },
          { text: 'Валидация некорректного email (без @)', isChecked: false },
          { text: 'Вход с корректными данными', isChecked: false },
          { text: 'Вход с неверным паролем', isChecked: false },
          { text: 'Кнопка «Показать пароль» работает', isChecked: false },
          { text: 'Ссылка «Забыли пароль?» ведёт на /reset', isChecked: false },
          { text: 'Форма адаптивна на мобильных (320px)', isChecked: false },
          { text: 'Tab-навигация по полям работает', isChecked: false }
        ]
      },
      tags: ['checklist', 'login', 'regression'],
      isEditable: true
    },

    // --- Module 2 artifacts ---
    {
      id: 'a_docs_1',
      lessonId: 'l_docs_1',
      type: 'test_case',
      title: 'Тест-кейс: успешная регистрация нового пользователя',
      data: {
        id: 'TC_REG_001',
        title: 'Успешная регистрация нового пользователя',
        preconditions: 'Пользователь не зарегистрирован. Открыта страница /register.',
        steps: [
          'В поле «Имя» ввести «Иван»',
          'В поле «Email» ввести «newuser@test.com»',
          'В поле «Пароль» ввести «ValidPass123!»',
          'В поле «Подтвердите пароль» ввести «ValidPass123!»',
          'Установить чекбокс «Согласен с условиями»',
          'Нажать кнопку «Зарегистрироваться»'
        ],
        expected: 'Пользователь перенаправлен на /welcome, отображается сообщение «Регистрация успешна»',
        actual: '',
        status: 'not_run',
        tags: ['registration', 'positive']
      },
      tags: ['test-case', 'registration', 'positive'],
      isEditable: true
    },
    {
      id: 'a_docs_2',
      lessonId: 'l_docs_2',
      type: 'checklist',
      title: 'Чек-лист: проверка формы регистрации (расширенный)',
      data: {
        title: 'Чек-лист тестирования формы регистрации',
        items: [
          { text: 'Форма отображается на странице /register', isChecked: false },
          { text: 'Поле «Имя» принимает кириллицу и латиницу', isChecked: false },
          { text: 'Поле «Имя» отклоняет спецсимволы (<, >, &)', isChecked: false },
          { text: 'Поле «Email» валидирует формат (наличие @ и домена)', isChecked: false },
          { text: 'Поле «Email» отклоняет пустое значение', isChecked: false },
          { text: 'Поле «Пароль» требует минимум 8 символов', isChecked: false },
          { text: 'Поле «Пароль» требует хотя бы 1 цифру', isChecked: false },
          { text: 'Поле «Пароль» требует хотя бы 1 спецсимвол', isChecked: false },
          { text: 'Поле «Подтвердите пароль» проверяет совпадение', isChecked: false },
          { text: 'Чекбокс «Согласен» обязателен для регистрации', isChecked: false },
          { text: 'Кнопка «Зарегистрироваться» заблокирована, пока не заполнены все поля', isChecked: false },
          { text: 'После регистрации — редирект на /welcome', isChecked: false },
          { text: 'Повторная регистрация с тем же email — ошибка «Email занят»', isChecked: false },
          { text: 'Проверка CAPTCHA (если есть)', isChecked: false },
          { text: 'Адаптивность на 320px, 768px, 1024px', isChecked: false },
          { text: 'Доступность: поля доступны с клавиатуры (Tab)', isChecked: false },
          { text: 'Сообщения об ошибках читаются скринридером', isChecked: false }
        ]
      },
      tags: ['checklist', 'registration', 'extended'],
      isEditable: true
    },
    {
      id: 'a_docs_3',
      lessonId: 'l_docs_3',
      type: 'test_plan',
      title: 'Тест-план: тестирование модуля «Корзина»',
      data: {
        scope: 'Функциональное и нефункциональное тестирование модуля «Корзина» интернет-магазина: добавление товаров, изменение количества, удаление, расчёт стоимости, оформление заказа.',
        strategy: 'Ручное функциональное тестирование (позитивные и негативные сценарии), тестирование UI/UX, кросс-браузерное тестирование (Chrome, Firefox, Safari), тестирование на мобильных устройствах.',
        schedule: [
          { phase: 'Анализ требований', days: 2 },
          { phase: 'Написание тест-кейсов', days: 3 },
          { phase: 'Настройка окружения', days: 1 },
          { phase: 'Выполнение тестов', days: 5 },
          { phase: 'Регрессия после исправлений', days: 2 },
          { phase: 'Подготовка отчёта', days: 1 }
        ],
        risks: [
          { risk: 'Изменение требований в процессе тестирования', probability: 'medium', impact: 'high', mitigation: 'Еженедельные ревью требований с аналитиком' },
          { risk: 'Нестабильное тестовое окружение', probability: 'high', impact: 'medium', mitigation: 'Резервное окружение, уведомление DevOps' },
          { risk: 'Недостаток тестовых данных (товары с разными ценами)', probability: 'low', impact: 'medium', mitigation: 'Скрипт генерации тестовых данных' }
        ],
        approvals: [
          { role: 'QA Lead', name: 'Анна Петрова', date: '' },
          { role: 'Product Owner', name: 'Игорь Сидоров', date: '' }
        ]
      },
      tags: ['test-plan', 'cart', 'e-commerce'],
      isEditable: true
    },
    {
      id: 'a_docs_4',
      lessonId: 'l_docs_4',
      type: 'mind_map',
      title: 'Матрица трассируемости: форма регистрации',
      data: {
        title: 'Матрица трассируемости: форма регистрации',
        requirements: [
          { id: 'REQ-01', text: 'Поле «Имя» обязательно для заполнения' },
          { id: 'REQ-02', text: 'Поле «Email» должно быть валидным' },
          { id: 'REQ-03', text: 'Пароль должен быть не менее 8 символов' },
          { id: 'REQ-04', text: 'Подтверждение пароля должно совпадать' },
          { id: 'REQ-05', text: 'Чекбокс «Согласен» обязателен' }
        ],
        testCases: [
          { id: 'TC-01', title: 'Пустое поле «Имя» — ошибка', covers: ['REQ-01'] },
          { id: 'TC-02', title: 'Невалидный email (без @) — ошибка', covers: ['REQ-02'] },
          { id: 'TC-03', title: 'Пароль 7 символов — ошибка', covers: ['REQ-03'] },
          { id: 'TC-04', title: 'Пароль 8 символов — успех', covers: ['REQ-03'] },
          { id: 'TC-05', title: 'Несовпадение паролей — ошибка', covers: ['REQ-04'] },
          { id: 'TC-06', title: 'Чекбокс не отмечен — кнопка заблокирована', covers: ['REQ-05'] },
          { id: 'TC-07', title: 'Успешная регистрация со всеми валидными данными', covers: ['REQ-01', 'REQ-02', 'REQ-03', 'REQ-04', 'REQ-05'] }
        ],
        coverage: {
          totalRequirements: 5,
          coveredRequirements: 5,
          uncoveredRequirements: [],
          percentage: 100
        }
      },
      tags: ['traceability', 'registration', 'matrix'],
      isEditable: true
    },

    // --- Module 3 artifacts ---
    {
      id: 'a_design_1',
      lessonId: 'l_design_2',
      type: 'test_case',
      title: 'Тест-кейсы: граничные значения поля «Возраст» (18–65)',
      data: {
        id: 'TC_BVA_AGE',
        title: 'Набор тест-кейсов на граничные значения для поля «Возраст»',
        preconditions: 'Открыта форма с полем «Возраст», диапазон 18–65',
        steps: [
          'Ввести значение 17 → ожидается ошибка «Возраст должен быть от 18 до 65»',
          'Ввести значение 18 → ожидается успех (валидное)',
          'Ввести значение 19 → ожидается успех (валидное)',
          'Ввести значение 64 → ожидается успех (валидное)',
          'Ввести значение 65 → ожидается успех (валидное)',
          'Ввести значение 66 → ожидается ошибка «Возраст должен быть от 18 до 65»'
        ],
        expected: 'Система корректно валидирует граничные значения: 17 и 66 — ошибки, 18–65 — успех',
        actual: '',
        status: 'not_run',
        tags: ['boundary-values', 'age', 'validation']
      },
      tags: ['test-case', 'boundary-values', 'bva'],
      isEditable: true
    },
    {
      id: 'a_design_2',
      lessonId: 'l_design_3',
      type: 'checklist',
      title: 'Таблица решений: система скидок',
      data: {
        title: 'Таблица решений для системы расчёта скидок',
        items: [
          { text: 'Условия: Сумма > 5000 = Да, Премиум = Да → Скидка 15%', isChecked: false },
          { text: 'Условия: Сумма > 5000 = Да, Премиум = Нет → Скидка 10%', isChecked: false },
          { text: 'Условия: Сумма 1001–5000 = Да, Премиум = Да → Скидка 5%', isChecked: false },
          { text: 'Условия: Сумма 1001–5000 = Да, Премиум = Нет → Скидка 0%', isChecked: false },
          { text: 'Условия: Сумма ≤ 1000 = Да, Премиум = Да → Скидка 0%', isChecked: false },
          { text: 'Условия: Сумма ≤ 1000 = Да, Премиум = Нет → Скидка 0%', isChecked: false }
        ]
      },
      tags: ['decision-table', 'discount', 'test-design'],
      isEditable: true
    },

    // --- Module 4 artifacts ---
    {
      id: 'a_tools_1',
      lessonId: 'l_tools_1',
      type: 'test_plan',
      title: 'Коллекция Postman: тестирование API авторизации',
      data: {
        title: 'Postman Collection: Auth API',
        description: 'Упрощённое представление коллекции Postman для тестирования API авторизации',
        environment: {
          baseUrl: 'https://api.example.com',
          token: '{{auth_token}}'
        },
        requests: [
          {
            name: 'POST /auth/register',
            method: 'POST',
            url: '{{baseUrl}}/auth/register',
            body: {
              name: 'Test User',
              email: 'test@example.com',
              password: 'ValidPass123!'
            },
            tests: [
              'pm.test("Status 201", () => pm.response.to.have.status(201))',
              'pm.test("Has token", () => { var j = pm.response.json(); pm.expect(j).to.have.property("token") })'
            ]
          },
          {
            name: 'POST /auth/login',
            method: 'POST',
            url: '{{baseUrl}}/auth/login',
            body: {
              email: 'test@example.com',
              password: 'ValidPass123!'
            },
            tests: [
              'pm.test("Status 200", () => pm.response.to.have.status(200))',
              'pm.test("Token is string", () => { var j = pm.response.json(); pm.expect(j.token).to.be.a("string") })',
              'pm.environment.set("auth_token", pm.response.json().token)'
            ]
          },
          {
            name: 'GET /auth/me',
            method: 'GET',
            url: '{{baseUrl}}/auth/me',
            headers: { 'Authorization': 'Bearer {{auth_token}}' },
            tests: [
              'pm.test("Status 200", () => pm.response.to.have.status(200))',
              'pm.test("Has user email", () => { var j = pm.response.json(); pm.expect(j.email).to.eql("test@example.com") })'
            ]
          },
          {
            name: 'GET /auth/me без токена',
            method: 'GET',
            url: '{{baseUrl}}/auth/me',
            tests: [
              'pm.test("Status 401", () => pm.response.to.have.status(401))'
            ]
          }
        ]
      },
      tags: ['postman', 'api', 'auth'],
      isEditable: true
    },
    {
      id: 'a_tools_2',
      lessonId: 'l_tools_2',
      type: 'bug_report',
      title: 'Баг-репорт: сетевой запрос возвращает 404 для валидного эндпоинта',
      data: {
        summary: 'При нажатии на кнопку «Обновить профиль» запрос /api/profile/update возвращает 404, хотя эндпоинт существует',
        steps: [
          'Открыть страницу профиля /profile',
          'Изменить имя в поле «Имя»',
          'Открыть DevTools → Network',
          'Нажать кнопку «Обновить профиль»',
          'Наблюдать ответ в Network'
        ],
        expected: 'Запрос POST /api/profile/update возвращает 200, профиль обновляется',
        actual: 'Запрос возвращает 404 Not Found, хотя при прямом вызове через Postman эндпоинт работает',
        severity: 'high',
        priority: 'high',
        status: 'open',
        attachments: [
          { name: 'devtools_network.png', description: 'Скриншот Network-панели: запрос подсвечен красным, статус 404', type: 'image' }
        ]
      },
      tags: ['bug-report', 'api', 'devtools'],
      isEditable: true
    },

    // --- Module 5 artifacts ---
    {
      id: 'a_proj_1',
      lessonId: 'l_proj_1',
      type: 'test_plan',
      title: 'Финальный отчёт о тестировании интернет-магазина',
      data: {
        scope: 'Функциональное, UI/UX, кросс-браузерное и адаптивное тестирование фронтенда интернет-магазина: каталог, корзина, оформление заказа, личный кабинет.',
        strategy: 'Ручное функциональное тестирование по 45 тест-кейсам, исследовательское тестирование, кросс-браузерное (Chrome 120, Firefox 121, Safari 17), тестирование на 3 resolutions (320px, 768px, 1280px).',
        schedule: [
          { phase: 'Подготовка', days: 2 },
          { phase: 'Тестирование', days: 5 },
          { phase: 'Регрессия', days: 2 }
        ],
        risks: [
          { risk: 'Динамические данные (цены, акции) могут измениться', probability: 'high', impact: 'low', mitigation: 'Фиксация тестовых данных перед запуском' }
        ],
        approvals: [
          { role: 'QA Lead', name: 'Анна Петрова', date: '2026-09-10' }
        ],
        summary: {
          totalTests: 45,
          passed: 38,
          failed: 5,
          blocked: 2,
          passRate: '84.4%',
          defectsFound: 12,
          criticalDefects: 2,
          highDefects: 4,
          mediumDefects: 4,
          lowDefects: 2,
          recommendation: 'Продукт готов к релизу с условием исправления 2 критических дефектов. Рекомендуется дополнительный раунд регрессии после фиксов.'
        }
      },
      tags: ['report', 'final', 'e-commerce'],
      isEditable: true
    },
    {
      id: 'a_proj_2',
      lessonId: 'l_proj_1',
      type: 'bug_report',
      title: 'Список найденных дефектов (итоговый проект)',
      data: {
        summary: 'Сводный список из 12 дефектов, найденных при тестировании интернет-магазина',
        defects: [
          { id: 'BUG-001', title: 'Кнопка «Добавить в корзину» не работает на карточке товара в каталоге (grid-view)', severity: 'critical', status: 'open' },
          { id: 'BUG-002', title: 'Оформление заказа: поле «Телефон» принимает буквы', severity: 'high', status: 'fixed' },
          { id: 'BUG-003', title: 'Итоговая сумма в корзине не пересчитывается при изменении количества', severity: 'critical', status: 'open' },
          { id: 'BUG-004', title: 'Страница личного кабинета не загружается при первом входе (нужен F5)', severity: 'high', status: 'verified' },
          { id: 'BUG-005', title: 'Фильтр по цене не работает при вводе вручную', severity: 'high', status: 'fixed' },
          { id: 'BUG-006', title: 'Хлебные крошки отображаются некорректно на странице категории', severity: 'medium', status: 'open' },
          { id: 'BUG-007', title: 'Модальное окно «Поделиться товаром» закрывается при клике внутри', severity: 'medium', status: 'fixed' },
          { id: 'BUG-008', title: 'Сортировка по цене работает только по возрастанию', severity: 'medium', status: 'open' },
          { id: 'BUG-009', title: 'Иконка корзины на 320px перекрывает логотип', severity: 'low', status: 'open' },
          { id: 'BUG-010', title: 'Текст «Нет в наличии» не выровнен по центру карточки', severity: 'low', status: 'fixed' },
          { id: 'BUG-011', title: 'Чекбокс «Запомнить меня» не сохраняет состояние при перезагрузке', severity: 'high', status: 'verified' },
          { id: 'BUG-012', title: 'Не работает переключатель валют (USD → EUR)', severity: 'medium', status: 'open' }
        ]
      },
      tags: ['bug-report', 'summary', 'defects'],
      isEditable: true
    }
  ];

  // ========================================================================
  // RAW DATA: GLOSSARY
  // ========================================================================

  const GLOSSARY = [
    {
      term: 'Баг (Bug)',
      definition: 'Дефект, ошибка или недочёт в программе, приводящий к некорректному поведению системы.',
      example: 'При нажатии на кнопку «Сохранить» приложение зависает и данные не сохраняются.',
      relatedTerms: ['Дефект', 'Ошибка', 'Инцидент'],
      tags: ['basics']
    },
    {
      term: 'Дефект (Defect)',
      definition: 'Несоответствие фактического результата ожидаемому, обнаруженное в ходе тестирования.',
      example: 'Форма регистрации принимает email без символа @ — это дефект валидации.',
      relatedTerms: ['Баг', 'Отклонение'],
      tags: ['basics']
    },
    {
      term: 'Тест-кейс (Test Case)',
      definition: 'Набор условий, шагов и ожидаемых результатов для проверки определённой функциональности.',
      example: 'TC-01: Ввести валидный email и пароль → нажать «Войти» → ожидается редирект на /dashboard.',
      relatedTerms: ['Тестовый сценарий', 'Test Script'],
      tags: ['documentation']
    },
    {
      term: 'Чек-лист (Checklist)',
      definition: 'Список проверок без детальных шагов, используемый для быстрого покрытия функциональности.',
      example: 'Чек-лист формы входа: валидация email, валидация пароля, кнопка «Войти», ссылка «Забыли пароль».',
      relatedTerms: ['Тест-кейс', 'Регрессия'],
      tags: ['documentation']
    },
    {
      term: 'Тест-план (Test Plan)',
      definition: 'Документ, описывающий объём, стратегию, ресурсы и расписание тестирования.',
      example: 'Тест-план модуля «Корзина»: 5 дней на выполнение, 45 тест-кейсов, 2 QA-инженера.',
      relatedTerms: ['Тестовая стратегия', 'IEEE 829'],
      tags: ['documentation', 'planning']
    },
    {
      term: 'Severity',
      definition: 'Степень влияния дефекта на работу системы (блокирующий, критичный, средний, низкий).',
      example: 'Приложение падает при загрузке главной страницы — Severity: Critical.',
      relatedTerms: ['Priority', 'Критичность'],
      tags: ['defects']
    },
    {
      term: 'Priority',
      definition: 'Приоритет исправления дефекта (высокий, средний, низкий), определяемый бизнес-значимостью.',
      example: 'Опечатка в тексте на главной странице — Severity: Low, но Priority: High, т.к. видят все.',
      relatedTerms: ['Severity', 'Приоритет'],
      tags: ['defects']
    },
    {
      term: 'Регрессионное тестирование',
      definition: 'Повторное выполнение ранее пройденных тестов для проверки, что изменения не нарушили существующую функциональность.',
      example: 'После фикса бага в корзине перезапустили все тесты на оформление заказа.',
      relatedTerms: ['Повторное тестирование', 'Regression'],
      tags: ['testing-types']
    },
    {
      term: 'Смок-тестирование (Smoke Test)',
      definition: 'Быстрая проверка ключевых функций после сборки, чтобы определить, годится ли сборка для дальнейшего тестирования.',
      example: 'После деплоя: логин работает, главная открывается, корзина добавляется — smoke passed.',
      relatedTerms: ['Build Verification Test', 'BVT'],
      tags: ['testing-types']
    },
    {
      term: 'Эквивалентное разбиение (Equivalence Partitioning)',
      definition: 'Техника тест-дизайна, при которой входные данные делятся на классы эквивалентности.',
      example: 'Поле принимает возраст 18–65: классы < 18, 18–65, > 65 — по одному тесту из каждого.',
      relatedTerms: ['Граничные значения', 'Классы эквивалентности'],
      tags: ['test-design']
    },
    {
      term: 'Анализ граничных значений (BVA)',
      definition: 'Техника тест-дизайна, фокусирующаяся на значениях у границ диапазонов.',
      example: 'Диапазон 1–100: проверяем 0, 1, 2, 99, 100, 101.',
      relatedTerms: ['Эквивалентное разбиение', 'Boundary Value Analysis'],
      tags: ['test-design']
    },
    {
      term: 'Таблица решений (Decision Table)',
      definition: 'Таблица, описывающая комбинации условий и соответствующие действия системы.',
      example: 'Условия: «Сумма > 5000» и «Премиум-клиент» → действие: «Скидка 15%».',
      relatedTerms: ['Cause-Effect', 'Тест-дизайн'],
      tags: ['test-design']
    },
    {
      term: 'Позитивный тест-кейс',
      definition: 'Тест, проверяющий корректную работу системы с валидными данными.',
      example: 'Ввод корректного email и пароля → успешный вход.',
      relatedTerms: ['Негативный тест-кейс', 'Валидные данные'],
      tags: ['testing-types']
    },
    {
      term: 'Негативный тест-кейс',
      definition: 'Тест, проверяющий реакцию системы на невалидные данные или некорректные действия.',
      example: 'Ввод email без @ → отображается сообщение об ошибке.',
      relatedTerms: ['Позитивный тест-кейс', 'Валидация'],
      tags: ['testing-types']
    },
    {
      term: 'Тестирование API',
      definition: 'Тестирование программного интерфейса (REST, SOAP) через отправку запросов и проверку ответов.',
      example: 'Отправка POST /users с валидным телом → ожидается 201 Created с ID пользователя.',
      relatedTerms: ['REST', 'Postman', 'Endpoint'],
      tags: ['api', 'tools']
    },
    {
      term: 'CI/CD',
      definition: 'Непрерывная интеграция и непрерывная доставка — автоматизация сборки, тестирования и развёртывания.',
      example: 'При пуше в ветку main автоматически запускаются автотесты, и при успехе — деплой на staging.',
      relatedTerms: ['DevOps', 'Автоматизация', 'Pipeline'],
      tags: ['automation', 'devops']
    },
    {
      term: 'Исследовательское тестирование (Exploratory Testing)',
      definition: 'Одновременное изучение системы, проектирование и выполнение тестов без заранее написанных сценариев.',
      example: 'Тестировщик исследует новый раздел сайта, фиксируя находки в чартер-сессии.',
      relatedTerms: ['Session-based testing', 'Чартер'],
      tags: ['test-design', 'exploratory']
    },
    {
      term: 'Кросс-браузерное тестирование',
      definition: 'Проверка работы веб-приложения в разных браузерах для обеспечения совместимости.',
      example: 'Тестирование формы заказа в Chrome 120, Firefox 121 и Safari 17.',
      relatedTerms: ['Совместимость', 'Браузеры'],
      tags: ['testing-types', 'compatibility']
    },
    {
      term: 'Матрица трассируемости (Traceability Matrix)',
      definition: 'Таблица, связывающая требования с тест-кейсами для оценки покрытия.',
      example: 'REQ-01 покрывается TC-01 и TC-07, REQ-02 — TC-02 и TC-07 и т.д.',
      relatedTerms: ['Покрытие', 'Requirements'],
      tags: ['documentation', 'traceability']
    },
    {
      term: 'SDLC (Software Development Life Cycle)',
      definition: 'Жизненный цикл разработки ПО: от сбора требований до вывода из эксплуатации.',
      example: 'Waterfall, Agile, DevOps — модели SDLC.',
      relatedTerms: ['STLC', 'Жизненный цикл'],
      tags: ['basics', 'process']
    },
    {
      term: 'STLC (Software Testing Life Cycle)',
      definition: 'Жизненный цикл тестирования: анализ требований, планирование, разработка тестов, выполнение, отчётность.',
      example: 'Этапы STLC: анализ → планирование → дизайн → настройка → выполнение → отчёт.',
      relatedTerms: ['SDLC', 'Тестирование'],
      tags: ['basics', 'process']
    },
    {
      term: 'Entry / Exit Criteria',
      definition: 'Условия начала и завершения этапа тестирования.',
      example: 'Entry: тест-кейсы готовы, окружение настроено. Exit: все тесты выполнены, нет критичных багов.',
      relatedTerms: ['STLC', 'Критерии'],
      tags: ['process', 'planning']
    },
    {
      term: 'Селениум (Selenium)',
      definition: 'Инструмент для автоматизации веб-браузеров, поддерживающий множество языков программирования.',
      example: 'Автотест на Java: открыть страницу, ввести логин, нажать «Войти», проверить URL.',
      relatedTerms: ['WebDriver', 'Автоматизация', 'Playwright'],
      tags: ['automation', 'tools']
    },
    {
      term: 'Playwright',
      definition: 'Современный инструмент для автоматизации браузеров от Microsoft с автожиданием и мультибраузерной поддержкой.',
      example: 'Тест на TypeScript: await page.goto("/login"), await page.fill("#email", "test@example.com").',
      relatedTerms: ['Selenium', 'Автоматизация', 'Puppeteer'],
      tags: ['automation', 'tools']
    },
    {
      term: 'Retest',
      definition: 'Повторная проверка дефекта после его исправления для подтверждения, что баг действительно устранён.',
      example: 'Разработчик исправил BUG-003 — тестировщик повторяет шаги и проверяет, что сумма пересчитывается.',
      relatedTerms: ['Регрессия', 'Верификация дефекта'],
      tags: ['testing-types', 'defects']
    },
    {
      term: 'Test Coverage',
      definition: 'Метрика, показывающая, какая часть функциональности или кода покрыта тестами.',
      example: 'Покрытие требований: 5 из 5 требований покрыты тест-кейсами — 100%.',
      relatedTerms: ['Матрица трассируемости', 'Code Coverage'],
      tags: ['metrics', 'coverage']
    },
    {
      term: 'Test Harness',
      definition: 'Набор программных средств (скрипты, тестовые данные, окружение) для запуска и выполнения автотестов.',
      example: 'Jest + Playwright + тестовая база данных = test harness для автотестов.',
      relatedTerms: ['Test Framework', 'Автоматизация'],
      tags: ['automation', 'tools']
    },
    {
      term: 'Инцидент (Incident)',
      definition: 'Событие, возникающее во время тестирования, требующее расследования (не обязательно баг).',
      example: 'Тест показал аномальное время ответа — это инцидент, требующий анализа производительности.',
      relatedTerms: ['Баг', 'Дефект', 'Аномалия'],
      tags: ['defects']
    },
    {
      term: 'Верификация (Verification)',
      definition: 'Проверка того, что продукт разрабатывается правильно — соответствует спецификации.',
      example: 'Проверка, что форма регистрации соответствует требованиям из ТЗ.',
      relatedTerms: ['Валидация', 'Тестирование'],
      tags: ['basics', 'process']
    },
    {
      term: 'Валидация (Validation)',
      definition: 'Проверка того, что разрабатывается правильный продукт — соответствует потребностям пользователя.',
      example: 'Проверка, что форма регистрации удобна для реальных пользователей.',
      relatedTerms: ['Верификация', 'Тестирование'],
      tags: ['basics', 'process']
    }
  ];

  // ========================================================================
  // RAW DATA: TEMPLATES
  // ========================================================================

  const TEMPLATES = [
    {
      key: 'template_bug_report',
      type: 'bug_report',
      name: 'Шаблон баг-репорта',
      description: 'Используйте при оформлении найденного дефекта. Заполните все обязательные поля.',
      structure: {
        summary: '{Краткое описание дефекта}',
        steps: [
          '{Шаг 1: открыть страницу/приложение}',
          '{Шаг 2: выполнить действие}',
          '{Шаг 3: наблюдать результат}'
        ],
        expected: '{Ожидаемый результат}',
        actual: '{Фактический результат}',
        severity: '{low|medium|high|critical}',
        priority: '{low|medium|high}',
        status: 'open',
        attachments: []
      }
    },
    {
      key: 'template_test_case',
      type: 'test_case',
      name: 'Шаблон тест-кейса',
      description: 'Используйте для описания одного сценария проверки. Один тест-кейс — одна проверка.',
      structure: {
        id: 'TC_{MODULE}_{NUMBER}',
        title: '{Название тест-кейса}',
        preconditions: '{Что должно быть выполнено до теста}',
        steps: [
          '{Шаг 1}',
          '{Шаг 2}',
          '{Шаг 3}'
        ],
        expected: '{Ожидаемый результат}',
        actual: '',
        status: 'not_run',
        tags: []
      }
    },
    {
      key: 'template_checklist',
      type: 'checklist',
      name: 'Шаблон чек-листа',
      description: 'Используйте для быстрого покрытия функциональности списком проверок.',
      structure: {
        title: '{Название чек-листа}',
        items: [
          { text: '{Проверка 1}', isChecked: false },
          { text: '{Проверка 2}', isChecked: false },
          { text: '{Проверка 3}', isChecked: false }
        ]
      }
    },
    {
      key: 'template_test_plan',
      type: 'test_plan',
      name: 'Шаблон тест-плана',
      description: 'Используйте для планирования тестирования модуля или проекта. Структура соответствует IEEE 829.',
      structure: {
        scope: '{Объём тестирования: что тестируется}',
        strategy: '{Стратегия: виды тестирования, подход}',
        schedule: [
          { phase: '{Фаза 1}', days: 0 },
          { phase: '{Фаза 2}', days: 0 }
        ],
        risks: [
          { risk: '{Риск 1}', probability: '{low|medium|high}', impact: '{low|medium|high}', mitigation: '{Меры по снижению}' }
        ],
        approvals: [
          { role: 'QA Lead', name: '', date: '' }
        ]
      }
    },
    {
      key: 'template_mind_map',
      type: 'mind_map',
      name: 'Шаблон матрицы трассируемости',
      description: 'Используйте для связи требований с тест-кейсами и оценки покрытия.',
      structure: {
        title: '{Название матрицы}',
        requirements: [
          { id: 'REQ-01', text: '{Требование 1}' }
        ],
        testCases: [
          { id: 'TC-01', title: '{Тест-кейс 1}', covers: ['REQ-01'] }
        ],
        coverage: {
          totalRequirements: 0,
          coveredRequirements: 0,
          uncoveredRequirements: [],
          percentage: 0
        }
      }
    }
  ];

  // ========================================================================
  // ROADMAP GENERATION
  // ========================================================================

  // Build flat roadmap structure with coordinates and colors
  // Coordinates are generated deterministically in a grid layout

  function generateRoadmap() {
    var roadmap = [];
    var ySpacing = 120;
    var moduleColorCycle = 0;

    // Add modules
    MODULES.forEach(function (mod, index) {
      var colorIndex = mod.order % Utils.constants.TAG_COLORS;

      roadmap.push({
        id: mod.id,
        type: 'module',
        title: mod.title,
        status: mod.status === 'completed' ? 'done' : (mod.status === 'in_progress' ? 'active' : 'locked'),
        dependencies: mod.prerequisites.slice(),
        x: 100 + (index % 3) * 350,
        y: 60 + Math.floor(index / 3) * ySpacing * 2,
        colorIndex: colorIndex
      });

      // Add lessons under each module
      var lessons = LESSONS.filter(function (l) { return l.moduleId === mod.id; });
      lessons.forEach(function (lesson, lIndex) {
        var lessonColorIndex = (mod.order + lIndex) % Utils.constants.TAG_COLORS;

        roadmap.push({
          id: lesson.id,
          type: 'lesson',
          title: lesson.title,
          status: lesson.isCompleted ? 'done' : 'locked',
          dependencies: lIndex === 0 ? [mod.id] : [lessons[lIndex - 1].id],
          x: 100 + (index % 3) * 350 + (lIndex + 1) * 40,
          y: 60 + Math.floor(index / 3) * ySpacing * 2 + (lIndex + 1) * ySpacing,
          colorIndex: lessonColorIndex
        });
      });
    });

    return roadmap;
  }

  // ========================================================================
  // DATA VALIDATION
  // ========================================================================

  function validateData() {
    // Check module IDs are unique
    var moduleIds = MODULES.map(function (m) { return m.id; });
    var uniqueModuleIds = Utils.misc.unique(moduleIds);
    if (moduleIds.length !== uniqueModuleIds.length) {
      console.warn('[CourseData] Duplicate module IDs detected');
    }

    // Check prerequisites reference existing modules
    MODULES.forEach(function (mod) {
      mod.prerequisites.forEach(function (prereq) {
        if (moduleIds.indexOf(prereq) === -1) {
          console.warn('[CourseData] Module "' + mod.id + '" has unknown prerequisite: ' + prereq);
        }
      });
    });

    // Check lesson moduleIds reference existing modules
    LESSONS.forEach(function (lesson) {
      if (moduleIds.indexOf(lesson.moduleId) === -1) {
        console.warn('[CourseData] Lesson "' + lesson.id + '" references unknown module: ' + lesson.moduleId);
      }
    });

    // Check artifact lessonIds reference existing lessons
    var lessonIds = LESSONS.map(function (l) { return l.id; });
    ARTIFACTS.forEach(function (artifact) {
      if (lessonIds.indexOf(artifact.lessonId) === -1) {
        console.warn('[CourseData] Artifact "' + artifact.id + '" references unknown lesson: ' + artifact.lessonId);
      }
    });

    // Check glossary terms are non-empty
    GLOSSARY.forEach(function (entry) {
      if (!entry.term || !entry.definition) {
        console.warn('[CourseData] Glossary entry missing term or definition');
      }
    });
  }

  // ========================================================================
  // PUBLIC API: window.CourseData
  // ========================================================================

  // TODO: Replace with fetch when API is ready
  // For now, all data is static and served from this file

  window.CourseData = {
    // Returns array of all modules (deep copy)
    getModules: function () {
      return Utils.misc.deepClone(MODULES);
    },

    // Returns array of lessons for a specific module (deep copy)
    getLessons: function (moduleId) {
      var filtered = LESSONS.filter(function (l) { return l.moduleId === moduleId; });
      return Utils.misc.deepClone(filtered);
    },

    // Returns array of artifacts for a specific lesson (deep copy)
    getArtifacts: function (lessonId) {
      var filtered = ARTIFACTS.filter(function (a) { return a.lessonId === lessonId; });
      return Utils.misc.deepClone(filtered);
    },

    // Returns all artifacts (deep copy) — useful for portfolio view
    getAllArtifacts: function () {
      return Utils.misc.deepClone(ARTIFACTS);
    },

    // Returns all lessons (deep copy)
    getAllLessons: function () {
      return Utils.misc.deepClone(LESSONS);
    },

    // Returns glossary terms (deep copy)
    getGlossary: function () {
      return Utils.misc.deepClone(GLOSSARY);
    },

    // Returns flat roadmap structure with coordinates and colors (deep copy)
    getRoadmap: function () {
      var roadmap = generateRoadmap();
      return Utils.misc.deepClone(roadmap);
    },

    // Returns document templates (deep copy)
    getTemplates: function () {
      return Utils.misc.deepClone(TEMPLATES);
    },

    // Returns a specific template by key (deep copy)
    getTemplate: function (key) {
      var template = TEMPLATES.find(function (t) { return t.key === key; });
      return template ? Utils.misc.deepClone(template) : null;
    },

    // Returns a specific module by ID (deep copy)
    getModule: function (moduleId) {
      var mod = MODULES.find(function (m) { return m.id === moduleId; });
      return mod ? Utils.misc.deepClone(mod) : null;
    },

    // Returns a specific lesson by ID (deep copy)
    getLesson: function (lessonId) {
      var lesson = LESSONS.find(function (l) { return l.id === lessonId; });
      return lesson ? Utils.misc.deepClone(lesson) : null;
    },

    // Returns a specific artifact by ID (deep copy)
    getArtifact: function (artifactId) {
      var artifact = ARTIFACTS.find(function (a) { return a.id === artifactId; });
      return artifact ? Utils.misc.deepClone(artifact) : null;
    },

    // Returns glossary terms filtered by letter (deep copy)
    getGlossaryByLetter: function (letter) {
      var filtered = GLOSSARY.filter(function (g) {
        return g.term.charAt(0).toUpperCase() === letter.toUpperCase();
      });
      return Utils.misc.deepClone(filtered);
    },

    // Returns all unique first letters from glossary (for alphabetical index)
    getGlossaryLetters: function () {
      var letters = GLOSSARY.map(function (g) { return g.term.charAt(0).toUpperCase(); });
      return Utils.misc.unique(letters).sort();
    },

    // Returns all unique tags across modules and lessons (for tag cloud)
    getAllTags: function () {
      var tags = new Set();
      MODULES.forEach(function (m) { m.tags.forEach(function (t) { tags.add(t); }); });
      LESSONS.forEach(function (l) { l.tags.forEach(function (t) { tags.add(t); }); });
      ARTIFACTS.forEach(function (a) { a.tags.forEach(function (t) { tags.add(t); }); });
      return Array.from(tags).sort();
    },

    // Returns total count of lessons
    getLessonsCount: function () {
      return LESSONS.length;
    },

    // Returns total count of artifacts
    getArtifactsCount: function () {
      return ARTIFACTS.length;
    },

    // Returns total count of glossary terms
    getGlossaryCount: function () {
      return GLOSSARY.length;
    },

    // Returns total estimated duration in minutes (all lessons)
    getTotalDuration: function () {
      return LESSONS.reduce(function (sum, l) { return sum + l.durationMinutes; }, 0);
    },

    // Search across all data (modules, lessons, artifacts, glossary)
    search: function (query) {
      if (!query || query.trim().length < 2) return [];
      var q = query.toLowerCase().trim();
      var results = [];

      // Search modules
      MODULES.forEach(function (m) {
        if (m.title.toLowerCase().indexOf(q) !== -1 || m.description.toLowerCase().indexOf(q) !== -1) {
          results.push({ type: 'module', id: m.id, title: m.title, route: m.id });
        }
      });

      // Search lessons
      LESSONS.forEach(function (l) {
        if (l.title.toLowerCase().indexOf(q) !== -1) {
          results.push({ type: 'lesson', id: l.id, title: l.title, moduleId: l.moduleId, route: l.moduleId });
        }
      });

      // Search artifacts
      ARTIFACTS.forEach(function (a) {
        if (a.title.toLowerCase().indexOf(q) !== -1) {
          results.push({ type: 'artifact', id: a.id, title: a.title, lessonId: a.lessonId });
        }
      });

      // Search glossary
      GLOSSARY.forEach(function (g) {
        if (g.term.toLowerCase().indexOf(q) !== -1 || g.definition.toLowerCase().indexOf(q) !== -1) {
          results.push({ type: 'glossary', id: null, title: g.term, definition: g.definition });
        }
      });

      return results;
    }
  };

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  // Run validation on load (non-blocking, warnings only)
  validateData();

  // Log initialization
  console.log('%c[CourseData] Loaded: ' + MODULES.length + ' modules, ' +
    LESSONS.length + ' lessons, ' + ARTIFACTS.length + ' artifacts, ' +
    GLOSSARY.length + ' glossary terms, ' + TEMPLATES.length + ' templates',
    'color: #0ea5b8;');

})();
