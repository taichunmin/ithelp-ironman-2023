const publish = require('./publish.cjs')

publish.main().catch(err => {
  console.error(publish.errToJson(err))
  process.exit(1)
})
