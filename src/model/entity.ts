import { GitReviewParam } from 'src/github'
import * as entity from 'src/sonar/entity'

export interface Repo {
  owner: string
  repo: string
}

export interface Publisher {
  generateReport(): Promise<boolean>
  publishIssues(summary: string, comments: GitReviewParam[]): Promise<boolean>
}
