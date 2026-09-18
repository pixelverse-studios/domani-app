/* global module, require */
/* eslint-disable @typescript-eslint/no-require-imports -- Expo config plugins run in Node CommonJS. */
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins')
const fs = require('node:fs/promises')
const path = require('node:path')

const domains = [
  'root',
  'file',
  'database',
  'sharedpref',
  'external',
  'device_root',
  'device_file',
  'device_database',
  'device_sharedpref',
]
const exclusions = domains.map((domain) => `    <exclude domain="${domain}" path="." />`).join('\n')
const backupRules = `<?xml version="1.0" encoding="utf-8"?>\n<full-backup-content>\n${exclusions}\n</full-backup-content>\n`
const extractionRules = `<?xml version="1.0" encoding="utf-8"?>\n<data-extraction-rules>\n  <cloud-backup>\n${exclusions}\n  </cloud-backup>\n  <device-transfer>\n${exclusions}\n  </device-transfer>\n</data-extraction-rules>\n`

module.exports = function withPrivateBackups(config) {
  config = withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application[0].$
    application['android:allowBackup'] = 'false'
    application['android:fullBackupContent'] = '@xml/domani_backup_rules'
    application['android:dataExtractionRules'] = '@xml/domani_data_extraction_rules'
    return config
  })
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const directory = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res/xml')
      await fs.mkdir(directory, { recursive: true })
      await fs.writeFile(path.join(directory, 'domani_backup_rules.xml'), backupRules)
      await fs.writeFile(path.join(directory, 'domani_data_extraction_rules.xml'), extractionRules)
      return config
    },
  ])
}
module.exports.backupRules = backupRules
module.exports.extractionRules = extractionRules
