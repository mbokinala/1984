# ~/.local/screencap-agent/screencap.sh
#!/bin/bash
set -euo pipefail

# ---- Config via env or defaults ----
INTERVAL="${INTERVAL_SECONDS:-60}"                  # how often, seconds
OUTDIR="${OUT_DIR:-$HOME/Pictures/Screencaps}"     # where to save
BASENAME_PREFIX="${BASENAME_PREFIX:-cap}"          # filename prefix
ALL_DISPLAYS="${ALL_DISPLAYS:-0}"                  # 1 = capture each display separately

mkdir -p "$OUTDIR"

timestamp() { date +"%Y-%m-%d_%H-%M-%S"; }

capture_once() {
  local ts fname
  ts="$(timestamp)"

  if [[ "$ALL_DISPLAYS" == "1" ]]; then
    # Count attached displays heuristically (numbered from 1)
    local n
    n="$(/usr/sbin/system_profiler SPDisplaysDataType 2>/dev/null | awk '/Resolution/{c++} END{print c+0}')"
    (( n < 1 )) && n=1
    for (( d=1; d<=n; d++ )); do
      fname="$OUTDIR/${BASENAME_PREFIX}_${ts}_D${d}.png"
      /usr/sbin/screencapture -x -t png -D "$d" "$fname"
    done
  else
    fname="$OUTDIR/${BASENAME_PREFIX}_${ts}.png"
    /usr/sbin/screencapture -x -t png "$fname"
  fi
}

# Best practice for launchd: do exactly one unit of work and exit
capture_once