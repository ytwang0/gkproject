#!/bin/bash
set -euo pipefail

# systemd oneshot units do not set HOME; git and ssh need it.
export HOME="${HOME:-/root}"

APP_DIR=/home/gkproject
BRANCH=main
REMOTE=origin
SERVICE=springboot-prototype
JAVA_HOME=/usr/lib/jvm/java-17-openjdk
MVN=/opt/maven/bin/mvn
LOCK=/var/lock/gkproject-deploy.lock
STATE_DIR=/var/lib/gkproject
DEPLOYED_FILE="$STATE_DIR/deployed-sha"
JAR="$APP_DIR/target/web-prototype-0.1.0.jar"
HEALTH_URL=http://127.0.0.1:8081/api/health

FORCE=0
if [ "${1:-}" = "--force" ]; then
  FORCE=1
fi

mkdir -p "$STATE_DIR"
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "$(date '+%Y-%m-%d %H:%M:%S %z') another deploy is already running"
  exit 0
fi

log() { echo "$(date '+%Y-%m-%d %H:%M:%S %z') $*"; }

cd "$APP_DIR"
if ! git config --global --get-all safe.directory 2>/dev/null | grep -qx "$APP_DIR"; then
  git config --global --add safe.directory "$APP_DIR"
fi

log "fetching $REMOTE"
git fetch --prune "$REMOTE"

LOCAL=$(git rev-parse HEAD)
REMOTE_SHA=$(git rev-parse "$REMOTE/$BRANCH")
DEPLOYED=$(cat "$DEPLOYED_FILE" 2>/dev/null || echo none)

if [ "$FORCE" -eq 0 ] && [ "$REMOTE_SHA" = "$DEPLOYED" ]; then
  log "already deployed $DEPLOYED"
  exit 0
fi

if [ "$LOCAL" != "$REMOTE_SHA" ]; then
  log "updating source $LOCAL -> $REMOTE_SHA"
  git checkout -B "$BRANCH" "$REMOTE/$BRANCH"
  git reset --hard "$REMOTE/$BRANCH"
  git clean -fd -e target
else
  log "source already at $REMOTE_SHA, redeploying"
fi

export JAVA_HOME
export PATH="$JAVA_HOME/bin:${PATH}"
log "building"
"$MVN" -s "$APP_DIR/settings.xml" -B package -DskipTests

if [ ! -f "$JAR" ]; then
  log "ERROR: jar missing: $JAR"
  exit 1
fi

if [ -f "$APP_DIR/scripts/deploy.sh" ]; then
  install -m 755 "$APP_DIR/scripts/deploy.sh" /usr/local/bin/gkproject-deploy
fi
if [ -f "$APP_DIR/deploy/gkproject-deploy.service" ]; then
  install -m 644 "$APP_DIR/deploy/gkproject-deploy.service" /etc/systemd/system/gkproject-deploy.service
  install -m 644 "$APP_DIR/deploy/gkproject-deploy.timer" /etc/systemd/system/gkproject-deploy.timer
  systemctl daemon-reload
fi

log "restarting $SERVICE"
systemctl restart "$SERVICE"

for i in $(seq 1 30); do
  if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
    echo "$REMOTE_SHA" > "$DEPLOYED_FILE"
    log "deployed $REMOTE_SHA, health ok after ${i}s"
    systemctl is-active --quiet "$SERVICE"
    exit 0
  fi
  sleep 1
done

log "ERROR: health check failed after restart"
systemctl --no-pager --lines=30 status "$SERVICE" || true
exit 1
