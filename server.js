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
const endpoint = 'https://classic.warcraftlogs.com/api/v2/client'

const client = new GraphQLClient(endpoint, {
  headers: {
    authorization: 'Bearer ' + WCL_TOKEN
  }
})
const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: false }))

app.get('/', function (req, res) {
  res.render('pages/index', {
    title: 'ZugBrains: Zug Zug',
    encounters: statics.getBossMap(),
    usServers: statics.getServersUs(),
    euServers: statics.getServersEu(),
    errorText: ''
  })
})

app.get('/static', function (req, res) {
  res.sendFile('static.html', { root: __dirname })
})
// index page
app.get('/ejs-test', function (req, res) {
  res.render('pages/index', {
    title: 'ZugBrains: Sample Rendered Page'
  })
})

app.post('/encounter-report', async function (req, res) {
  try {
  // Build a list of Characters to Pull from a Guild ID
    const queryName = req.body.guildName
    const region = req.body.region
    const server = req.body.server
    const metric = req.body.metric
    let reportType = req.body.encounterId
    let encounterId = 0
    const zoneIdArr = []
    let reportView = 'pages/all-encounter-report'
    let reportTitle = 'ZugBrains Report'
    if (!reportType.startsWith('All')) {
      encounterId = parseInt(req.body.encounterId)
      reportType = 'SINGLE'
      reportView = 'pages/encounter-report'
    }
    for (const key of statics.getZoneMap().values()) zoneIdArr.push(key)
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
    for (const zoneId of zoneIdArr) {
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
    }
    console.log('Entries Processed: ' + count)
    console.log('Total Guildies: ' + guildSet.size)
    const guildList = []
    for (const guildMem of guildSet) guildList.push(guildMem)
    guildList.sort()

    const preparedData = []
    const analyzedData = []
    const failedChars = []
    let currentChar = 0
    for (const charName of guildList) {
      console.log(`CHAR: ${charName} (${currentChar})`)
      try {
        if (currentChar < GUILD_ROSTER_LIMIT) {
          if (reportType === 'SINGLE') {
            const entry = await getCharacterEncounterReport(charName, serverSlug, regionSlug, encounterId, metric)
            analyzedData.push(entry)
            for (const rawEntry of entry.rawData) {
              preparedData.push(rawEntry)
            }
            reportTitle = `ZugBrains: ${guildName} ${entry.bossName} Report`
          } else {
            reportTitle = `ZugBrains: ${guildName} ${reportType} Report`
            // All Reports
            // AllBest, AllAvg, All3, All5
            const charEncounters = new Map()
            let charClass = ''
            for (const bossId of statics.getBossMap().keys()) {
              const entry = await getCharacterEncounterReport(charName, serverSlug, regionSlug, bossId, metric)
              charEncounters.set(bossId, entry)
              for (const rawEntry of entry.rawData) {
                preparedData.push(rawEntry)
              }
              charClass = entry.className
            }
            const characterEntry = {
              name: charName,
              className: charClass,
              classColor: statics.getColorMap().get(charClass),
              // HKMG
              HKMG_BEST: charEncounters.get(649).bestDps,
              HKMG_AVG: charEncounters.get(649).avgDps,
              HKMG_AVG5: charEncounters.get(649).avgDps5,
              HKMG_AVG3: charEncounters.get(649).avgDps3,
              // GRUL
              GRUL_BEST: charEncounters.get(650).bestDps,
              GRUL_AVG: charEncounters.get(650).avgDps,
              GRUL_AVG5: charEncounters.get(650).avgDps5,
              GRUL_AVG3: charEncounters.get(650).avgDps3,
              // MAGT
              MAGT_BEST: charEncounters.get(651).bestDps,
              MAGT_AVG: charEncounters.get(651).avgDps,
              MAGT_AVG5: charEncounters.get(651).avgDps5,
              MAGT_AVG3: charEncounters.get(651).avgDps3,
              // ATTN
              ATTN_BEST: charEncounters.get(652).bestDps,
              ATTN_AVG: charEncounters.get(652).avgDps,
              ATTN_AVG5: charEncounters.get(652).avgDps5,
              ATTN_AVG3: charEncounters.get(652).avgDps3,
              // MORS
              MORS_BEST: charEncounters.get(653).bestDps,
              MORS_AVG: charEncounters.get(653).avgDps,
              MORS_AVG5: charEncounters.get(653).avgDps5,
              MORS_AVG3: charEncounters.get(653).avgDps3,
              // MAID
              MAID_BEST: charEncounters.get(654).bestDps,
              MAID_AVG: charEncounters.get(654).avgDps,
              MAID_AVG5: charEncounters.get(654).avgDps5,
              MAID_AVG3: charEncounters.get(654).avgDps3,
              // OPRA
              OPRA_BEST: charEncounters.get(655).bestDps,
              OPRA_AVG: charEncounters.get(655).avgDps,
              OPRA_AVG5: charEncounters.get(655).avgDps5,
              OPRA_AVG3: charEncounters.get(655).avgDps3,
              // CURA
              CURA_BEST: charEncounters.get(656).bestDps,
              CURA_AVG: charEncounters.get(656).avgDps,
              CURA_AVG5: charEncounters.get(656).avgDps5,
              CURA_AVG3: charEncounters.get(656).avgDps3,
              // ILHF
              ILHF_BEST: charEncounters.get(657).bestDps,
              ILHF_AVG: charEncounters.get(657).avgDps,
              ILHF_AVG5: charEncounters.get(657).avgDps5,
              ILHF_AVG3: charEncounters.get(657).avgDps3,
              // ARAN
              ARAN_BEST: charEncounters.get(658).bestDps,
              ARAN_AVG3: charEncounters.get(658).avgDps,
              ARAN_AVG5: charEncounters.get(658).avgDps5,
              ARAN_AVG: charEncounters.get(658).avgDps3,
              // NSPT
              NSPT_BEST: charEncounters.get(659).bestDps,
              NSPT_AVG: charEncounters.get(659).avgDps,
              NSPT_AVG5: charEncounters.get(659).avgDps5,
              NSPT_AVG3: charEncounters.get(659).avgDps3,
              // PRNC
              PRNC_BEST: charEncounters.get(661).bestDps,
              PRNC_AVG: charEncounters.get(661).avgDps,
              PRNC_AVG5: charEncounters.get(661).avgDps5,
              PRNC_AVG3: charEncounters.get(661).avgDps3,
              // NTBN
              NTBN_BEST: charEncounters.get(662).bestDps,
              NTBN_AVG: charEncounters.get(662).avgDps,
              NTBN_AVG5: charEncounters.get(662).avgDps5,
              NTBN_AVG3: charEncounters.get(662).avgDps3,

              bossEntry: charEncounters
            }
            analyzedData.push(characterEntry)
          }
        }
      } catch (error) {
        console.error(error)
        failedChars.push(charName)
      // expected output: ReferenceError: nonExistentFunction is not defined
      // Note - error messages will vary depending on browser
      }
      currentChar++
    }

    res.render(reportView, {
      title: reportTitle,
      guildName: guildName,
      serverName: serverSlug,
      regionName: regionSlug,
      guildCount: guildSet.size,
      reportData: preparedData,
      analyzedData: analyzedData,
      failedChars: failedChars,
      reportType: reportType
    })
  } catch (error) {
    console.error(error)
    res.render('pages/index', {
      title: 'ZugBrains: Zug Zug',
      encounters: statics.getBossMap(),
      usServers: statics.getServersUs(),
      euServers: statics.getServersEu(),
      errorText: 'Oops, something went wrong.'
    })
  // expected output: ReferenceError: nonExistentFunction is not defined
  // Note - error messages will vary depending on browser
  }
})

function getAvg (values) {
  const total = values.reduce((acc, c) => acc + c, 0)
  return total / values.length
}

async function getCharacterEncounterReport (charName, serverSlug, regionSlug, encounterId, metric) {
  const bossName = statics.getBossMap().get(encounterId)
  const query = '{characterData {character(name:"' + charName + '",serverSlug:"' + serverSlug + '",serverRegion:"' + regionSlug + '") { name, classID, encounterRankings(encounterID:' + encounterId + ', metric:' + metric + ')}}}'
  const data = await client.request(query)
  const dpsRanks = []
  const rankRanks = []
  const rawData = []
  for (const rank of data.characterData.character.encounterRankings.ranks) {
    const date = new Date(rank.startTime).toISOString().substr(0, 10)
    const duration = new Date(rank.duration * 1000).toISOString().substr(11, 8)
    const rawEntry = {
      name: data.characterData.character.name,
      bossName: bossName,
      bossId: encounterId,
      guildName: rank.guild.name,
      date: date,
      dps: rank.amount,
      duration: duration,
      pct: rank.rankPercent,
      todayPct: rank.todayPercent,
      spec: rank.spec,
      className: statics.getClassMap().get(data.characterData.character.classID),
      classColor: statics.getColorMap().get(statics.getClassMap().get(data.characterData.character.classID)),
    }
    rawData.push(rawEntry)
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
    bossId: encounterId,
    kills: data.characterData.character.encounterRankings.totalKills,
    bestRank: bestRank.toFixed(2),
    avgRank: avgRank.toFixed(2),
    avgDps: avgDps.toFixed(2),
    avgDps3: avgDps3.toFixed(2),
    avgDps5: avgDps5.toFixed(2),
    bestDps: data.characterData.character.encounterRankings.bestAmount.toFixed(2),
    className: statics.getClassMap().get(data.characterData.character.classID),
    rawData: rawData
  }
  return entry
}
app.listen(port, function () {
  console.log(`Example app listening on port ${port}!`)
})
