import { config } from 'dotenv'

import { generateReport } from '../src/main'

describe('main.ts', () => {
  config()
  const token = process.env.GITHUB_TOKEN ?? ''

  it('generateReport', async () => {
    const args = {
      sonarURL: 'https://sonar.openbsl.ru',
      sonarProjectKey: 'yaxunit',
      sonarBranchPlugin: true,
      mergeID: 367,
      githubToken: token,
      repo: {
        owner: 'alkoleft',
        repo: 'yaxunit'
      }
    }
    generateReport(args)
  })
})
