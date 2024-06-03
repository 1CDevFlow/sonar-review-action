import { debug } from 'console'
import { config } from 'dotenv'

import { Sonar } from '../src/sonar'

describe('sonar', () => {
  config()
  const token = process.env.GITHUB_TOKEN ?? ''
  const sonar = new Sonar({
    host: 'https://sonar.openbsl.ru',
    projectKey: 'yaxunit',
    tokenKey: '',
    branchPluginEnabled: true,
    pull_number: 367
  })

  it('getQualityStatus', async () => {
    debug(await sonar.getQualityStatus())
  })

  it('allIssues', async () => {
    debug(await sonar.allIssues())
  })
})
