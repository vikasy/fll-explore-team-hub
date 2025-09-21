#!/bin/zsh
# test_html_network_time.sh
# Measures average total download time for all HTML files in the current directory, 100 times each.
# Usage: ./test_html_network_time.sh [--remote]
# --remote: test against https://vikasy.github.io/fllexplore instead of localhost:8000

N=100
if [[ "$1" == "--remote" ]]; then
  BASE_URL="https://vikasy.github.io/fll-explore-team-hub"
  JSON_OUT="test_html_network_time_remote.json"
else
  BASE_URL="http://localhost:8000"
  JSON_OUT="test_html_network_time_local.json"
fi

results=()
HTML_DIR="$(dirname "$0")/.."
for file in "$HTML_DIR"/*.html; do
  [ -f "$file" ] || continue
  fname=$(basename "$file")
  url="$BASE_URL/$fname"
  total=0
  echo "Testing $fname ($url) ..."
  for i in {1..$N}; do
    t=$(curl --no-keepalive -H 'Cache-Control: no-cache' -so /dev/null -w '%{time_total}\n' "$url")
    total=$(echo "$total + $t" | bc)
  done
  avg=$(echo "scale=4; $total / $N" | bc)
  # Ensure avg has leading zero if less than 1 (e.g., 0.0655 not .0655)
  if [[ $avg == .* ]]; then
    avg="0$avg"
  fi
  echo "Average total download time for $fname over $N runs: $avg seconds"
  echo "---"
  results+=("{\"file\":\"$fname\",\"url\":\"$url\",\"average_time\":$avg}")
done

# Output JSON
json_out="[${results[@]}]"
echo $json_out | sed 's/} {/}, {/g' > "$JSON_OUT"
echo "JSON results written to $JSON_OUT"
