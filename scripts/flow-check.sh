#!/usr/bin/env bash
# Dev helper: exercises the full demo flow against a running server via the REST API.
set -euo pipefail
B=${BASE_URL:-http://localhost:3000}
T=$(mktemp -d)
U=$T/u.jar; V=$T/v.jar
j() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const {data,error}=JSON.parse(s);console.log(eval(process.argv[1]))})' "$1"; }
curl -sf -c $U -X POST $B/api/auth/demo -H 'content-type: application/json' -d '{"persona":"user"}' >/dev/null
curl -sf -c $V -X POST $B/api/auth/demo -H 'content-type: application/json' -d '{"persona":"volunteer"}' >/dev/null
CAT=$(curl -sf $B/api/categories | j 'data.find(c=>c.slug==="medicine").id')
LOC=$(curl -sf $B/api/locations | j 'data.find(c=>c.slug==="toshkent").id')
RID=$(curl -s -b $U -X POST $B/api/requests -H 'content-type: application/json' -d "{\"title\":\"Bemor onaxonga zudlik bilan dori kerak\",\"description\":\"Chilonzordagi 80 yoshli onaxonga yurak dorisi tugab qoldi, yaqin dorixonadan olib kelib berish kerak.\",\"categoryId\":\"$CAT\",\"urgency\":\"CRITICAL\",\"address\":\"Chilonzor 9-mavze, 12-uy\",\"locationId\":\"$LOC\",\"latitude\":41.285,\"longitude\":69.204,\"contactPreferences\":[\"CHAT\",\"PHONE\"],\"contactPhone\":\"+998 90 123 45 67\",\"peopleCount\":1,\"estimatedHours\":1,\"imageIds\":[]}" | j 'data.id')
echo "created $RID"
curl -sf -b $U $B/api/requests/$RID | j 'data.status + " | " + data.matches.map(m=>m.name+":"+m.score).join(", ")'
curl -sf -b $V $B/api/requests/matches | j 'data.filter(r=>r.id==="'$RID'").map(r=>"volunteer sees match "+r.matchScore+"%").join("") || "NOT MATCHED"'
curl -sf -b $V -X POST $B/api/requests/$RID/accept -H 'content-type: application/json' -d '{}' | j 'data.status'
curl -s -b $V -X POST $B/api/requests/$RID/accept -H 'content-type: application/json' -d '{}' | j 'JSON.stringify(error)'
curl -sf -b $V -X POST $B/api/requests/$RID/start -H 'content-type: application/json' -d '{}' | j 'data.status'
CID=$(curl -sf -b $V $B/api/requests/$RID | j 'data.conversationId')
curl -sf -b $V -X POST $B/api/conversations/$CID/messages -H 'content-type: application/json' -d '{"body":"Assalomu alaykum! 15 daqiqada yetib boraman."}' | j '"message " + data.id'
curl -sf -b $U $B/api/conversations/$CID/messages | j '"user sees " + data.messages.length + " message(s)"'
curl -sf -b $V -X POST $B/api/requests/$RID/complete -H 'content-type: application/json' -d '{"hoursSpent":1.5,"note":"Dorilar yetkazildi"}' >/dev/null && echo "completion requested"
curl -sf -b $U -X POST $B/api/requests/$RID/confirm -H 'content-type: application/json' -d '{}' | j 'JSON.stringify(data)'
curl -sf -b $U -X POST $B/api/requests/$RID/review -H 'content-type: application/json' -d '{"rating":5,"comment":"Katta rahmat!"}' | j '"review " + data.rating'
curl -sf -b $V $B/api/notifications | j '"volunteer notifications: " + data.items.slice(0,4).map(n=>n.type).join(",")'
curl -sf $B/api/stats | j '"stats: completed=" + data.stats.completedRequests + " helpedToday=" + data.stats.helpedToday + " hours=" + data.stats.volunteerHours'
rm -rf $T
