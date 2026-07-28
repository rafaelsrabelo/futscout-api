import { describe, expect, it } from 'vitest'
import { buildFilterSummary } from './filter-summary.js'

describe('buildFilterSummary', () => {
  it('should return null when there is nothing to describe', () => {
    expect(buildFilterSummary(null)).toBeNull()
    expect(buildFilterSummary({})).toBeNull()
  })

  it('should describe position, foot and age range', () => {
    expect(
      buildFilterSummary({
        primaryPosition: 'FORWARD',
        dominantFoot: 'LEFT',
        minAge: 18,
        maxAge: 21,
      }),
    ).toEqual('Atacante · canhoto · 18 a 21 anos')
  })

  it('should describe an open-ended age range', () => {
    expect(buildFilterSummary({ maxAge: 20 })).toEqual('até 20 anos')
    expect(buildFilterSummary({ minAge: 18 })).toEqual('a partir de 18 anos')
  })

  it('should format height in the brazilian style', () => {
    expect(buildFilterSummary({ minHeight: 1.8 })).toEqual('a partir de 1,80m')
    expect(buildFilterSummary({ minHeight: 1.75, maxHeight: 1.9 })).toEqual(
      '1,75m a 1,90m',
    )
  })

  it('should distinguish having a manager from not having one', () => {
    // `false` é um filtro válido e não pode sumir como se fosse ausente.
    expect(buildFilterSummary({ hasManager: false })).toEqual('sem empresário')
    expect(buildFilterSummary({ hasManager: true })).toEqual('com empresário')
  })

  it('should describe the search the observer actually asked for', () => {
    expect(
      buildFilterSummary({ primaryPosition: 'MIDFIELDER', hasManager: false }),
    ).toEqual('Meio-campista · sem empresário')
  })

  it('should include club and classification', () => {
    expect(
      buildFilterSummary({
        primaryPosition: 'GOALKEEPER',
        currentClub: 'Ceará',
        classification: 'PERFORMANCE',
      }),
    ).toEqual('Goleiro · Ceará · Performance')
  })
})
