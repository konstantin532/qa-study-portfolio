Превью `assets/preview.png` сделай 1280x720: открой Главную в темной теме, сделай скрин без DevTools. Это обложка репозитория, GitHub показывает ее в соцсетях.

Бейджи добавь в самый верх если хочешь продвинутый вид:
`![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white) ![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)`

### 3. GitHub Pages - живой демо

Самый важный пункт для работодателя. Без демо репозиторий мертвый.

1. `Settings -> Pages -> Build and deployment -> Source: GitHub Actions`
2. Создай `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Pages
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - uses: actions/deploy-pages@v4
