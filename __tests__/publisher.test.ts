import { config } from 'dotenv'

import { ReviewPublisher } from '../src/publisher/review'
import { Sonar } from '../src/sonar'
import { GithubReview } from '../src/github'

describe('main.ts', () => {
  config()
  const token = process.env.GITHUB_TOKEN ?? ''
  const repo = {
    owner: process.env.GITHUB_OWNER ?? '',
    repo: process.env.GITHUB_REPO ?? ''
  }

  it('generateReport', async () => {
    const sonar = new Sonar({
      host: 'https://sonar.openbsl.ru',
      projectKey: 'yaxunit',
      branchPluginEnabled: true,
      pull_number: 370
    })
    const github = new GithubReview({
      repo: repo,
      pull_number: 9,
      token: token
    })
    const publisher = new ReviewPublisher(sonar, github)
    await publisher.generateReport()
  })
  // it('publishIssues', async () => {
  //   const sonar = new Sonar({
  //     host: 'https://sonar.openbsl.ru',
  //     projectKey: 'yaxunit',
  //     branchPluginEnabled: true,
  //     pull_number: 370
  //   })
  //   const github = new GithubReview({
  //     repo: repo,
  //     pull_number: 370,
  //     token: token
  //   })
  //   const publisher = new ReviewPublisher(sonar, github)
  //   const status = {
  //     projectStatus: {
  //       status: 'UNKNOWN',
  //       ignoredConditions: false,
  //       conditions: []
  //     }
  //   }
  //   publisher.publishIssues(status, [
  //     newIssue(
  //       '1',
  //       'exts/yaxunit/src/CommonModules/МокитоОбучение/Module.bsl',
  //       3
  //     ),
  //     newIssue(
  //       '2',
  //       'exts/yaxunit/src/CommonModules/МокитоОбучение/Module.bsl',
  //       140
  //     )
  //   ])
  // })
})

function newIssue(key: string, path: string, line: number) {
  return {
    key: key,
    project: 'yaxunit',
    component: 'yaxunit:' + path,
    rule: 'bsl-language-server:Typo',
    status: 'OPEN',
    message: 'Возможная опечатка в "Обнуружена"',
    severity: 'INFO',
    line: line,
    textRange: {
      startLine: line,
      endLine: line,
      startOffset: 1,
      endOffset: 1
    },
    effort: '1min',
    tags: [],
    type: 'CODE_SMELL'
  }
}
