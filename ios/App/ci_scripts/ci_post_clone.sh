#!/bin/sh
# Xcode Cloud post-clone step for Invoice Jot.
# 1. Installs the npm packages the Swift Package Manager project points at (node_modules/@capacitor/*).
# 2. Builds the local-first app bundle (Vite -> mobile/dist). Nothing is loaded from a server.
# 3. `cap sync ios` copies mobile/dist into App/public and writes capacitor.config.json
#    before Xcode resolves packages and archives.
set -eu
cd "$CI_PRIMARY_REPOSITORY_PATH"
if ! command -v node >/dev/null 2>&1; then
  export HOMEBREW_NO_AUTO_UPDATE=1 HOMEBREW_NO_INSTALL_CLEANUP=1
  brew install node@24
  export PATH="$(brew --prefix node@24)/bin:$PATH"
fi
node -v
npm ci
npm run mobile:build
test -f mobile/dist/index.html
npx cap sync ios
