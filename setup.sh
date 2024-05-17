set -e

# create .env if missing
[[ ! -f .env ]] && cp .env.template .env

# installs NVM (Node Version Manager)
if ! command -v nvm &> /dev/null; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
fi

# load nvm in current environment
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# download and install Node.js
nvm install 20

echo "NODE: $(node -v)"
echo "NPM: $(npm -v)"

npm install
