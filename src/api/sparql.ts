import { sparqlRequest } from './index'
import { sparqlEndpoint, MAX_SIMULTANEOUS_SPARQL_REQUESTS } from './endpoints'
import { EntityId, Rank, SparqlValue, SparqlBinding, SqidStatement } from './types'
import { TaskQueue } from 'cwait'

export const MAX_RELATED_BATCH = 101

export const RANK_PREFIX = 'http://wikiba.se/ontology#'
export const ENTITY_PREFIX = 'http://www.wikidata.org/entity/'
export const STATEMENT_PREFIX = 'http://www.wikidata.org/entity/statement/'
export const RANK_PREFIX_LEN = RANK_PREFIX.length
export const ENTITY_PREFIX_LEN = ENTITY_PREFIX.length
export const STATEMENT_PREFIX_LEN = STATEMENT_PREFIX.length

function statementsFromBindings(bindings: SparqlBinding[]) {
  const valueOfRank: Rank = 'preferred'
  return bindings.map((binding) => {
    // replace first '-' by '$' to obtain claim GUID
    return {
      item: entityValue(binding.item),
      statement: statementValue(binding.statement).replace('-', '$'),
      property: entityValue(binding.property),
      //      rank: rankValue(binding.r),
      rank: valueOfRank,
    }
  })
}

function rankValue(binding: SparqlValue): Rank {
  const rank = binding.value.slice(RANK_PREFIX_LEN)

  switch (rank) {
    case 'NormalRank':
      return 'normal'
    case 'DeprecatedRank':
      return 'deprecated'
    case 'PreferredRank':
      return 'preferred'
  }

  throw new TypeError(`unknown rank value ${rank}`)
}

export function entityValue(binding: SparqlValue) {
  //  return binding.value.slice(ENTITY_PREFIX_LEN)
  if (binding) {
    return binding.value
  } else {
      return ''
  }
}

function statementValue(binding: SparqlValue) {
  if (binding) {
    return binding.value.slice(STATEMENT_PREFIX_LEN)
  } else {
    return ''
  }
}

export async function sparqlQuery(query: string): Promise<SparqlBinding[]> {
  // const response = await sparqlRequest(sparqlEndpoint,
  //                                    `#TOOLSQID, https://tools.wmflabs.org/sqid/
  // ${queryWithPrefix}`)
  const myResponse = await sparqlRequest(sparqlEndpoint, query)
  return myResponse.results.bindings
}

export async function sparqlQueries(queries: string[]): Promise<SparqlBinding[][]> {
  const queue = new TaskQueue(Promise, MAX_SIMULTANEOUS_SPARQL_REQUESTS)
  const query = queue.wrap(sparqlQuery)

  return Promise.all(queries.map(query))
}

export async function getRelatedStatements(entityId: EntityId): Promise<SqidStatement[]> {
  // TODO: when you want to work on this, replace 0 with MAX_RELATED_BATCH
  // for now our version of SQID do not support working with related statements
  const statements = await getRelatingStatements(entityId, 0)

  if (statements.length < MAX_RELATED_BATCH) {
    // got all related statements
    return statements
  } else {
    // there might be more, fetch each property individually
    const properties = await getRelatingProperties(entityId)
    const results = await sparqlQueries(properties.map((propertyId) => {
      return relatingStatementsForPropertyQuery(entityId, propertyId, MAX_RELATED_BATCH)
    }))

    return results.flatMap(statementsFromBindings)
  }
}

async function getRelatingStatements(entityId: EntityId, limit: number):
  Promise<SqidStatement[]> {
  //   const result = await sparqlQuery(`SELECT DISTINCT ?it ?s ?p ?r WHERE {
  //   ?p wikibase:statementProperty ?ps ;
  //   wikibase:claim ?pc .
  //   ?s ?ps wd:${entityId} ;
  //     wikibase:rank ?r .
  //   ?it ?pc ?s .
  //   FILTER( ?p != <http://www.wikidata.org/entity/P31> )
  // } LIMIT ${limit}`)
  const result = await sparqlQuery(`SELECT DISTINCT ?item ?statement ?entity ?r WHERE {
    <${entityId}> ?property ?item .
    ?property rdf:type owl:ObjectProperty .
    BIND(str(?item) as ?statement) .
    BIND(<${entityId}> as ?entity) .
    OPTIONAL {?item rdfs:label ?statement .} .
  } LIMIT ${limit}`)

  return statementsFromBindings(result)
}

function relatingStatementsForPropertyQuery(entityId: EntityId,
                                            propertyId: EntityId,
                                            limit: number): string {
  // return `SELECT DISTINCT ?it ?s ?p ?r WHERE {
  // BIND(wd:${propertyId} AS ?p) .
  // ?s ps:${propertyId} wd:${entityId} ;
  //   wikibase:rank ?r .
  // ?it p:${propertyId} ?s .
  // } LIMIT ${limit}
  return `SELECT DISTINCT ?item ?statement ?property WHERE {
  BIND(<${propertyId}> AS ?property) .
  ?statement <${propertyId}> <${entityId}> ;
  ?item <${propertyId}> ?statement .
  } LIMIT ${limit}`
}

async function getRelatingProperties(entityId: EntityId): Promise<EntityId[]> {
  //  const result = await sparqlQuery(`SELECT DISTINCT ?p {
  //  ?s ?ps wd:${entityId} .
  //  ?p wikibase:statementProperty ?ps .
  //  FILTER( ?p != <http://www.wikidata.org/entity/P31> )
  //  }`)
  const result = await sparqlQuery(`SELECT DISTINCT ?property {
  <${entityId}> ?property ?item .
  }`)

  return result.map((binding) => {
    return entityValue(binding.p)
  })
}

function propertySubjectsQuery(propertyId: EntityId,
                               lang: string,
                               object?: EntityId,
                               limit?: number,
                               resultVariable = 'p'): string {
  const obj = (object
    ? `<${object}>`
    : '[]')
  const limitClause = limit ? ` LIMIT ${limit} ` : ''
  const tmpReferenceLangToRemoveError = lang

  //  return `SELECT ?${resultVariable} ?${resultVariable}Label WHERE {{
  //  SELECT DISTINCT ?${resultVariable} WHERE {
  //    ?${resultVariable} wdt:${propertyId} ${obj} .
  //  }${limitClause}}
  //  SERVICE wikibase:label { bd:serviceParam wikibase:language "${lang}" }
  //  }`
  return `SELECT ?${resultVariable} ?${resultVariable}Label WHERE {
    ?${resultVariable} <${propertyId}> ${obj} .
    ?${resultVariable} rdfs:label ?${resultVariable}Label .
  }
  ${limitClause}`
}

export async function getPropertySubjects(propertyId: EntityId, lang: string, limit: number, entityId?: EntityId) {
  const result = await sparqlQuery(propertySubjectsQuery(propertyId, lang, entityId, limit))

  return result.map((binding) => {
    return {
      entityId: entityValue(binding.p),
      label: binding.pLabel.value,
    }
  })
}

function propertyObjectsQuery(propertyId: EntityId,
                              lang: string,
                              subject?: EntityId,
                              limit?: number,
                              resultVariable = 'p'): string {
  const subj = (subject
    ? `<${subject}>`
    : '[]')
  const limitClause = limit ? ` LIMIT ${limit} ` : ''
  const tmpReferenceLangToRemoveError = lang

  //  return `SELECT ?${resultVariable} ?${resultVariable}Label WHERE {{
  //  SELECT DISTINCT ?${resultVariable} WHERE {
  //    ${subj} wdt:${propertyId} ?${resultVariable} .
  //  }${limitClause}}
  //  SERVICE wikibase:label { bd:serviceParam wikibase:language "${lang}" }
  //  }`
  return `SELECT ?${resultVariable} ?${resultVariable}Label WHERE {
    ${subj} <${propertyId}> ?${resultVariable} .
    ?${resultVariable} rdfs:label ?${resultVariable}Label .
  }
  ${limitClause}`
}

export async function getPropertyObjects(propertyId: EntityId, lang: string, limit: number, entityId?: EntityId) {
  const result = await sparqlQuery(propertyObjectsQuery(propertyId, lang, entityId, limit))

  return result.map((binding) => {
    return {
      entityId: entityValue(binding.p),
      label: binding.pLabel.value,
    }
  })
}
