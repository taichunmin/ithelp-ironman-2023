const publish = require('./publish.cjs')

publish.main().catch(err => {
  console.error(exports.errToJson(err))
  process.exit(1)
})
