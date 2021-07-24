const ENCOUNTER_MAP = new Map()
ENCOUNTER_MAP.set(649, 'High King')
ENCOUNTER_MAP.set(650, 'Gruul')
ENCOUNTER_MAP.set(651, 'Mag')
ENCOUNTER_MAP.set(652, 'Attumen')
ENCOUNTER_MAP.set(653, 'Moroes')
ENCOUNTER_MAP.set(654, 'Maiden')
ENCOUNTER_MAP.set(655, 'Opera')
ENCOUNTER_MAP.set(656, 'Curator')
ENCOUNTER_MAP.set(657, 'Illhoof')
ENCOUNTER_MAP.set(658, 'Shade')
ENCOUNTER_MAP.set(659, 'Netherspite')
ENCOUNTER_MAP.set(661, 'Prince')
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

const US_SERVERS = ['atiesh', 'arugal', 'bloodsail-buccaneers', 'faerlina', 'fairbanks', 'grobbulus', 'herod', 'mankrik', 'myzrael', 'pagle', 'remulos', 'thalnos', 'whitemane', 'stalagg', 'blaumeux', 'skeram', 'incendius', 'bigglesworth', 'old-blanchy', 'westfall', 'kurinnaxx', 'kromcrush', 'deviate-delight', 'smolderweb', 'sulfuras', 'ashkandi', 'kirtonos', 'rattlegore', 'felstriker', 'yojamba', 'thunderfury', 'benediction', 'azuresong', 'windseeker', 'anathema', 'netherwind', 'earthfury', 'heartseeker', 'arcanite-reaper', 'loatheb', 'sulthraze']
const EU_SERVERS = ['golemagg', 'hydraxian-waterlords', 'mirage-raceway', 'pyrewood-village', 'shazzrah', 'zandalar-tribe', 'auberdine', 'sulfuron', 'everlook', 'lucifron', 'chromie', 'flamegor', 'gehennas', 'firemaw', 'flamelash', 'gandling', 'mograine', 'nethergarde-keep', 'razorgore', 'stonespine', 'noggenfogger', 'amnennar', 'ashbringer', 'dreadmist', 'skullflame', 'ten-storms', 'dragons-call', 'lakeshire', 'transcendence', 'finkle', 'bloodfang', 'judgement', 'earthshaker', 'venoxis', 'wyrmthalak', 'rhokdelar', 'razorfen', 'patchwerk', 'heartstriker', 'mandokir', 'harbinger-of-doom', 'dragonfang', 'celebras']
const staticVars = {}

staticVars.getServersUs = function getServersUs () { return US_SERVERS }
staticVars.getServersEu = function getServersEu () { return EU_SERVERS }
staticVars.getZoneMap = function getZoneMap () {
  return ZONE_MAP
}

staticVars.getBossMap = function getBossMap () {
  return ENCOUNTER_MAP
}

staticVars.getClassMap = function getClassMap () {
  return CLASS_MAP
}

module.exports = staticVars
