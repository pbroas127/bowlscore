/// <reference types="node" />
// Run with: node --experimental-strip-types src/lib/links.test.ts
import assert from 'node:assert/strict'
import { ownLink } from './ownLink.ts'

assert.equal(ownLink('https://www.amazon.com/dp/B01I3JW7PK'), 'https://www.amazon.com/dp/B01I3JW7PK?tag=bowlscore-20')
assert.equal(ownLink('https://www.amazon.com/dp/B01I3JW7PK?tag=someoneelse-20&th=1'), 'https://www.amazon.com/dp/B01I3JW7PK?tag=bowlscore-20&th=1')
assert.equal(ownLink('Check this out https://amazon.com/s?k=orijen'), 'https://amazon.com/s?k=orijen&tag=bowlscore-20')
assert.equal(ownLink('https://amzn.to/3xYz'), 'https://amzn.to/3xYz') // short links cannot carry a tag
assert.equal(ownLink('https://www.chewy.com/dp/123'), 'https://www.chewy.com/dp/123')
assert.equal(ownLink('www.amazon.com/dp/B000'), 'https://www.amazon.com/dp/B000?tag=bowlscore-20')
assert.equal(ownLink('not a link'), undefined)
console.log('links tests passed')
