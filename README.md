# Публикация замечаний SonarQube в реквест

[![GitHub Super-Linter](https://github.com/1CDevFlow/sonar-review-action/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/1CDevFlow/sonar-review-action/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/1CDevFlow/sonar-review-action/actions/workflows/check-dist.yml/badge.svg)](https://github.com/1CDevFlow/sonar-review-action/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/1CDevFlow/sonar-review-action/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/1CDevFlow/sonar-review-action/actions/workflows/codeql-analysis.yml)
[![Coverage](./badges/coverage.svg)](./badges/coverage.svg)

Это шаг для [GitHub Actions](https://github.com/features/actions). Предназначен для публикации замечаний полученных от Sonar в pull request.

### Успещная проверка
![image](https://github.com/user-attachments/assets/ea9c6116-3def-4c6e-9417-188375174656)

### Ошибки
![image](https://github.com/user-attachments/assets/286c919e-e452-4474-95a4-b1c141f1ef46)

## Использование

Для использования, вам, необходимо добавить следующий шаг в ваш `workflow` после проверки сонаром

```yml
    - name: Публикация результата проверки PR
      uses: 1CDevFlow/sonar-review-action@main
      with:
        sonar_branch_plugin: true
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Полный список параметров шага

```yml
    - name: Публикация результата проверки PR
      uses: 1CDevFlow/sonar-review-action@main
      with:
        sonar_url: "<string: Sonar server URL>"
        sonar_token: "<string: Sonar access token>"
        sonar_project: "<string: Sonar project name>"
        sonar_branch_plugin: "<boolean:Enable SonarQube Community-Branch-Plugin support.>"
        pull_number: "<number, Pull request number>"
        github_token: "<string: Github access token>"
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

### Автоконфигуриррование

Шаг умеет в автоконфигурирование - полчение параметров запуска из окружения. Он ищет и читает настройки из:

* Входных параметров шага
* Переменных окружения
* [Контекста](https://docs.github.com/ru/actions/writing-workflows/choosing-what-your-workflow-does/accessing-contextual-information-about-workflow-runs) Github Action
* Файл настроек `sonar-project.properties`

Полный workflow можно увидеть в [примере](https://github.com/1CDevFlow/workflows/blob/main/.github/workflows/sonar-analysis-with-openbsl.yml).
