import { Issue, ProjectStatus } from './entity'
import { MetricKey, QualityStatus, SecurityLevel } from './enum'

const IMAGE_DIR_LINK = 'https://hsonar.s3.ap-southeast-1.amazonaws.com/images/'

export class SonarReport {
  host?: string
  projectKey?: string
  branchPluginEnabled?: boolean
  pull_number?: number

  constructor(opt: {
    host?: string
    projectKey?: string
    branchPluginEnabled?: boolean
    pull_number?: number
  }) {
    this.host = opt.host
    this.projectKey = opt.projectKey
    this.branchPluginEnabled = opt.branchPluginEnabled
    this.pull_number = opt.pull_number
  }

  report(
    projectStatus: ProjectStatus,
    bugCount: number,
    vulnerabilityCount: number,
    codeSmellCount: number
  ) {
    const [
      bugSecurity,
      vulSecurity,
      smellSecurity,
      duplicatedCode,
      coverageValue
    ] = this.getIssueSecurity(projectStatus)
    return this.templateReport({
      status: projectStatus.status,
      bugCount: bugCount,
      bugSecurity: bugSecurity as string,
      vulnerabilityCount: vulnerabilityCount,
      vulnerabilitySecurity: vulSecurity as string,
      codeSmellCount: codeSmellCount,
      codeSmellSecurity: smellSecurity as string,
      coverageValue: coverageValue as number,
      duplicatedValue: duplicatedCode as number
    })
  }

  issueNote(issue: Issue) {
    const rule = issue.rule
    const ruleLink = `${this.host}/coding_rules?open=${rule}&rule_key=${rule}`
    const issueLink = `${this.host}/project/issues?id=${issue.project}&pullRequest=${this.pull_number}&open=${issue.key}`
    const tags =
      issue.tags && issue.tags.length ? `\`${issue.tags.join('` `')}\`　　` : ''
    const assignee = issue.assignee
      ? ` :bust_in_silhouette: @${issue.assignee}　　`
      : ''
    let note = `#### [:link:](${issueLink})${issue.message}

${this.icon(issue.type)} ${this.capitalize(issue.type.replace('_', ''))}　　${this.icon(issue.severity)} **${this.capitalize(issue.severity)}**

${tags}${assignee}[<sub>Why is this an issue?</sub>](${ruleLink})`

    return note
  }

  private capitalize(text: string) {
    return text.charAt(0).toUpperCase() + text.toLowerCase().slice(1)
  }

  private icon(name: string) {
    if (!name) {
      return ''
    }
    const iconImage = IMAGE_DIR_LINK + name.toLowerCase() + '.png'
    return `![${name}](${iconImage})`
  }

  private securityLevel(value: string) {
    const val: number = parseInt(value)
    if (val >= 5) {
      return SecurityLevel.E
    }
    const level: { [key: number]: string } = {
      1: SecurityLevel.A,
      2: SecurityLevel.B,
      3: SecurityLevel.C,
      4: SecurityLevel.D,
      5: SecurityLevel.E
    }
    return level[val]
  }

  private appendPullRequestIdIfBranchPluginEnabled(url: string) {
    if (this.branchPluginEnabled) {
      return `${url}&pullRequest=${this.pull_number}`
    }

    return url
  }

  private getIssueURL(type: string) {
    return this.getIssuesURL(type)
  }

  private getIssuesURL(type: string | undefined = undefined) {
    let url =
      this.host +
      `/project/issues?id=${this.projectKey}&resolved=false&sinceLeakPeriod=true`
    if (type !== undefined) {
      url = `${url}&types=${type}`
    }
    return this.appendPullRequestIdIfBranchPluginEnabled(url)
  }

  private getMetricURL(metric: string) {
    const url =
      this.host +
      `/project/issues?id=${this.projectKey}&metric=${metric}&view=list`
    return this.appendPullRequestIdIfBranchPluginEnabled(url)
  }

  private getIssueSecurity(projectStatus: ProjectStatus) {
    let bugSecurity = '',
      vulSecurity = '',
      smellSecurity = '',
      hotspotSecurity = ''

    let duplicatedCode = -1,
      coverageValue = -1
    for (const i in projectStatus.conditions) {
      const condition = projectStatus.conditions[i]
      const level = this.securityLevel(condition.actualValue)
      if (condition.metricKey == MetricKey.newReliabilityRrating) {
        bugSecurity = level
      } else if (condition.metricKey == MetricKey.newMaintainabilityRating) {
        smellSecurity = level
      } else if (condition.metricKey == MetricKey.newSecurityRating) {
        vulSecurity = level
      } else if (condition.metricKey == MetricKey.newSecurityReviewRating) {
        hotspotSecurity = level
      } else if (condition.metricKey == MetricKey.newDuplicatedLinesDensity) {
        duplicatedCode = parseFloat(condition.actualValue)
      } else if (condition.metricKey == MetricKey.newCoverage) {
        coverageValue = parseFloat(condition.actualValue)
      }
    }
    return [
      bugSecurity,
      vulSecurity,
      smellSecurity,
      duplicatedCode,
      coverageValue,
      hotspotSecurity
    ]
  }

  private templateReport(param: {
    status: string
    bugCount: number
    bugSecurity: string
    vulnerabilityCount: number
    vulnerabilitySecurity: string
    codeSmellCount: number
    codeSmellSecurity: string
    coverageValue: number
    duplicatedValue: number
  }) {
    let coverageText = '**Coverage**'
    if (param.coverageValue >= 0) {
      coverageText =
        ' [' +
        param.coverageValue.toFixed(2) +
        '% Coverage](' +
        this.getMetricURL('new_coverage') +
        ')'
    }
    let duplicatedText = '**Duplication**'
    if (param.duplicatedValue >= 0) {
      const duplicatedURL = this.getMetricURL('new_duplicated_lines_density')
      duplicatedText =
        ' [' +
        param.duplicatedValue.toFixed(2) +
        '% Duplication](' +
        duplicatedURL +
        ')'
    }
    let status = ''
    if (param.status == QualityStatus.OK) {
      status = 'passed'
    } else {
      status = 'failed'
    }

    const report = `### SonarQube Quality Gate ${status}! [${this.icon(status)}](${this.getIssuesURL()})

${this.icon('bug')}  ${this.icon(param.bugSecurity)} [${param.bugCount} Bugs](${this.getIssueURL('BUG')})  
${this.icon('vulnerability')}  ${this.icon(param.vulnerabilitySecurity)} [${param.vulnerabilityCount} Vulnerabilities](${this.getIssueURL('VULNERABILITY')})  
${this.icon('code_smell')}  ${this.icon(param.codeSmellSecurity)} [${param.codeSmellCount} Code Smells](${this.getIssueURL('CODE_SMELL')})

${this.coverageIcon(param.coverageValue)} ${coverageText}  
${this.duplicatedIcon(param.duplicatedValue)} ${duplicatedText}`

    return report
  }

  private duplicatedIcon(duplicatedCode: number): string {
    if (duplicatedCode < 0) {
      return '*No data*'
    }
    if (duplicatedCode < 3) {
      return this.icon('duplication_lt_3')
    }
    if (duplicatedCode < 5) {
      return this.icon('duplication_3_5')
    }
    if (duplicatedCode < 10) {
      return this.icon('duplication_5_10')
    }
    if (duplicatedCode < 20) {
      return this.icon('duplication_10_20')
    }
    return this.icon('duplication_lt_20')
  }

  private coverageIcon(coverage: number): string {
    if (coverage < 0) {
      return '*No data*'
    }
    if (coverage < 50) {
      return this.icon('coverage_lt_50')
    }
    if (coverage < 80) {
      return this.icon('coverage_gt_50')
    }
    return this.icon('coverage_gt_80')
  }

  isSummaryComment(body: string) {
    return (
      /^#+\sSonarQube Quality Gate/g.test(body) ||
      /^#+\sSonarQube Code Analytics/g.test(body)
    )
  }

  getIssueCommentKey(body: string) {
    const startSymbol = '&open='
    const start = body.indexOf(startSymbol)
    const end = body.indexOf(')', start)
    if (start && end) {
      return body.substring(start + startSymbol.length, end)
    }
  }
}
