const { GraphQLClient } = require('graphql-request')
const secrets = require('./secrets')
const statics = require('./statics')
const express = require('express')
const mongoose = require('mongoose');

const app = express()
app.set('view engine', 'ejs')
require('dotenv').config()
const WCL_TOKEN = (secrets.read('WCL_TOKEN') || process.env.WCL_TOKEN || '')
const MONGO_CONN_URL = (secrets.read('MONGO_CONN_URL') || process.env.MONGO_CONN_URL || '')
var thingSchema = new mongoose.Schema({queryString: String, queryDate: Date }, { strict: false })
const port = process.env.PORT || 3000
const endpoint = 'https://classic.warcraftlogs.com/api/v2/client'
const CachedQuery = mongoose.model('CachedQuery', thingSchema)

const client = new GraphQLClient(endpoint, {
  headers: {
    authorization: 'Bearer ' + WCL_TOKEN
  }
})
const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: false }))
app.use(express.static('views/static'))

app.get('/overlayLastParse', async function (req, res) {
  const charName = req.query.c
  const serverName = req.query.s
  const serverRegion = req.query.r
  const reqMetric = req.query.m
  let message = ''
  if (charName === undefined || serverName === undefined || serverRegion === undefined || reqMetric === undefined || charName == null ||
      charName == '' ||serverName == null || serverName == ''|| serverRegion == null || serverRegion == '' || reqMetric == null || reqMetric == '') {
    message = 'Please pass the required fields'
    res.render('pages/error', {
      title: 'error',
      message: message
    })
  } else {
    const metric = reqMetric.toLowerCase()
    const charQuery = `{characterData {character(name:"${charName}",serverSlug:"${serverName}",serverRegion:"${serverRegion}") {id, name, recentReports(limit:1) {total, per_page, last_page, current_page, data {title, rankings(playerMetric:${metric})}}}}}`
    const charData = await client.request(charQuery)
    let blnFound = false
    let lastFight = null
    let encounter = ''
    let duration = 0
    let dps = 0
    let parse = 0
    let rank = ''
    let blnErr = false
    while (blnFound == false) {
      lastFight = charData.characterData.character.recentReports.data[0].rankings.data.pop()
      if (lastFight === undefined) {
        message = 'No Parses found for metric, did you mean to hps or dps?'
        blnFound = true
        blnErr = true
      } else {
        if (lastFight.fightID < 1000 || charData.characterData.character.recentReports.data[0].rankings.data.length == 0) {
          console.log(`RESULT ${lastFight.encounter.name} DUR: ${lastFight.duration} `)
          if (metric == 'dps') {
            for (let entry of lastFight.roles.dps.characters) {
              if (entry.name.toLowerCase() == charName.toLowerCase()) {
                console.log(`Found Ya! DPS: ${entry.amount} Parse: ${entry.rankPercent} Rank: ${entry.rank}`)
                dps = entry.amount
                parse = entry.rankPercent
                rank = entry.rank
                encounter = lastFight.encounter.name
                duration = lastFight.duration / 1000
                blnFound = true
              }
            }
          }
            if (!blnFound) {
              for (let entry of lastFight.roles.tanks.characters) {
                if (entry.name.toLowerCase() == charName.toLowerCase()) {
                  console.log(`Found Ya! DPS: ${entry.amount} Parse: ${entry.rankPercent} Rank: ${entry.rank}`)
                  dps = entry.amount
                  parse = entry.rankPercent
                  rank = entry.rank
                  encounter = lastFight.encounter.name
                  duration = lastFight.duration / 1000
                  blnFound = true
                }
              }
            }

            if (!blnFound) {
              for (let entry of lastFight.roles.healers.characters) {
                if (entry.name.toLowerCase() == charName.toLowerCase()) {
                  console.log(`Found Ya! DPS: ${entry.amount} Parse: ${entry.rankPercent} Rank: ${entry.rank}`)
                  dps = entry.amount
                  parse = entry.rankPercent
                  rank = entry.rank
                  encounter = lastFight.encounter.name
                  duration = lastFight.duration / 1000
                  blnFound = true
                }
              }
            }

      }

      }
    }

    if (blnErr) {
      res.render('pages/error', {
        title: 'error',
        message: message
      })
    } else {
      let parseColor = 'common'
      if (parse == 100) {
        parseColor = 'artifact'
      } else if (parse == 99) {
        parseColor = 'astounding'
      } else if (parse >= 95) {
        parseColor = 'legendary'
      } else if (parse >= 75) {
        parseColor = 'epic'
      } else if (parse >= 50) {
        parseColor = 'rare'
      } else if (parse >= 25) {
        parseColor = 'uncommon'
      } else {
        parseColor = 'common'
      }

      res.render('pages/overlayLast', {
        title: 'overlayLastParse',
        encounter: encounter,
        duration: Math.round(duration),
        dps: Math.round(dps),
        parse: parse,
        rank: rank,
        parseColor: parseColor,
        metric: metric.toUpperCase()
      })
    }
  }

});

app.get('/', function (req, res) {
  res.render('pages/index', {
    title: '',
    encounters: statics.getBossMap(),
    usServers: statics.getServersUs(),
    euServers: statics.getServersEu(),
    errorText: ''
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
    const guildData = await getCachedQuery(client, guildQuery)
    const guildName = guildData.guildData.guild.name
    const serverSlug = guildData.guildData.guild.server.slug
    const regionSlug = guildData.guildData.guild.server.region.slug
    const guildId = guildData.guildData.guild.id

    let count = 0
    const guildSet = new Set()
    for (const zoneId of zoneIdArr) {
      let rosterQuery = '{reportData {reports(guildID:' + guildId + ',zoneID:' + zoneId + ') {total, per_page, last_page, current_page, data {rankedCharacters { name }}}}}'
      let rosterData = await getCachedQuery(client, rosterQuery)
      const lastPage = rosterData.reportData.reports.last_page
      let currentPage = rosterData.reportData.reports.current_page

      while (currentPage <= lastPage) {
        rosterQuery = '{reportData {reports(guildID:' + guildId + ',zoneID:' + zoneId + ',page:' + currentPage + ') {total, per_page, last_page, current_page, data {rankedCharacters { name }}}}}'
        rosterData = await getCachedQuery(client, rosterQuery)
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
    if (reportType === 'SINGLE') {
      try {
        const fullDataSet = await getCharacterEncounterReportAll(guildList, serverSlug, regionSlug, encounterId, metric)
        for (const entry of fullDataSet) {
          if (entry.className !== 'Phantom') {
            analyzedData.push(entry)
            for (const rawEntry of entry.rawData) {
              preparedData.push(rawEntry)
            }
          } else {
            failedChars.push(entry.name)
          }
        }
      } catch (error) {
        console.log(`ERR2 ${error}}`, error)
      }
      const bossName = statics.getBossMap().get(encounterId)
      reportTitle = `<${guildName}> ${bossName} Report`
    } else {
      for (const charName of guildList) {
        console.log(`CHAR: ${charName} (${currentChar})`)
        try {
          const charReport = await getCharacterFullReport(charName, serverSlug, regionSlug, metric)
          reportTitle = `<${guildName}> ${reportType} Report`
          // All Reports
          // AllBest, AllAvg, All3, All5
          const charEncounters = charReport.charEncounters
          let charClass = ''
          let charSpec = ''
          for (const bossId of statics.getBossMap25().keys()) {
            const entry = charEncounters.get(bossId)
            for (const rawEntry of entry.rawData) {
              preparedData.push(rawEntry)
            }
            charClass = entry.className
            charSpec = entry.spec
          }
          console.log(`CHAR: ${charName} (${charClass} : ${charSpec})`)
          if (charClass !== 'Phantom') {
              const characterEntry = {
                name: charName,
                className: charClass,
                specName: charSpec,
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
                /*
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
                */
                // HYDR
                HYDR_BEST: charEncounters.get(623).bestDps,
                HYDR_AVG: charEncounters.get(623).avgDps,
                HYDR_AVG5: charEncounters.get(623).avgDps5,
                HYDR_AVG3: charEncounters.get(623).avgDps3,
                // LURK
                LURK_BEST: charEncounters.get(624).bestDps,
                LURK_AVG: charEncounters.get(624).avgDps,
                LURK_AVG5: charEncounters.get(624).avgDps5,
                LURK_AVG3: charEncounters.get(624).avgDps3,
                // LEOT
                LEOT_BEST: charEncounters.get(625).bestDps,
                LEOT_AVG: charEncounters.get(625).avgDps,
                LEOT_AVG5: charEncounters.get(625).avgDps5,
                LEOT_AVG3: charEncounters.get(625).avgDps3,
                // FATH
                FATH_BEST: charEncounters.get(626).bestDps,
                FATH_AVG: charEncounters.get(626).avgDps,
                FATH_AVG5: charEncounters.get(626).avgDps5,
                FATH_AVG3: charEncounters.get(626).avgDps3,
                // MORO
                MORO_BEST: charEncounters.get(627).bestDps,
                MORO_AVG: charEncounters.get(627).avgDps,
                MORO_AVG5: charEncounters.get(627).avgDps5,
                MORO_AVG3: charEncounters.get(627).avgDps3,
                // VASH
                VASH_BEST: charEncounters.get(628).bestDps,
                VASH_AVG: charEncounters.get(628).avgDps,
                VASH_AVG5: charEncounters.get(628).avgDps5,
                VASH_AVG3: charEncounters.get(628).avgDps3,
                // ALAR
                ALAR_BEST: charEncounters.get(730).bestDps,
                ALAR_AVG: charEncounters.get(730).avgDps,
                ALAR_AVG5: charEncounters.get(730).avgDps5,
                ALAR_AVG3: charEncounters.get(730).avgDps3,
                // SOLA
                SOLA_BEST: charEncounters.get(732).bestDps,
                SOLA_AVG: charEncounters.get(732).avgDps,
                SOLA_AVG5: charEncounters.get(732).avgDps5,
                SOLA_AVG3: charEncounters.get(732).avgDps3,
                // VOID
                VOID_BEST: charEncounters.get(731).bestDps,
                VOID_AVG: charEncounters.get(731).avgDps,
                VOID_AVG5: charEncounters.get(731).avgDps5,
                VOID_AVG3: charEncounters.get(731).avgDps3,
                // KAEL
                KAEL_BEST: charEncounters.get(733).bestDps,
                KAEL_AVG: charEncounters.get(733).avgDps,
                KAEL_AVG5: charEncounters.get(733).avgDps5,
                KAEL_AVG3: charEncounters.get(733).avgDps3,
                bossEntry: charEncounters
              }
              analyzedData.push(characterEntry)

          } else {
            failedChars.push(charName)
          }
        } catch (error) {
          console.error(error)
          failedChars.push(charName)
          // expected output: ReferenceError: nonExistentFunction is not defined
          // Note - error messages will vary depending on browser
        }
        currentChar++
      }
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
      reportType: reportType,
      classes: statics.getClassMap(),
      specs: statics.getSpecMap()
    })
  } catch (error) {
    console.error(error)
    res.render('pages/index', {
      title: '',
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

async function getCharacterEncounterReportAll (guildList, serverSlug, regionSlug, encounterId, metric) {
  let returnArr = []
  const boundFunc = getCharacterEncounterLog.bind(null, serverSlug, regionSlug, encounterId, metric)
  const promises = guildList.map(await boundFunc)
  await Promise.all(promises).then(data => {
    returnArr = data
  })
  return returnArr
}
async function getCharacterFullReport (charName, serverSlug, regionSlug, metric) {
  const charEncounters = new Map()
  const boundFunc = getCharacterReport.bind(null, serverSlug, regionSlug, charName, metric)
  const bossArray = []
  for (const bossId of statics.getBossMap().keys()) {
    bossArray.push(bossId)
  }
  const promises = bossArray.map(await boundFunc)
  await Promise.all(promises).then(data => {
    for (const entry of data) {
      charEncounters.set(entry.bossId, entry)
    }
  })
  const charEntry = {
    name: charName,
    charEncounters: charEncounters
  }
  return charEntry
}
async function getCachedQuery(client2, query) {
  await mongoose.connect(MONGO_CONN_URL, {useNewUrlParser: true, useUnifiedTopology: true})
  let cachedQueries = await CachedQuery.find({queryString: query});
  let data = '';
  let blnFound = false;
  for (let cachedQuery of cachedQueries) {
    //console.log(`CachedQuery ${cachedQuery.queryString}`);
    //console.log(`CachedData ${cachedQuery.queryData}`);
    console.log(`CachedDate ${cachedQuery.queryDate}`);
    let nowDate = new Date();
    cacheAge =  nowDate.getTime() - cachedQuery.queryDate.getTime();
    console.log(`CacheAge ${(cacheAge / 1000)}s`);
    if (((cacheAge / 1000) / 3600) < 6) {
      data = cachedQuery.get('queryData');
      blnFound = true;
    }
  }
  if (!blnFound) {
    let tries = 0
    while ( tries < 30) {
      try {
        tries++;
        data = await client2.request(query)
        const cachedQuery = new CachedQuery({queryString: query, queryData: data, queryDate: Date.now()});
        cachedQuery.save().then(() => console.log(`saved ${query}`));
        tries = 99;
      } catch (error) {
        if (JSON.stringify(error, undefined, 2).indexOf('Too Many Requests') >= 0) {
          console.error("TOO MANY REQUESTS")
          await new Promise(resolve => setTimeout(resolve, 30000));
        } else {
          console.error(JSON.stringify(error, undefined, 2))
          tries = 666;
        }
      }
    }

  }
  return data;
}
const getCharacterEncounterLog = (serverSlug, regionSlug, encounterId, metric, charName) => {
  return new Promise(async (resolve, reject) => {
    const bossName = statics.getBossMap().get(encounterId)
    try {
      const dpsRanks = []
      const rankRanks = []
      const rawData = []
      const client2 = new GraphQLClient(endpoint, {
        headers: {
          authorization: 'Bearer ' + WCL_TOKEN
        }
      })
      const partitions = [-1]
      for (const partition of partitions) {
        const query = '{characterData {character(name:"' + charName + '",serverSlug:"' + serverSlug + '",serverRegion:"' + regionSlug + '") { name, classID, encounterRankings(encounterID:' + encounterId + ',partition:' + partition + ', metric:' + metric + ')}}}'
        const data = await getCachedQuery(client2, query)
        console.log(`OK getCharacterEncounterLog: ${partition}`)
        console.log(`Color: ${statics.getColorMap().get(statics.getClassMap().get(data.characterData.character.classID))}`)
        let classColor = statics.getColorMap().get(statics.getClassMap().get(data.characterData.character.classID))

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
            classColor: classColor
          }
          rawData.push(rawEntry)
          dpsRanks.push(rank.amount)
          rankRanks.push(rank.rankPercent)
        }
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

      const query = '{characterData {character(name:"' + charName + '",serverSlug:"' + serverSlug + '",serverRegion:"' + regionSlug + '") { name, classID, encounterRankings(encounterID:' + encounterId + ',partition:-1, metric:' + metric + ')}}}'
      const data = await getCachedQuery(client2, query)
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
      console.log(`Resolved ${charName}`)
      resolve(entry)
    } catch (error) {
      console.error(`ERROR ${error}`)
      const entry = {
        name: charName,
        bossName: bossName,
        bossId: encounterId,
        kills: 0,
        bestRank: 0,
        avgRank: 0,
        avgDps: 0,
        avgDps3: 0,
        avgDps5: 0,
        bestDps: 0,
        className: 'Phantom',
        rawData: []
      }
      resolve(entry)
    }
  })
}
const getCharacterReport = (serverSlug, regionSlug, charName, metric, encounterId) => {
  return new Promise(async (resolve, reject) => {
    const bossName = statics.getBossMap().get(encounterId)
    try {
      const dpsRanks = []
      const rankRanks = []
      const rawData = []
      const partitions = [-1]


          const query = '{characterData {character(name:"' + charName + '",serverSlug:"' + serverSlug + '",serverRegion:"' + regionSlug + '") { name, classID, encounterRankings(encounterID:' + encounterId + ', partition:-1, metric:' + metric + ')}}}'
          const client2 = new GraphQLClient(endpoint, {
            headers: {
              authorization: 'Bearer ' + WCL_TOKEN
            }
          })
        const data = await getCachedQuery(client2, query)
        console.log(`Color: ${statics.getColorMap().get(statics.getClassMap().get(data.characterData.character.classID))}`)
        let classColor = statics.getColorMap().get(statics.getClassMap().get(data.characterData.character.classID))
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
            classColor: classColor
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
      console.log(`Resolved ${charName}`)
      resolve(entry)
    } catch (error) {
      console.error(`ERROR ${error}`)
      const entry = {
        name: charName,
        bossName: bossName,
        bossId: encounterId,
        kills: 0,
        bestRank: 0,
        avgRank: 0,
        avgDps: 0,
        avgDps3: 0,
        avgDps5: 0,
        bestDps: 0,
        className: 'Phantom',
        rawData: []
      }
      resolve(entry)
    }
  })
}

app.listen(port, function () {
  console.log(`Example app listening on port ${port}!`)
})
