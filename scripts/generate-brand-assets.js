#!/usr/bin/env node
/* eslint-disable */

/**
 * Domani Brand Asset Generator
 *
 * Generates PNG assets for:
 * - icon.png (1024x1024) - App icon
 * - adaptive-icon.png (1024x1024) - Android adaptive icon foreground
 * - splash.png (1284x2778) - Splash screen
 *
 * Run: node scripts/generate-brand-assets.js
 *
 * Note: This script generates SVG files that need to be converted to PNG
 * using an external tool or by opening generate-assets.html in a browser.
 */

const fs = require('fs')
const path = require('path')

// Output directory
const assetsDir = path.join(__dirname, '..', 'assets')

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true })
}

// App Icon SVG (1024x1024)
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="50%" stop-color="#6d28d9"/>
      <stop offset="100%" stop-color="#5b21b6"/>
    </linearGradient>
    <linearGradient id="letterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#e9d5ff"/>
    </linearGradient>
    <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fcd34d"/>
      <stop offset="70%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </radialGradient>
    <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fcd34d" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#fcd34d" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <!-- Background with iOS rounded corners -->
  <rect x="0" y="0" width="1024" height="1024" rx="225" ry="225" fill="url(#bgGrad)"/>
  <!-- Stylized D - the horizon symbol -->
  <path d="M286 225 L286 799 L491 799 C676 799 799 676 799 512 C799 348 676 225 491 225 L286 225 Z
           M389 328 L471 328 C594 328 686 410 686 512 C686 614 594 696 471 696 L389 696 L389 328 Z"
        fill="url(#letterGrad)" fill-rule="evenodd"/>
  <!-- Sun glow -->
  <circle cx="737" cy="328" r="164" fill="url(#glowGrad)"/>
  <!-- The amber sun - tomorrow rising -->
  <circle cx="737" cy="328" r="102" fill="url(#sunGrad)"/>
  <!-- Sun highlight -->
  <circle cx="706" cy="297" r="31" fill="#fef3c7" opacity="0.6"/>
</svg>`

// Adaptive Icon SVG (1024x1024) - foreground only, transparent background
const adaptiveIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="letterGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#e9d5ff"/>
    </linearGradient>
    <radialGradient id="sunGrad2" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fcd34d"/>
      <stop offset="70%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </radialGradient>
    <radialGradient id="glowGrad2" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fcd34d" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#fcd34d" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <!-- Centered D for adaptive icon (needs margin for safe zone) -->
  <path d="M320 280 L320 744 L500 744 C660 744 768 652 768 512 C768 372 660 280 500 280 L320 280 Z
           M410 360 L485 360 C590 360 670 425 670 512 C670 599 590 664 485 664 L410 664 L410 360 Z"
        fill="url(#letterGrad2)" fill-rule="evenodd"/>
  <!-- Sun glow -->
  <circle cx="700" cy="340" r="130" fill="url(#glowGrad2)"/>
  <!-- Sun -->
  <circle cx="700" cy="340" r="85" fill="url(#sunGrad2)"/>
  <!-- Sun highlight -->
  <circle cx="675" cy="315" r="25" fill="#fef3c7" opacity="0.6"/>
</svg>`

// Splash Screen SVG (1284x2778)
const splashSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1284" height="2778" viewBox="0 0 1284 2778">
  <defs>
    <linearGradient id="splashBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#0c0f1a"/>
    </linearGradient>
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#c4b5fd"/>
      <stop offset="50%" stop-color="#a78bfa"/>
      <stop offset="100%" stop-color="#8b5cf6"/>
    </linearGradient>
    <radialGradient id="ambientGlow" cx="50%" cy="40%" r="40%">
      <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="sunGrad3" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fcd34d"/>
      <stop offset="70%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#d97706"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="1284" height="2778" fill="url(#splashBg)"/>

  <!-- Ambient glow -->
  <ellipse cx="642" cy="1200" rx="700" ry="700" fill="url(#ambientGlow)"/>

  <!-- D Monogram centered -->
  <g transform="translate(442, 1089)">
    <!-- Simplified D for splash - 400x400 -->
    <path d="M0 0 L0 400 L143 400 C272 400 357 307 357 200 C357 93 272 0 143 0 L0 0 Z
             M72 72 L129 72 C214 72 271 128 271 200 C271 272 214 328 129 328 L72 328 L72 72 Z"
          fill="url(#textGrad)" fill-rule="evenodd"/>
    <!-- Sun glow -->
    <circle cx="315" cy="72" r="80" fill="url(#ambientGlow)"/>
    <!-- Sun -->
    <circle cx="315" cy="72" r="50" fill="url(#sunGrad3)"/>
  </g>

  <!-- "domani" wordmark below -->
  <text x="642" y="1620" text-anchor="middle"
        fill="url(#textGrad)"
        font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
        font-size="100"
        font-weight="500"
        letter-spacing="4">domani</text>

  <!-- Tagline -->
  <text x="642" y="1720" text-anchor="middle"
        fill="#f59e0b"
        font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif"
        font-size="32"
        font-weight="500"
        letter-spacing="6"
        opacity="0.85">PLAN TOMORROW TONIGHT</text>
</svg>`

// Write SVG files
fs.writeFileSync(path.join(assetsDir, 'icon.svg'), iconSvg)
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.svg'), adaptiveIconSvg)
fs.writeFileSync(path.join(assetsDir, 'splash.svg'), splashSvg)

console.log('SVG assets generated in /assets folder:')
console.log('  - icon.svg (1024x1024)')
console.log('  - adaptive-icon.svg (1024x1024)')
console.log('  - splash.svg (1284x2778)')
console.log('')
console.log('To convert to PNG, you can:')
console.log('1. Open scripts/generate-assets.html in a browser and download each asset')
console.log('2. Use an online converter like svgtopng.com')
console.log('3. Use Inkscape CLI: inkscape -w 1024 -h 1024 icon.svg -o icon.png')
console.log('4. Use ImageMagick: convert -background none icon.svg icon.png')
