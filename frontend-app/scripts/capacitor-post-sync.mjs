import fs from 'node:fs'
import path from 'node:path'

const frontendDir = path.resolve(new URL('..', import.meta.url).pathname)
const androidDir = path.join(frontendDir, 'android')
const cordovaDir = path.join(androidDir, 'capacitor-cordova-android-plugins')
const settingsGradlePath = path.join(androidDir, 'settings.gradle')
const appBuildGradlePath = path.join(androidDir, 'app', 'build.gradle')
const capacitorBuildGradlePath = path.join(androidDir, 'app', 'capacitor.build.gradle')
const cordovaBuildGradlePath = path.join(cordovaDir, 'build.gradle')

const readIfExists = (filePath) => (fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '')

const getBlockContent = (content, startMarker, endMarker) => {
  const pattern = new RegExp(`${startMarker}([\\s\\S]*?)${endMarker}`)
  const match = content.match(pattern)
  return match?.[1]?.trim() ?? ''
}

const listFiles = (dirPath) => {
  if (!fs.existsSync(dirPath)) return []
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) return listFiles(fullPath)
      return fullPath
    })
}

const hasUsefulFiles = (dirPath, allowedExts) =>
  listFiles(dirPath).some((filePath) => {
    const base = path.basename(filePath)
    if (base === '.gitkeep') return false
    if (allowedExts.length === 0) return true
    return allowedExts.includes(path.extname(base).toLowerCase())
  })

const cordovaProjectHasContent = () => {
  const javaDir = path.join(cordovaDir, 'src', 'main', 'java')
  const kotlinDir = path.join(cordovaDir, 'src', 'main', 'kotlin')
  const resDir = path.join(cordovaDir, 'src', 'main', 'res')
  const libsDir = path.join(cordovaDir, 'src', 'main', 'libs')
  const buildGradle = readIfExists(cordovaBuildGradlePath)
  const dependencyBlock = getBlockContent(buildGradle, 'SUB-PROJECT DEPENDENCIES START', '// SUB-PROJECT DEPENDENCIES END')
  const extensionBlock = getBlockContent(buildGradle, 'PLUGIN GRADLE EXTENSIONS START', '// PLUGIN GRADLE EXTENSIONS END')

  return (
    hasUsefulFiles(javaDir, ['.java', '.kt', '.aidl']) ||
    hasUsefulFiles(kotlinDir, ['.kt']) ||
    hasUsefulFiles(resDir, []) ||
    hasUsefulFiles(libsDir, ['.aar', '.jar']) ||
    dependencyBlock.length > 0 ||
    extensionBlock.split('\n').some((line) => {
      const trimmed = line.trim()
      return trimmed.length > 0 && trimmed !== 'apply from: "cordova.variables.gradle"'
    })
  )
}

const stripExactLine = (content, line) =>
  content
    .split('\n')
    .filter((currentLine) => currentLine.trim() !== line.trim())
    .join('\n')

const writeIfChanged = (filePath, next) => {
  const current = readIfExists(filePath)
  if (current === next) return false
  fs.writeFileSync(filePath, next)
  return true
}

const normalizeTrailingNewline = (content) => `${content.replace(/\s+$/, '')}\n`

const removeEmptyCordovaProjectWiring = () => {
  let changed = false

  const settingsGradle = readIfExists(settingsGradlePath)
  if (settingsGradle) {
    const next = normalizeTrailingNewline(
      stripExactLine(
        stripExactLine(settingsGradle, "include ':capacitor-cordova-android-plugins'"),
        "project(':capacitor-cordova-android-plugins').projectDir = new File('./capacitor-cordova-android-plugins/')",
      ),
    )
    changed = writeIfChanged(settingsGradlePath, next) || changed
  }

  const appBuildGradle = readIfExists(appBuildGradlePath)
  if (appBuildGradle) {
    const next = normalizeTrailingNewline(
      appBuildGradle.replace(/\n\s*implementation project\(':capacitor-cordova-android-plugins'\)\s*/g, '\n'),
    )
    changed = writeIfChanged(appBuildGradlePath, next) || changed
  }

  const capacitorBuildGradle = readIfExists(capacitorBuildGradlePath)
  if (capacitorBuildGradle) {
    const next = normalizeTrailingNewline(
      capacitorBuildGradle.replace(
        /\napply from: "\.\.\/capacitor-cordova-android-plugins\/cordova\.variables\.gradle"\n/g,
        '\n',
      ),
    )
    changed = writeIfChanged(capacitorBuildGradlePath, next) || changed
  }

  return changed
}

const softenCordovaGradleWhenNoLocalLibs = () => {
  const buildGradle = readIfExists(cordovaBuildGradlePath)
  if (!buildGradle) return false

  const libsDir = path.join(cordovaDir, 'src', 'main', 'libs')
  const hasLocalArchives = hasUsefulFiles(libsDir, ['.aar', '.jar'])
  if (hasLocalArchives) return false

  let next = buildGradle
  next = next.replace(/\nrepositories \{[\s\S]*?\n\}/m, '\nrepositories {\n    google()\n    mavenCentral()\n}')
  next = next.replace(/\n\s*implementation fileTree\(dir: 'src\/main\/libs', include: \['\*\.jar'\]\)/, '')
  next = normalizeTrailingNewline(next)
  return writeIfChanged(cordovaBuildGradlePath, next)
}

const hasCordovaContent = cordovaProjectHasContent()
const results = {
  cordovaProjectHasContent: hasCordovaContent,
  removedEmptyCordovaProjectWiring: false,
  softenedCordovaGradle: false,
}

if (!hasCordovaContent) {
  results.removedEmptyCordovaProjectWiring = removeEmptyCordovaProjectWiring()
}

results.softenedCordovaGradle = softenCordovaGradleWhenNoLocalLibs()

console.log(JSON.stringify(results, null, 2))
