import {describe,it,expect} from 'vitest'
import {createConversionRateLimiter} from './affiliate-conversion-rate'
describe('bounded conversion intent throttling',()=>{
 it('limits serial attempts by IP tenant slug and resets only after the sliding window',()=>{
  let at=0;const limited=createConversionRateLimiter(()=>at)
  for(let count=0;count<20;count++)expect(limited('127.0.0.1','tenant','pets')).toBe(false)
  expect(limited('127.0.0.1','tenant','pets')).toBe(true)
  expect(limited('127.0.0.2','tenant','pets')).toBe(false)
  expect(limited('127.0.0.1','other','pets')).toBe(false)
  expect(limited('127.0.0.1','tenant','other')).toBe(false)
  at=60001;expect(limited('127.0.0.1','tenant','pets')).toBe(false)
 })
 it('rejects new keys at capacity without resetting existing limits',()=>{
  const limited=createConversionRateLimiter(()=>1000)
  for(let count=0;count<10000;count++)expect(limited(String(count),'tenant','pets')).toBe(false)
  expect(limited('overflow','tenant','pets')).toBe(true)
  for(let count=1;count<20;count++)expect(limited('0','tenant','pets')).toBe(false)
  expect(limited('0','tenant','pets')).toBe(true)
 })
})
