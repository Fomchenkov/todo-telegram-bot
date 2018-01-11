const assert = require('assert')
const util = require('../lib/util')

describe('Time function', () => {
	it('Thuth conversion', () => {
		assert.equal(util.getNormalDate(1515693795221), '11.01.2018 21:03')
	})
})
