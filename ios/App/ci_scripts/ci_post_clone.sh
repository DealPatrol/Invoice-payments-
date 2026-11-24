#!/bin/sh
# Xcode Cloud (included with the Apple Developer Program: 25 compute hours/month).
# Installs the npm packages that the Swift Package Manager project points at
# (node_modules/@capacitor/*) and runs `cap sync ios`, which writes capacitor.config.json
# and copies the offline shell (ios-shell/) into App/public before Xcode resolves packages.
# The signed-in app itself is served from production, so no Next.js build is needed here.
set -eu
cd "$CI_PRIMARY_REPOSITORY_PATH"
if ! command -v node >/dev/null 2>&1; then
  export HOMEBREW_NO_AUTO_UPDATE=1 HOMEBREW_NO_INSTALL_CLEANUP=1
  brew install node@24
  export PATH="$(brew --prefix node@24)/bin:$PATH"
fi
node -v
npm ci
npx cap sync ios
