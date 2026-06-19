#!/usr/bin/env bash
#
# PriceHunt AU — portable Linux installer
# ---------------------------------------
# Installs and runs the app as a systemd service on ANY Linux server.
# Distro-agnostic: detects apt / dnf / yum / pacman / zypper.
#
# Usage (run from the project folder, as a sudo-capable user):
#   chmod +x install.sh
#   sudo ./install.sh
#
# Options (env vars or flags):
#   --app-dir DIR     Install location              (default: /opt/pricehunt-au)
#   --port N          Listen port                   (default: 8001)
#   --user NAME       Service user                  (default: invoking user)
#   --node-major N    Node.js major to install      (default: 20)
#   --no-build        Skip npm install/build (use a prebuilt .next/standalone)
#   -h | --help       Show this help
#
set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
APP_NAME="pricehunt-au"
APP_DIR="${APP_DIR:-/opt/pricehunt-au}"
APP_PORT="${APP_PORT:-8001}"
SERVICE_USER="${SERVICE_USER:-${SUDO_USER:-$(id -un)}}"
NODE_MAJOR="${NODE_MAJOR:-20}"
DO_BUILD=1

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Parse args ────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --app-dir)    APP_DIR="$2"; shift 2 ;;
    --port)       APP_PORT="$2"; shift 2 ;;
    --user)       SERVICE_USER="$2"; shift 2 ;;
    --node-major) NODE_MAJOR="$2"; shift 2 ;;
    --no-build)   DO_BUILD=0; shift ;;
    -h|--help)    grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

# ── Helpers ───────────────────────────────────────────────────────────────────
log()  { printf '\033[1;36m[install]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

need_root() {
  if [[ $EUID -ne 0 ]]; then
    die "Please run with sudo:  sudo ./install.sh"
  fi
}

detect_pkg() {
  for m in apt-get dnf yum pacman zypper; do
    if command -v "$m" >/dev/null 2>&1; then echo "$m"; return; fi
  done
  echo "none"
}

pkg_install() {
  local mgr="$1"; shift
  case "$mgr" in
    apt-get) DEBIAN_FRONTEND=noninteractive apt-get install -y "$@" ;;
    dnf)     dnf install -y "$@" ;;
    yum)     yum install -y "$@" ;;
    pacman)  pacman -Sy --noconfirm "$@" ;;
    zypper)  zypper install -y "$@" ;;
    *)       die "No supported package manager found. Install ${*} manually." ;;
  esac
}

install_node() {
  local mgr="$1"
  if command -v node >/dev/null 2>&1; then
    local cur; cur="$(node -v | sed 's/^v\([0-9]*\).*/\1/')"
    if [[ "$cur" -ge 18 ]]; then
      log "Node.js $(node -v) already present — skipping install."
      return
    fi
    warn "Node.js $(node -v) is too old (need >= 18). Installing Node ${NODE_MAJOR}."
  else
    log "Node.js not found. Installing Node ${NODE_MAJOR}."
  fi

  case "$mgr" in
    apt-get)
      pkg_install "$mgr" ca-certificates curl gnupg
      curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
      pkg_install "$mgr" nodejs
      ;;
    dnf|yum)
      curl -fsSL "https://rpm.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
      pkg_install "$mgr" nodejs
      ;;
    pacman)
      pkg_install "$mgr" nodejs npm
      ;;
    zypper)
      pkg_install "$mgr" nodejs npm || die "Install Node ${NODE_MAJOR} manually on this system."
      ;;
    *)
      die "Cannot auto-install Node. Install Node >= 18 then re-run with --no-build skipped."
      ;;
  esac
  log "Installed Node.js $(node -v)"
}

# ── 0. Preconditions ──────────────────────────────────────────────────────────
need_root
[[ -f "$SRC_DIR/package.json" ]] || die "Run this from the project folder (package.json not found in $SRC_DIR)."

PKG_MGR="$(detect_pkg)"
log "Distro package manager: ${PKG_MGR}"
log "Service user:           ${SERVICE_USER}"
log "Install dir:            ${APP_DIR}"
log "Port:                   ${APP_PORT}"

id "$SERVICE_USER" >/dev/null 2>&1 || die "User '$SERVICE_USER' does not exist. Pass --user <name>."

# ── 1. Dependencies ───────────────────────────────────────────────────────────
log "[1/5] Ensuring base tools (curl, tar) ..."
command -v curl >/dev/null 2>&1 || pkg_install "$PKG_MGR" curl
command -v tar  >/dev/null 2>&1 || pkg_install "$PKG_MGR" tar

log "[2/5] Ensuring Node.js >= 18 ..."
install_node "$PKG_MGR"

# ── 2. Build (unless --no-build) ──────────────────────────────────────────────
if [[ "$DO_BUILD" -eq 1 ]]; then
  log "[3/5] Installing deps & building (standalone) ..."
  pushd "$SRC_DIR" >/dev/null
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
  NODE_ENV=production npm run build
  popd >/dev/null
else
  log "[3/5] --no-build: using existing .next/standalone"
fi

[[ -d "$SRC_DIR/.next/standalone" ]] || die "Missing .next/standalone — build did not produce a standalone output. Check next.config (output: 'standalone')."

# ── 3. Assemble the deployable tree ───────────────────────────────────────────
log "[4/5] Installing files to ${APP_DIR} ..."
mkdir -p "$APP_DIR"

# Next.js standalone needs static + public copied alongside server.js
cp -a "$SRC_DIR/.next/standalone/." "$APP_DIR/"
mkdir -p "$APP_DIR/.next"
cp -a "$SRC_DIR/.next/static" "$APP_DIR/.next/static"
[[ -d "$SRC_DIR/public" ]] && cp -a "$SRC_DIR/public" "$APP_DIR/public" || true

chown -R "$SERVICE_USER":"$SERVICE_USER" "$APP_DIR"

# ── 4. systemd service ────────────────────────────────────────────────────────
log "[5/5] Writing systemd unit ..."
NODE_BIN="$(command -v node)"
cat > "/etc/systemd/system/${APP_NAME}.service" <<UNIT
[Unit]
Description=PriceHunt AU — Baby Price Comparison
After=network.target

[Service]
Type=simple
User=${SERVICE_USER}
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=PORT=${APP_PORT}
Environment=HOSTNAME=0.0.0.0
ExecStart=${NODE_BIN} ${APP_DIR}/server.js
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable "$APP_NAME"
systemctl restart "$APP_NAME"

# ── 5. Health check ───────────────────────────────────────────────────────────
sleep 3
if curl -sf -o /dev/null -w '%{http_code}' "http://localhost:${APP_PORT}/" | grep -q '200'; then
  STATUS="OK"
else
  STATUS="check logs"
fi

IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
echo
log "Done. Service status: ${STATUS}"
echo "  URL:     http://${IP:-localhost}:${APP_PORT}"
echo "  Logs:    sudo journalctl -u ${APP_NAME} -f"
echo "  Restart: sudo systemctl restart ${APP_NAME}"
echo "  Status:  sudo systemctl status ${APP_NAME}"
