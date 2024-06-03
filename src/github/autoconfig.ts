import * as github from '@actions/github'
import {
  PullRequestEvent,
  PushEvent
} from '@octokit/webhooks-definitions/schema'

export default function githubAutoConfig(): Config {
  const config = {} as Config
  config.repo = github.context.repo

  if (
    github.context.eventName === 'pull_request' ||
    github.context.eventName === 'pull_request_target'
  ) {
    const prContext = github.context.payload as PullRequestEvent
    config.pr = {
      number: prContext.number,
      base: prContext.pull_request.base.ref,
      head: prContext.pull_request.head.ref
    }
  }

  if (github.context.eventName === 'push') {
    const PushEvent = github.context.payload as PushEvent
    config.push = {
      ref: PushEvent.ref
    }
  }
  return config
}

interface Config {
  token?: string
  repo: {
    owner: string
    repo: string
  }
  pr?: {
    number: number
    base: string
    head: string
  }
  push?: {
    ref: string
  }
}
