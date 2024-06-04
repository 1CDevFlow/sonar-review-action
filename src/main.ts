import * as core from '@actions/core'
import { Sonar } from './sonar'
import { SonarProperties } from './sonar/properties'
import { GithubReview } from './github'
import githubAutoConfig from './github/autoconfig'
import { Repo } from './model/entity'
import * as PublisherFactory from './publisher'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const githubConfig = githubAutoConfig()
    const sonarConfig = new SonarProperties({ projectDir: process.cwd() })

    core.debug(`generate report`)

    generateReport({
      sonarToken: core.getInput('sonar_token') || process.env.SONAR_TOKEN,
      sonarURL: core.getInput('sonar_url') || sonarConfig.getSonarURL(),
      sonarProjectKey:
        core.getInput('sonar_project') || sonarConfig.getProjectKey(),
      sonarBranchPlugin: core.getBooleanInput('sonar_branch_plugin'),
      repo: githubConfig.repo,
      mergeID:
        parseInt(core.getInput('pull_number')) || githubConfig.pr?.number,
      githubToken:
        core.getInput('github_token') || process.env.GITHUB_TOKEN || ''
    })
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

export async function generateReport(args: {
  sonarToken?: string
  sonarURL: string
  sonarProjectKey: string
  sonarBranchPlugin: boolean
  mergeID?: number
  githubToken: string
  repo: Repo
}) {
  if (!args.mergeID) {
    throw 'You need to specify pull_number'
  }

  const github = new GithubReview({
    token: args.githubToken,
    pull_number: args.mergeID,
    repo: args.repo
  })

  const sonar = new Sonar({
    tokenKey: args.sonarToken,
    host: args.sonarURL,
    projectKey: args.sonarProjectKey,
    branchPluginEnabled: args.sonarBranchPlugin,
    pull_number: args.mergeID
  })

  const publisher = PublisherFactory.create(sonar, github)
  await publisher.generateReport()
}
