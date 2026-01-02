#!/bin/bash

# colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== VyOS Web UI Setup Script ===${NC}"
echo "This script prepares the management system to run the VyOS Web UI."
echo "Note: This application is designed to run on your local machine or a management server,"
echo "Connecting to the VyOS router via HTTP API."
echo ""

# 1. Check for Node.js
echo -e "${YELLOW}[*] Checking for Node.js...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}[!] Node.js is not installed.${NC}"
    echo "Please install Node.js (v18 or newer) for your operating system."
    echo "Visit: https://nodejs.org/"
    echo "Or use NVM (Node Version Manager): curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash"
    exit 1
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}[+] Node.js found: $NODE_VERSION${NC}"
fi

# 2. Check for NPM
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[!] npm is not installed.${NC}"
    exit 1
fi

# 3. Install Dependencies
echo -e "${YELLOW}[*] Installing project dependencies...${NC}"
if [ -f "package.json" ]; then
    npm install
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[+] Dependencies installed successfully.${NC}"
    else
        echo -e "${RED}[!] Failed to install dependencies.${NC}"
        exit 1
    fi
else
    echo -e "${RED}[!] package.json not found. Are you in the correct directory?${NC}"
    exit 1
fi

# 4. Success & Instructions
echo ""
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo "You can now run the application:"
echo ""
echo -e "  ${YELLOW}npm run dev${NC}    - Start development server"
echo -e "  ${YELLOW}npm run build${NC}  - Build for production"
echo ""
echo "Remember to enable the HTTP API on your VyOS router:"
echo "  set service https api keys id 'my-key' key 'my-secret'"
echo "  set service https api strict-rev-proxy-check 'disable' (if needed for CORS/Proxy)"
echo ""
