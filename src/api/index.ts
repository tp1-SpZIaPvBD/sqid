import { http } from '@/http'
import { ApiResult, SparqlResult } from './types'

export async function apiRequest(endpoint: string, query: any, suffix: string = ''): Promise<ApiResult> {
  const response = await http.get(endpoint + suffix, {
    params: {
      format: 'json',
      origin: '*',
      ...query,
    },
  })

  return response.data
}

export async function sparqlRequest(endpoint: string, query: string): Promise<SparqlResult> {
  const response = await http.get(endpoint, {
    params: {
      format: 'json',
      query,
    },
  })

  // const params = new URLSearchParams()
  // params.append('format', 'json')
  // params.append('query', query)
  // const response = await http.post(endpoint, params)

  return response.data
}
