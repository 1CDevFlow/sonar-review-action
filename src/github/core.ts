import * as github from '@actions/github'
import { GitHub } from '@actions/github/lib/utils'
import * as core from '@actions/core'

import { Endpoints } from '@octokit/types'
import { Repo } from 'src/model/entity'

export type IssueComment =
  Endpoints['GET /repos/{owner}/{repo}/issues/comments']['response']['data'][0]
export type Review =
  Endpoints['POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews']['response']['data']
export type ReviewComments =
  Endpoints['GET /repos/{owner}/{repo}/pulls/{pull_number}/comments']['response']['data']
export type ReviewComment = ReviewComments[0]

export class GithubMerge {
  pull_number: number
  octokit: InstanceType<typeof GitHub>
  repo: Repo

  constructor(opt: { token: string; pull_number: number; repo: Repo }) {
    this.octokit = github.getOctokit(opt.token)
    this.pull_number = opt.pull_number
    this.repo = opt.repo
  }

  async getQualityDiscussion(headers?: any): Promise<IssueComment | null> {
    core.debug('getQualityDiscussion')

    const pattern = /^# SonarQube Code Analytics/g
    const response = await this.octokit.rest.issues.listComments({
      ...this.repo,
      issue_number: this.pull_number
    })
    for (const i in response.data) {
      const data = response.data[i]
      if (data.body !== undefined && pattern.test(data.body)) {
        return data
      }
    }
    return null
  }

  async saveQualityDiscussion(comment: string): Promise<IssueComment> {
    core.debug(`saveQualityDiscussion: ${comment}`)

    const discussion = await this.getQualityDiscussion()
    const data = discussion
      ? await this.updateComment(discussion.id, comment)
      : await this.createComment(comment)

    return data
  }

  async createReviewComments(
    body: string,
    params: GitReviewParam[]
  ): Promise<Review | null> {
    core.debug(`createReviewComments ${JSON.stringify(params)}`)

    const comments: any = []
    for (const i in params) {
      const comment = {
        path: params[i].path,
        line: params[i].line,
        body: params[i].comment
      }
      comments.push(comment)
      core.debug(`      comment #${i} ${JSON.stringify(comment)}`)
    }
    if (comments.length == 0) {
      return null
    }

    const response = await this.octokit.rest.pulls.createReview({
      ...this.repo,
      pull_number: this.pull_number,
      body: body,
      event: 'COMMENT',
      comments: comments,
      commit_id: github.context.sha
    })
    return response.data
  }

  async updateReview(review_id: number, body: string) {
    await this.octokit.rest.pulls.updateReview({
      ...this.repo,
      review_id: review_id,
      pull_number: this.pull_number,
      body: body,
      commit_id: github.context.sha
    })
  }

  async createReviewComment(review: Review, comment: GitReviewParam) {
    const params = {
      ...this.repo,
      pull_number: this.pull_number,

      commit_id: review.commit_id || '',
      body: comment.comment,
      path: comment.path,
      line: comment.line
    }
    core.debug('createReviewComment: ' + JSON.stringify(params))
    const response = await this.octokit.rest.pulls.createReviewComment(params)
    core.debug('Response: ' + JSON.stringify(response.data))

    return response.data
  }

  async deleteReviewComment(comment_id: number) {
    const response = await this.octokit.rest.pulls.deleteReviewComment({
      ...this.repo,
      comment_id: comment_id
    })

    return response.data
  }

  async updateReviewComment(comment_id: number, comment: GitReviewParam) {
    const response = await this.octokit.rest.pulls.updateReviewComment({
      ...this.repo,
      comment_id: comment_id,
      pull_number: this.pull_number,
      body: comment.comment,
      path: comment.path,
      line: comment.line,
      commit_id: github.context.sha
    })

    return response.data
  }

  async getReviews(): Promise<Review[]> {
    const params = {
      ...this.repo,
      pull_number: this.pull_number
    }
    core.debug('getReviews ' + JSON.stringify(params))
    const response = await this.octokit.rest.pulls.listReviews(params)

    core.debug('Response: ' + JSON.stringify(response.data))
    return response.data
  }

  async getReviewComments(): Promise<ReviewComments> {
    const response = await this.octokit.rest.pulls.listReviewComments({
      ...this.repo,
      pull_number: this.pull_number
    })

    return response.data
  }

  async deleteComment(comment_id: number) {
    await this.octokit.rest.pulls.deleteReviewComment({
      ...this.repo,
      comment_id: comment_id
    })
  }

  private async createComment(comment: string): Promise<IssueComment> {
    core.debug(`createComment: ${comment}`)
    const { data } = await this.octokit.rest.issues.createComment({
      ...this.repo,
      body: comment,
      issue_number: this.pull_number
    })

    return data
  }

  private async updateComment(
    noteID: number,
    comment: string
  ): Promise<IssueComment> {
    core.debug(`updateComment: ${noteID}`)
    const { data } = await this.octokit.rest.issues.updateComment({
      ...this.repo,
      body: comment,
      issue_number: this.pull_number,
      comment_id: noteID
    })
    return data
  }
}

export interface GitReviewParam {
  key: string
  comment: string
  path: string
  line: number
  [key: string]: any
}

export function forceCast<T>(input: any): T {
  // ... do runtime checks here

  // @ts-ignore <-- forces TS compiler to compile this as-is
  return input
}
