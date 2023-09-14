require('dotenv').config()

const _ = require('lodash')
const axios = require('axios')
const dayjs = require('dayjs')
const Joi = require('joi')
const JSON5 = require('json5')
const Papa = require('papaparse')
const Qs = require('qs')
const xmljs = require('xml-js')

dayjs.extend(require('dayjs/plugin/utc'))
dayjs.extend(require('dayjs/plugin/customParseFormat'))

/**
 * 取得 process.env.[key] 的輔助函式，且可以有預設值
 */
exports.getenv = (key, defaultval) => {
  return _.get(process, ['env', key], defaultval)
}

// https://ithelp.ithome.com.tw/articles/10191096
let cfg = {
  ITHELP_COOKIE: exports.getenv('ITHELP_COOKIE'),
  IRONMAN_ID: exports.getenv('IRONMAN_ID'),
  IRONMAN_TOKEN: exports.getenv('IRONMAN_TOKEN'),
  ARTICLE_CSV: exports.getenv('ARTICLE_CSV'),
}

const joiCfg = Joi.object({
  ITHELP_COOKIE: Joi.string().trim().empty('').required(),
  IRONMAN_ID: Joi.number().min(1).required(),
  IRONMAN_TOKEN: Joi.string().trim().empty('').required(),
  ARTICLE_CSV: Joi.string().trim().uri({ scheme: ['http', 'https'] }).empty('').required(),
})

const articleSchema = Joi.object({
  date: Joi.string().empty('').pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
  subject: Joi.string().empty('').min(1).required(),
  tags: Joi.array().items(Joi.string().trim().empty()).unique().min(1),
  description: Joi.string().empty().min(300).required(),
})

const sharedHeaders = {
  'User-Agent':
'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
}

exports.articleValidate = article => articleSchema.validateAsync(article, { stripUnknown: true })

exports.main = async (data, context) => {
  let article
  try {
    cfg = await joiCfg.validateAsync(cfg, { stripUnknown: true })
    const articles = await exports.getCsv(cfg.ARTICLE_CSV)
    console.log(`成功取得文章列表, count = ${articles.length}`)
    const today = exports.todayStr()
    article = _.find(articles, { date: today })
    if (_.isNil(article)) {
      console.log(`找不到今天的文章, date = ${today}`)
      return
    }
    article.tags = exports.parseJsonOrDefault(article?.tags, [])
    article = await exports.articleValidate(article)
    console.log(`成功取得文章內容, date = ${article.date}, subject = ${article.subject}`)
    if (await exports.isArticlePublished(cfg.IRONMAN_ID, today)) {
      console.log(`今天已經發過文章了, date = ${today}`)
      return
    }
    const articleId = await exports.createArticle()
    console.log(`成功建立文章, articleId = ${articleId}`)
    await exports.publishArticle(articleId, article)
    console.log(`成功發佈文章, date = ${article.date}`)
    await exports.sendLineNotify(`成功發佈文章, date = ${article.date}, subject = ${article.subject}`)
  } catch (err) {
    console.log(exports.errToJson(err))
    await exports.sendLineNotify(`文章發佈失敗, date = ${article.date}, subject = ${article.subject}, err = ${err.message}`)
    throw err
  }
}

exports.createArticle = async () => {
  const res = await axios.get(`https://ithelp.ithome.com.tw/2023ironman/create/${cfg.IRONMAN_ID}`, {
    maxRedirects: 0,
    validateStatus: status => status === 302,
    headers: {
      ...sharedHeaders,
      Cookie: cfg.ITHELP_COOKIE,
      Referer: 'https://ithelp.ithome.com.tw/',
    },
  })
  return res.data.match(/articles\/(.+)\/draft/)[1]
}

exports.publishArticle = async (articleId, article) => {
  return await axios.post(`https://ithelp.ithome.com.tw/articles/${articleId}/publish`, exports.httpBuildQuery({
    _token: cfg.IRONMAN_TOKEN,
    _method: 'PUT',
    subject: article.subject,
    description: article.description,
    tags: ['15th鐵人賽', ...article.tags],
  }), {
    headers: {
      ...sharedHeaders,
      Cookie: cfg.ITHELP_COOKIE,
    },
  })
}

exports.httpBuildQuery = obj => Qs.stringify(obj, { arrayFormat: 'brackets' })

exports.getCsv = async (url, cachetime = 3e4) => {
  const csv = _.trim(_.get(await axios.get(url, {
    params: { cachebust: Math.trunc(Date.now() / cachetime) },
  }), 'data'))
  return _.get(Papa.parse(csv, {
    encoding: 'utf8',
    header: true,
  }), 'data', [])
}

exports.todayStr = () => dayjs().utcOffset(8).format('YYYY-MM-DD')

exports.errToJson = (() => {
  const ERROR_KEYS = [
    'address',
    'code',
    'data',
    'dest',
    'errno',
    'info',
    'message',
    'name',
    'path',
    'port',
    'reason',
    'request.baseURL',
    'request.data',
    'request.headers',
    'request.method',
    'request.params',
    'request.url',
    'response.data',
    'response.headers',
    'response.status',
    'stack',
    'status',
    'statusCode',
    'statusMessage',
    'syscall',
  ]
  return err => ({
    ..._.pick(err, ERROR_KEYS),
    ...(_.isNil(err.originalError) ? {} : { originalError: exports.errToJson(err.originalError) }),
  })
})()

exports.sendLineNotify = async msg => {
  const token = exports.getenv('LINE_NOTIFY_TOKEN')
  try {
    if (!_.isString(token) || token.length < 1) throw new Error(`invalid LINE_NOTIFY_TOKEN = ${token}`)
    const body = exports.httpBuildQuery({ message: `\n${msg}` })
    await axios.post('https://notify-api.line.me/api/notify', body, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return true
  } catch (err) {
    err.message = _.get(err, 'response.data.message', err.message)
    err.status = _.get(err, 'response.status', 500)
    if (err.status === 401) err.message = `token 已失效 = "${token}"`
    console.error(exports.errToJson(err))
    return false
  }
}

exports.parseJsonOrDefault = (str, defaultValue) => {
  try {
    if (!_.isString(str) && !_.isBuffer(str)) return defaultValue
    return JSON5.parse(str)
  } catch (err) {
    return defaultValue
  }
}

exports.xml2js = xml => xmljs.xml2js(xml, {
  compact: true,
  trim: true,
  ignoreDeclaration: true,
  ignoreInstruction: true,
  ignoreComment: true,
  ignoreDoctype: true,
})

exports.isArticlePublished = async (seriesId, date) => {
  try {
    const rss = exports.xml2js((await axios.get(`https://ithelp.ithome.com.tw/rss/series/${seriesId}`, {
      headers: sharedHeaders,
    }))?.data)
    // console.log(JSON5.stringify(rss))
    const userLink = _.get(rss, 'rss.channel.link._text')
    // console.log(`userLink = ${userLink}`)
    const htmlSerial = (await axios.get(`${userLink}/${seriesId}`, {
      headers: sharedHeaders,
    }))?.data
    // console.log(JSON5.stringify(htmlSerial))
    return _.some([...htmlSerial.matchAll(/qa-list__info-time">(\d{4}-\d{2}-\d{2})</g)], match => match[1] === date)
  } catch (err) {
    err.message = _.get(err, 'response.data.message', err.message)
    err.status = _.get(err, 'response.status', 500)
    console.error(exports.errToJson(err))
    return false
  }
}
