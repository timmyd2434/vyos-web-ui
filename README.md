# VyOS Web UI

A modern, responsive Web UI for [VyOS](https://vyos.io/) routers.

## 🏗 Architecture
This application is designed as a **Remote Management Interface**. 
- **It runs on:** Your local machine, a management server, or a Docker container.
- **It connects to:** The VyOS router via the [HTTP API](https://docs.vyos.io/en/latest/automation/vyos-api.html).

It is **not** intended to be hosted directly on the router's filesystem (though technically possible via container), to maintain the router's stateless nature and security.

## 🚀 Getting Started

### 1. Prepare your Router
Enable the HTTP API on your VyOS router:
```bash
configure
set service https api keys id 'admin' key 'your-secure-key'
# Optional: Allow cross-origin requests if needed during dev, or use the dev proxy
set service https api strict-rev-proxy-check 'disable'
commit
save
```

### 2. Install & Run (On Management Machine)

**Prerequisites:** [Node.js](https://nodejs.org/) (v16+)

```bash
# Clone the repository
git clone https://github.com/timmyd2434/VyOS_Web_UI.git
cd VyOS_Web_UI

# Using the setup script
./install.sh

# Start the application
npm run dev
```

### 3. Login
Open your browser (typically `http://localhost:5173`).
Enter your Router's URL (e.g., `https://192.168.1.1`) and the API Key you configured.

## 🛠 Features
- **Dashboard**: Real-time system metrics (CPU, RAM, Disk).
- **Interfaces**: Manage Ethernet, VLAN, and Loopback interfaces.
- **Firewall**: Visual Rule Builder.
- **Transactional Config**: Stage multiple changes and Commit/Discard/Diff them like the CLI.

## 🤝 Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
