const {GraphQLClient} = require("graphql-request");
const secrets = require('./secrets');
const statics = require('./statics');
var express = require('express');
var app = express();
app.set('view engine', 'ejs');
require('dotenv').config();
const WCL_TOKEN = (secrets.read('WCL_TOKEN') || process.env.WCL_TOKEN || '');
const GUILD_ROSTER_LIMIT = (secrets.read('GUILD_ROSTER_LIMIT') || process.env.GUILD_ROSTER_LIMIT || '');

var bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function (req, res) {
    res.render('pages/index',  {
        title: 'ZugBrains: Zug Zug',
        encounters: statics.getBossMap()
    });
});

// index page
app.get('/ejs-test', function(req, res) {
    res.render('pages/index',  {
        title: 'ZugBrains: Sample Rendered Page'
    });
});


app.post('/encounter-report', async function (req, res) {
    var name = req.body.guildId + ' ' + req.body.encounterId;
    console.log(name + ' Submitted Successfully!');
    const endpoint = 'https://classic.warcraftlogs.com/api/v2/client'

    const client = new GraphQLClient(endpoint, {
        headers: {
            authorization: 'Bearer ' + WCL_TOKEN,
        },
    })

    //Build a list of Characters to Pull from a Guild ID
    let guildId = req.body.guildId
    let encounterId = parseInt(req.body.encounterId)
    let guildQuery = '{guildData{guild(id:' + guildId +') {id, name, server { slug, region { slug}}}}}'
    let guildData = await client.request(guildQuery)
    let guildName = guildData.guildData.guild.name;
    let serverSlug = guildData.guildData.guild.server.slug;
    let regionSlug = guildData.guildData.guild.server.region.slug;

    let count = 0;
    let guildSet = new Set()
    let zoneId = statics.getZoneMap().get(encounterId)
    let bossName = statics.getBossMap().get(encounterId)
    let rosterQuery = '{reportData {reports(guildID:' + guildId +',zoneID:' + zoneId + ') {total, per_page, last_page, current_page, data {rankedCharacters { name }}}}}';
    let rosterData = await client.request(rosterQuery)
    let lastPage = rosterData.reportData.reports.last_page
    let currentPage = rosterData.reportData.reports.current_page

    while (currentPage <= lastPage) {
        rosterQuery = '{reportData {reports(guildID:' + guildId +',zoneID:' + zoneId + ',page:' + currentPage + ') {total, per_page, last_page, current_page, data {rankedCharacters { name }}}}}';
        rosterData = await client.request(rosterQuery)
        for (let guildReport of rosterData.reportData.reports.data) {
            if (Array.isArray(guildReport.rankedCharacters) && guildReport.rankedCharacters.length > 0) {
                for (let guildPc of guildReport.rankedCharacters) {
                    guildSet.add(guildPc.name);
                    count++;
                }
            }
        }
        currentPage++;
    }

    console.log('Entries Processed: ' + count);
    console.log('Total Guildies: ' + guildSet.size);

    let preparedData = [];
    let currentChar = 0
    for (let charName of guildSet) {
        if (currentChar < GUILD_ROSTER_LIMIT) {
            const query = '{characterData {character(name:"' + charName + '",serverSlug:"' + serverSlug + '",serverRegion:"' + regionSlug + '") { name, classID, encounterRankings(encounterID:' + encounterId + ')}}}'
            const data = await client.request(query)
            for (const rank of data.characterData.character.encounterRankings.ranks) {
                var date = new Date(rank.startTime).toISOString().substr(0, 10);
                var duration = new Date(rank.duration * 1000).toISOString().substr(11, 8)
                let entry = {
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
                preparedData.push(entry);
            }
        }
        currentChar++;
    }
    res.render('pages/encounter-report',  {
        title: `ZugBrains: ${guildName} ${bossName} Report`,
        guildName: guildName,
        serverName: serverSlug,
        regionName: regionSlug,
        guildCount: guildSet.size,
        reportData: preparedData
    });

});

app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});