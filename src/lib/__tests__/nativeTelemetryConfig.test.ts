import fs from 'node:fs'
import path from 'node:path'

describe('checked-in native telemetry configuration', () => {
  it('keeps Meta automatic event logging disabled until JavaScript applies the build flag', () => {
    const iosInfoPlist = fs.readFileSync(
      path.join(process.cwd(), 'ios/Domani/Info.plist'),
      'utf8',
    )
    const androidManifest = fs.readFileSync(
      path.join(process.cwd(), 'android/app/src/main/AndroidManifest.xml'),
      'utf8',
    )

    expect(iosInfoPlist).toMatch(
      /<key>FacebookAutoLogAppEventsEnabled<\/key>\s*<false\/>/,
    )
    expect(androidManifest).toMatch(
      /android:name="com\.facebook\.sdk\.AutoLogAppEventsEnabled" android:value="false"/,
    )
  })
})
