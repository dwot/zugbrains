const fs = require('fs')

const dockerSecret = {}

dockerSecret.read = function read (secretName) {
  try {
    return fs.readFileSync(`/run/secrets/${secretName}`, 'utf8')
  } catch (err) {
    if (err.code !== 'ENOENT') {
      // console.log(`An error occurred while trying to read the secret: ${secretName}. Err: ${err}`);
    } else {
      // console.log(`Could not find the secret, probably not running in swarm mode: ${secretName}. Err: ${err}`);
    }
    return false
  }
}

module.exports = dockerSecret
