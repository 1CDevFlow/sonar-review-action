import { Request } from '../http'
import * as core from '@actions/core'

import * as entity from './entity'
import { SonarReport } from './report'
import { SonarProperties } from './properties'

const SONAR_QUALITY_API = '/api/qualitygates/project_status'
const SONAR_ISSUE_API = '/api/issues/search'
const SONAR_TASK_API = '/api/ce/activity'
const PAGE_SIZE = 200

export class Sonar {
  public host: string
  http: Request
  public projectKey?: string
  public qualityGate: SonarReport
  config?: SonarProperties

  constructor(opt: {
    tokenKey?: string
    host: string
    projectKey: string
    branchPluginEnabled?: boolean
    pull_number?: number
  }) {
    try {
      this.config = new SonarProperties({ projectDir: process.cwd() })
      this.host = this.config.getSonarURL()
      this.projectKey = this.config.getProjectKey()
    } catch (e: any) {
      core.error(e.message)
      this.host = opt.host
      this.projectKey = opt.projectKey
    }
    this.qualityGate = new SonarReport({
      host: this.host,
      projectKey: this.projectKey,
      branchPluginEnabled: opt.branchPluginEnabled,
      pull_number: opt.pull_number
    })

    const headers = opt.tokenKey
      ? { Authorization: 'Bearer ' + opt.tokenKey }
      : {}

    this.http = new Request({ endpoint: this.host, headers: headers })
  }

  async getQualityStatus() {
    core.debug(`sonar get quality status: ${SONAR_QUALITY_API}`)
    const parameters: entity.SonarApiRequestParameters = {
      projectKey: this.projectKey
    }

    if (this.qualityGate.branchPluginEnabled) {
      parameters.pullRequest = this.qualityGate.pull_number
    }

    const response = await this.http.get<entity.Qualitygate>(
      SONAR_QUALITY_API,
      parameters
    )

    core.debug('Quality status: ' + JSON.stringify(response.data))
    return response.data
  }

  async getTaskStatus() {
    core.debug(`sonar get task status: ${SONAR_TASK_API}`)
    const response = await this.http.get<entity.Tasks>(SONAR_TASK_API, {
      component: this.projectKey,
      onlyCurrents: true
    })
    core.debug('Tasks: ' + JSON.stringify(response.data))
    return response.data
  }

  private async findIssuesByPage(fromTime: string, page: number) {
    const parameters: entity.SonarApiRequestParameters = {
      componentKeys: this.projectKey,
      // sinceLeakPeriod: true, // get issues of new code on sonar
      p: page,
      ps: PAGE_SIZE,
      inNewCodePeriod: true,
      resolved: false
    }

    if (this.qualityGate.branchPluginEnabled) {
      parameters.pullRequest = this.qualityGate.pull_number
    } else {
      parameters.createdAfter = fromTime
    }

    const response = await this.http.get<entity.IssueList>(
      SONAR_ISSUE_API,
      parameters
    )
    return response.data
  }

  async allIssues(): Promise<entity.IssueList> {
    core.debug('sonar get all issues')
    return await this.findIssues('')
  }

  async findIssues(fromTime: string): Promise<entity.IssueList> {
    // first page data
    const issues = await this.findIssuesByPage(fromTime, 1)
    const issueList = issues
    if (issues) {
      const totalPage = Math.ceil(issues.total / issues.ps)
      for (let p = issues.p + 1; p <= totalPage; p++) {
        const issuePage = await this.findIssuesByPage(fromTime, p)
        if (!issuePage) {
          break
        }
        issueList.issues.push(...issuePage.issues)
      }
    }
    core.debug('Issues: ' + JSON.stringify(issueList))
    return issueList
  }
}
