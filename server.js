const { GraphQLClient } = require('graphql-request')
const secrets = require('./secrets')
const statics = require('./statics')
const express = require('express')
const app = express()
app.set('view engine', 'ejs')
require('dotenv').config()
const WCL_TOKEN = (secrets.read('WCL_TOKEN') || process.env.WCL_TOKEN || '')
const GUILD_ROSTER_LIMIT = (secrets.read('GUILD_ROSTER_LIMIT') || process.env.GUILD_ROSTER_LIMIT || '')
const port = process.env.PORT || 3000

const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: false }))

app.get('/', function (req, res) {
  res.render('pages/index', {
    title: 'ZugBrains: Zug Zug',
    encounters: statics.getBossMap(),
    usServers: statics.getServersUs(),
    euServers: statics.getServersEu()
  })
})

// index page
app.get('/ejs-test', function (req, res) {
  res.render('pages/index', {
    title: 'ZugBrains: Sample Rendered Page'
  })
})

app.post('/encounter-report', async function (req, res) {
  const endpoint = 'https://classic.warcraftlogs.com/api/v2/client'

  const client = new GraphQLClient(endpoint, {
    headers: {
      authorization: 'Bearer ' + WCL_TOKEN
    }
  })

  // Build a list of Characters to Pull from a Guild ID
  const queryName = req.body.guildName
  const region = req.body.region
  const server = req.body.server
  const metric = req.body.metric
  const encounterId = parseInt(req.body.encounterId)
  // let guildQuery = '{guildData{guild(id:' + guildId +') {id, name, server { slug, region { slug}}}}}'
  // {guildData{guild(name:"pvp",serverSlug:"herod",serverRegion:"US")
  const guildQuery = '{guildData{guild(name:"' + queryName + '",serverSlug:"' + server + '",serverRegion:"' + region + '") {id, name, server { slug, region { slug}}}}}'
  const guildData = await client.request(guildQuery)
  const guildName = guildData.guildData.guild.name
  const serverSlug = guildData.guildData.guild.server.slug
  const regionSlug = guildData.guildData.guild.server.region.slug
  const guildId = guildData.guildData.guild.id

  let count = 0
  const guildSet = new Set()
  const zoneId = statics.getZoneMap().get(encounterId)
  const bossName = statics.getBossMap().get(encounterId)
  let rosterQuery = '{reportData {reports(guildID:' + guildId + ',zoneID:' + zoneId + ') {total, per_page, last_page, current_page, data {rankedCharacters { name }}}}}'
  let rosterData = await client.request(rosterQuery)
  const lastPage = rosterData.reportData.reports.last_page
  let currentPage = rosterData.reportData.reports.current_page

  while (currentPage <= lastPage) {
    rosterQuery = '{reportData {reports(guildID:' + guildId + ',zoneID:' + zoneId + ',page:' + currentPage + ') {total, per_page, last_page, current_page, data {rankedCharacters { name }}}}}'
    rosterData = await client.request(rosterQuery)
    for (const guildReport of rosterData.reportData.reports.data) {
      if (Array.isArray(guildReport.rankedCharacters) && guildReport.rankedCharacters.length > 0) {
        for (const guildPc of guildReport.rankedCharacters) {
          guildSet.add(guildPc.name)
          count++
        }
      }
    }
    currentPage++
  }

  console.log('Entries Processed: ' + count)
  console.log('Total Guildies: ' + guildSet.size)

  const preparedData = []
  const analyzedData = []
  const failedChars = []
  let currentChar = 0
  for (const charName of guildSet) {
    console.log(`CHAR: ${charName}`)
    try {
      if (currentChar < GUILD_ROSTER_LIMIT) {
        const query = '{characterData {character(name:"' + charName + '",serverSlug:"' + serverSlug + '",serverRegion:"' + regionSlug + '") { name, classID, encounterRankings(encounterID:' + encounterId + ', metric:' + metric + ')}}}'
        const data = await client.request(query)

        const dpsRanks = []
        const rankRanks = []
        for (const rank of data.characterData.character.encounterRankings.ranks) {
          const date = new Date(rank.startTime).toISOString().substr(0, 10)
          const duration = new Date(rank.duration * 1000).toISOString().substr(11, 8)
          const entry = {
            name: data.characterData.character.name,
            bossName: bossName,
            guildName: rank.guild.name,
            date: date,
            dps: rank.amount,
            duration: duration,
            pct: rank.rankPercent,
            todayPct: rank.todayPercent,
            spec: rank.spec,
            class: statics.getClassMap().get(data.characterData.character.classID)
          }
          preparedData.push(entry)
          dpsRanks.push(rank.amount)
          rankRanks.push(rank.rankPercent)
        }

        dpsRanks.sort(function (a, b) {
          return b - a
        })
        rankRanks.sort(function (a, b) {
          return b - a
        })
        let bestRank = 0
        let avgDps = 0
        let avgDps3 = 0
        let avgDps5 = 0
        let avgRank = 0
        if (rankRanks.length > 0) {
          bestRank = rankRanks[0]
        }
        if (data.characterData.character.encounterRankings.averagePerformance != null) {
          avgRank = data.characterData.character.encounterRankings.averagePerformance
        }
        if (dpsRanks.length > 0) {
          // console.log(`DPS RANKS: ${dpsRanks}`)
          avgDps = getAvg(dpsRanks)
          dpsRanks.length = Math.min(dpsRanks.length, 5)
          avgDps5 = getAvg(dpsRanks)
          dpsRanks.length = Math.min(dpsRanks.length, 3)
          avgDps3 = getAvg(dpsRanks)
        }
        const entry = {
          name: data.characterData.character.name,
          bossName: bossName,
          kills: data.characterData.character.encounterRankings.totalKills,
          bestRank: bestRank.toFixed(2),
          avgRank: avgRank.toFixed(2),
          avgDps: avgDps.toFixed(2),
          avgDps3: avgDps3.toFixed(2),
          avgDps5: avgDps5.toFixed(2),
          bestDps: data.characterData.character.encounterRankings.bestAmount.toFixed(2),
          class: statics.getClassMap().get(data.characterData.character.classID)
        }
        analyzedData.push(entry)
      }
    } catch (error) {
      console.error(error)
      failedChars.push(charName)
      // expected output: ReferenceError: nonExistentFunction is not defined
      // Note - error messages will vary depending on browser
    }
    currentChar++
  }
  res.render('pages/encounter-report', {
    title: `ZugBrains: ${guildName} ${bossName} Report`,
    guildName: guildName,
    serverName: serverSlug,
    regionName: regionSlug,
    guildCount: guildSet.size,
    reportData: preparedData,
    analyzedData: analyzedData,
    failedChars: failedChars
  })
})

function getAvg (values) {
  const total = values.reduce((acc, c) => acc + c, 0)
  return total / values.length
}

app.listen(port, function () {
  console.log(`Example app listening on port ${port}!`)
})
