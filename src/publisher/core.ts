import { GithubReview } from 'src/github'
import { Sonar } from 'src/sonar'
import { ReviewPublisher } from './review'

export function create(sonar: Sonar, github: GithubReview) {
  return new ReviewPublisher(sonar, github)
}
