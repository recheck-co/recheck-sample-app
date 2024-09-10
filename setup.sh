#!/bin/bash
set -e

source_nvm() {
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    return 0
}

echo "***************************************************************"
echo "* Setting up recheck-sample-app"
echo "* Docs at https://recheck.co/developer/"
echo "***************************************************************"

# create .env if missing
echo -e "\n=> Creating .env"
if [[ ! -f .env ]]; then
    cp .env.template .env
    echo "Copied from .env.template"
else
    echo "Already exists"
fi

# install Node Version Manager (nvm), https://github.com/nvm-sh/nvm
source_nvm
echo -e "\n=> Checking for Node Version Manager (nvm)"
if ! nvm --version > /dev/null 2>&1; then
  read -p "nvm not found. Would you like to install it? (y/n) " -n 1 -r
  echo    # move to a new line
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Installing nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    source_nvm
  else
    exit 1
  fi
else
  echo "Found nvm version $(nvm --version)"
fi

# install Node.js
echo -e "\n=> Installing Node.js"
nvm use 20 || nvm install 20


echo -e "\n=> Installing npm packages"
npm install --no-fund --no-audit

echo -e "\nSetup complete!"
