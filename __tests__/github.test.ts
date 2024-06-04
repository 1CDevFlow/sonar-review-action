import { debug } from 'console'
import { config } from 'dotenv'

import { GithubReview } from '../src/github'

describe('github', () => {
  config()
  const token = process.env.GITHUB_TOKEN ?? ''
  const repo = {
    owner: process.env.GITHUB_OWNER ?? '',
    repo: process.env.GITHUB_REPO ?? ''
  }
  // it('reviewComments', async () => {

  //     const octokit = github.getOctokit(token)
  //     const comments = await octokit.rest.pulls.listReviewComments({
  //         pull_number: 367,
  //         ...github.context.repo
  //     })
  //     debug(comments)
  // })

  it('getQualityDiscussion', async () => {
    const githubMR = new GithubReview({
      pull_number: 9,
      token: token,
      repo: repo
    })
    debug(await githubMR.getQualityDiscussion())
  })
  it('getReviews', async () => {
    const githubMR = new GithubReview({
      pull_number: 9,
      token: token,
      repo: repo
    })
    debug(await githubMR.getReviews())
  })

  it('getReviewComments', async () => {
    const githubMR = new GithubReview({
      pull_number: 9,
      token: token,
      repo: repo
    })
    debug(await githubMR.getReviewComments())
  })
})
