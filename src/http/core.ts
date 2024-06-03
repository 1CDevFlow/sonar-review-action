import * as core from '@actions/core'

export class Request {
  endpoint: string
  headers?: any

  constructor(opt: { endpoint: string; headers?: any }) {
    this.endpoint = opt.endpoint
    this.headers = opt.headers
  }

  async get<T = unknown, R = Response<T>>(
    route: string,
    parameters?: any
  ): Promise<R> {
    return await this.request(route, parameters, {
      method: 'GET',
      headers: this.headers
    })
  }

  private async request<T = unknown, R = Response<T>>(
    route: string,
    queryParameters?: any,
    params?: RequestInit
  ): Promise<R> {
    const requestInit = { ...params }
    const url = this.generateURL(route, queryParameters)
    core.debug('GET ' + url)
    const response = await fetch(url, requestInit)

    return {
      status: response.status,
      statusText: response.statusText,
      data: await response.json()
    } as R
  }

  private generateQuerystring(parameters: any): string {
    return Object.keys(parameters)
      .map(function (key) {
        return (
          encodeURIComponent(key) + '=' + encodeURIComponent(parameters[key])
        )
      })
      .join('&')
  }

  private generateURL(api: string, parameters?: any): string {
    const qs = this.generateQuerystring(parameters)
    if (qs != '') {
      return this.endpoint.concat(api, '?', qs)
    }
    return this.endpoint.concat(api)
  }
}

export interface Response<T = unknown> {
  status: number
  statusText: string
  data: T
}
