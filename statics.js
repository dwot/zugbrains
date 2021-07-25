const ENCOUNTER_MAP = new Map()
ENCOUNTER_MAP.set(649, 'High King Maulgar')
ENCOUNTER_MAP.set(650, 'Gruul the Dragonkiller')
ENCOUNTER_MAP.set(651, 'Magtheridon')
ENCOUNTER_MAP.set(652, 'Attumen the Huntsman')
ENCOUNTER_MAP.set(653, 'Moroes')
ENCOUNTER_MAP.set(654, 'Maiden of Virtue')
ENCOUNTER_MAP.set(655, 'Opera Hall')
ENCOUNTER_MAP.set(656, 'The Curator')
ENCOUNTER_MAP.set(657, 'Terestian Illhoof')
ENCOUNTER_MAP.set(658, 'Shade of Aran')
ENCOUNTER_MAP.set(659, 'Netherspite')
ENCOUNTER_MAP.set(661, 'Prince Malchezaar')
ENCOUNTER_MAP.set(662, 'Nightbane')

const ZONE_MAP = new Map()
ZONE_MAP.set(649, 1008)
ZONE_MAP.set(650, 1008)
ZONE_MAP.set(651, 1008)
ZONE_MAP.set(652, 1007)
ZONE_MAP.set(653, 1007)
ZONE_MAP.set(654, 1007)
ZONE_MAP.set(655, 1007)
ZONE_MAP.set(656, 1007)
ZONE_MAP.set(657, 1007)
ZONE_MAP.set(658, 1007)
ZONE_MAP.set(659, 1007)
ZONE_MAP.set(661, 1007)
ZONE_MAP.set(662, 1007)

const CLASS_MAP = new Map()
CLASS_MAP.set(2, 'Druid')
CLASS_MAP.set(3, 'Hunter')
CLASS_MAP.set(4, 'Mage')
CLASS_MAP.set(6, 'Paladin')
CLASS_MAP.set(7, 'Priest')
CLASS_MAP.set(8, 'Rogue')
CLASS_MAP.set(9, 'Shaman')
CLASS_MAP.set(10, 'Warlock')
CLASS_MAP.set(11, 'Warrior')

const COLOR_MAP = new Map()
COLOR_MAP.set('Druid', '#FF7D0A')
COLOR_MAP.set('Hunter', '#ABD473')
COLOR_MAP.set('Mage', '#69CCF0')
COLOR_MAP.set('Paladin', '#F58CBA')
COLOR_MAP.set('Priest', '#FFFFFF')
COLOR_MAP.set('Rogue', '#FFF569')
COLOR_MAP.set('Shaman', '#0070DE')
COLOR_MAP.set('Warlock', '#9482C9')
COLOR_MAP.set('Warrior', '#C79C6E')

const ZONE_NAME_MAP = new Map()
ZONE_NAME_MAP.set(1007, 'Kara')
ZONE_NAME_MAP.set(1008, 'GruulMag')

const US_SERVERS = ['atiesh', 'arugal', 'bloodsail-buccaneers', 'faerlina', 'fairbanks', 'grobbulus', 'herod', 'mankrik', 'myzrael', 'pagle', 'remulos', 'thalnos', 'whitemane', 'stalagg', 'blaumeux', 'skeram', 'incendius', 'bigglesworth', 'old-blanchy', 'westfall', 'kurinnaxx', 'kromcrush', 'deviate-delight', 'smolderweb', 'sulfuras', 'ashkandi', 'kirtonos', 'rattlegore', 'felstriker', 'yojamba', 'thunderfury', 'benediction', 'azuresong', 'windseeker', 'anathema', 'netherwind', 'earthfury', 'heartseeker', 'arcanite-reaper', 'loatheb', 'sulthraze']
const EU_SERVERS = ['golemagg', 'hydraxian-waterlords', 'mirage-raceway', 'pyrewood-village', 'shazzrah', 'zandalar-tribe', 'auberdine', 'sulfuron', 'everlook', 'lucifron', 'chromie', 'flamegor', 'gehennas', 'firemaw', 'flamelash', 'gandling', 'mograine', 'nethergarde-keep', 'razorgore', 'stonespine', 'noggenfogger', 'amnennar', 'ashbringer', 'dreadmist', 'skullflame', 'ten-storms', 'dragons-call', 'lakeshire', 'transcendence', 'finkle', 'bloodfang', 'judgement', 'earthshaker', 'venoxis', 'wyrmthalak', 'rhokdelar', 'razorfen', 'patchwerk', 'heartstriker', 'mandokir', 'harbinger-of-doom', 'dragonfang', 'celebras']

const staticVars = {}
staticVars.getServersUs = function getServersUs () { return US_SERVERS.sort() }
staticVars.getServersEu = function getServersEu () { return EU_SERVERS.sort() }
staticVars.getZoneMap = function getZoneMap () { return ZONE_MAP }
staticVars.getBossMap = function getBossMap () { return ENCOUNTER_MAP }
staticVars.getClassMap = function getClassMap () { return CLASS_MAP }
staticVars.getZoneNameMap = function getZoneNameMap () { return ZONE_NAME_MAP }
staticVars.getColorMap = function getColorMap () { return COLOR_MAP }

module.exports = staticVars
