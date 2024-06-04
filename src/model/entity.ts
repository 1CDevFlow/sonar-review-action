import * as entity from 'src/sonar/entity'

export interface Repo {
  owner: string
  repo: string
}

export interface Publisher {
  generateReport(): Promise<boolean>
  publishIssues(
    quality: entity.Qualitygate,
    issues: entity.Issue[]
  ): Promise<boolean>
}
