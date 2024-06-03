import { GitReviewParam, GithubMerge, Review, ReviewComment } from 'src/github'
import { Sonar } from 'src/sonar'
import * as entity from 'src/sonar/entity'

const REVIEW_BODY_PATTERN = /^# SonarQube Code Analytics/g
const COMMENT_KEY_PATTERN =
  /project\/issues\?id=.+&pullRequest=\d+&open=(.+)\)/g
export class Publisher {
  sonar: Sonar
  github: GithubMerge
  constructor(sonar: Sonar, github: GithubMerge) {
    this.github = github
    this.sonar = sonar
  }

  async generateReport(): Promise<boolean> {
    const quality = await this.sonar.getQualityStatus()
    if (!quality) {
      return false
    }

    const issues = await this.sonar.allIssues()
    if (!issues) {
      return false
    }

    await this.publishIssues(quality, issues.issues)

    return true
  }

  async publishIssues(quality: entity.Qualitygate, issues: entity.Issue[]) {
    const existsReview = await this.getExistsReview()

    const comments: GitReviewParam[] = []
    const stat = {
      bug: 0,
      vul: 0,
      smell: 0
    }
    for (const i in issues) {
      const issue = issues[i]
      if (issue.type == 'BUG') {
        stat.bug++
      } else if (issue.type == 'VULNERABILITY') {
        stat.vul++
      } else {
        stat.smell++
      }
      comments.push({
        key: issue.key,
        comment: this.sonar.qualityGate.issueNote(issue),
        path: issue.component.replace(issue.project + ':', ''),
        line: issue.line || issue.textRange.startLine
      })
    }
    const comment = this.sonar.qualityGate.report(
      quality.projectStatus,
      stat.bug,
      stat.vul,
      stat.smell
    )

    if (existsReview === undefined) {
      await this.createNewReview(comment, comments)
    } else {
      await this.updateReview(existsReview, comment, comments)
    }
  }

  private async createNewReview(comment: string, comments: GitReviewParam[]) {
    await this.github.createReviewComments(comment, comments)
  }

  private async updateReview(
    review: Review,
    title: string,
    comments: GitReviewParam[]
  ) {
    const reviewComments = await this.github.getReviewComments()

    const needDelete: number[] = []
    const needUpdate: { comment_id: number; comment: GitReviewParam }[] = []
    const needCreate: GitReviewParam[] = []

    const commentsHash = new Map(comments.map(c => [c.key, c]))
    const reviewCommentsHash = new Map()

    for (const i in reviewComments) {
      const reviewComment = reviewComments[i]
      const key = this.getCommentKey(reviewComment)
      if (key === undefined) {
        continue
      }

      reviewCommentsHash.set(key, reviewComment)

      const comment = commentsHash.get(key)
      if (comment === undefined) {
        needDelete.push(reviewComment.id)
      } else if (comment.comment != reviewComment.body) {
        needUpdate.push({
          comment_id: reviewComment.id,
          comment: comment
        })
      }
    }

    for (const i in comments) {
      const comment = comments[i]
      const reviewComment = reviewCommentsHash.get(comment.key)
      if (reviewComment === undefined) {
        needCreate.push(comment)
      }
    }

    if (needCreate && needCreate.length) {
      this.createNewReview(title, needCreate)
    }

    for (const i in needUpdate) {
      const record = needUpdate[i]
      await this.github.updateReviewComment(record.comment_id, record.comment)
    }

    for (const i in needDelete) {
      const comment_id = needDelete[i]
      await this.github.deleteReviewComment(comment_id)
    }
  }

  private async getExistsReview(): Promise<Review | undefined> {
    const reviews = await this.github.getReviews()
    let latest = undefined
    for (const i in reviews) {
      const review = reviews[i]
      if (review.body && REVIEW_BODY_PATTERN.test(review.body)) {
        latest = review
      }
    }
    return latest
  }

  private getCommentKey(comment: ReviewComment): string | undefined {
    const match = COMMENT_KEY_PATTERN.exec(comment.body)
    if (match) {
      return match[1]
    }
  }
}
