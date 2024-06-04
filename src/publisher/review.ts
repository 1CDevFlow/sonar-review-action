import { GitReviewParam, GithubReview, Review, ReviewComment } from 'src/github'
import { Publisher } from 'src/model/entity'
import { Sonar } from 'src/sonar'

export class ReviewPublisher implements Publisher {
  sonar: Sonar
  github: GithubReview
  constructor(sonar: Sonar, github: GithubReview) {
    this.github = github
    this.sonar = sonar
  }

  async generateReport(): Promise<boolean> {
    const reportData = await this.getReportData()

    if (reportData === undefined) {
      return false
    }

    return await this.publishIssues(reportData.summary, reportData.comments)
  }

  async publishIssues(
    summary: string,
    comments: GitReviewParam[]
  ): Promise<boolean> {
    const existsReview = await this.getExistsReview()

    if (existsReview === undefined) {
      await this.createNewReview(summary, comments)
    } else {
      await this.updateReview(existsReview, summary, comments)
    }
    return true
  }

  private async getReportData() {
    const quality = await this.sonar.getQualityStatus()
    if (!quality) {
      return undefined
    }

    const issues = await this.sonar.allIssues()
    if (!issues) {
      return undefined
    }
    const comments: GitReviewParam[] = []
    const stat = {
      bug: 0,
      vul: 0,
      smell: 0
    }
    for (const i in issues.issues) {
      const issue = issues.issues[i]
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
    const summary = this.sonar.qualityGate.report(
      quality.projectStatus,
      stat.bug,
      stat.vul,
      stat.smell
    )

    return {
      summary,
      comments
    }
  }

  private async createNewReview(summary: string, comments: GitReviewParam[]) {
    await this.github.createReviewComments(summary, comments)
  }

  private async updateReview(
    review: Review,
    summary: string,
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

    await this.github.updateReview(review.id, summary)

    if (needCreate && needCreate.length) {
      await this.github.createReviewComments('', needCreate)
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
      if (this.sonar.qualityGate.isSummaryComment(review.body)) {
        latest = review
      }
    }
    return latest
  }

  private getCommentKey(comment: ReviewComment): string | undefined {
    return this.sonar.qualityGate.getIssueCommentKey(comment.body)
  }
}
