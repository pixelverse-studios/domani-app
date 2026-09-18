import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(__dirname, '../../..')
const { transformSync } = require('@babel/core')
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8')

describe('release privacy configuration', () => {
  it('removes console calls and their private arguments from production compilation', () => {
    const source = `console.log('PRIVATE_TASK', privateValue()); console['error']('SECRET_TOKEN'); const keep = 42;`
    const compile = (envName: string) =>
      transformSync(source, {
        filename: path.join(root, 'src/privacy-example.js'),
        configFile: path.join(root, 'babel.config.js'),
        envName,
      }).code
    const release = compile('production')
    expect(release).not.toMatch(/PRIVATE_TASK|SECRET_TOKEN|privateValue|console/)
    expect(release).toContain('42')
    expect(compile('development')).toContain('PRIVATE_TASK')
  })

  it('keeps native and regenerated Android backup exclusions aligned', () => {
    const plugin = require('../../../plugins/with-private-backups.cjs')
    expect(read('android/app/src/main/res/xml/domani_backup_rules.xml')).toBe(plugin.backupRules)
    expect(read('android/app/src/main/res/xml/domani_data_extraction_rules.xml')).toBe(
      plugin.extractionRules,
    )
    const manifest = read('android/app/src/main/AndroidManifest.xml')
    expect(manifest).toContain('android:allowBackup="false"')
    expect(manifest).toContain('android:fullBackupContent="@xml/domani_backup_rules"')
    expect(manifest).toContain('android:dataExtractionRules="@xml/domani_data_extraction_rules"')
    for (const domain of ['root', 'file', 'database', 'sharedpref', 'external']) {
      expect(plugin.backupRules).toContain(`domain="${domain}" path="."`)
      expect(plugin.extractionRules.match(new RegExp(`domain="${domain}"`, 'g'))).toHaveLength(2)
    }
    const config = JSON.parse(read('app.json')).expo
    expect(config.android.allowBackup).toBe(false)
    expect(config.plugins).toContain('./plugins/with-private-backups.cjs')
  })

  it('excludes iOS AsyncStorage from backup in both native and Expo configuration', () => {
    const config = JSON.parse(read('app.json')).expo
    expect(config.ios.infoPlist.RCTAsyncStorageExcludeFromBackup).toBe(true)
    expect(read('ios/Domani/Info.plist')).toMatch(
      /<key>RCTAsyncStorageExcludeFromBackup<\/key>\s*<true\/>/,
    )
  })
})
