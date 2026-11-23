#!/usr/bin/env bash
set -e
API_URL="${1:-http://localhost:4000}"

echo "1) Requesting captcha..."
CAP_RES=$(curl -s -X POST "$API_URL/captcha/challenge" -H "User-Agent: Mozilla/5.0 GikwebTestClient/1.0")
echo "$CAP_RES"
CAP_ID=$(echo "$CAP_RES" | node -e "const d = JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.captchaId);")
QUESTION=$(echo "$CAP_RES" | node -e "const d = JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.question);")
NUMS=$(echo "$QUESTION" | grep -oE '[0-9]+' | tr '\n' ' ')
A=$(echo "$NUMS" | awk '{print $1}')
B=$(echo "$NUMS" | awk '{print $2}')
ANS=$((A + B))

echo "2) Requesting OTP with captcha answer $ANS..."
OTP_RES=$(curl -s -X POST "$API_URL/auth/request-otp" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 GikwebTestClient/1.0" \
  -d "{\"phone\":\"09123456789\",\"captchaId\":\"$CAP_ID\",\"captchaAnswer\":\"$ANS\"}")
echo "$OTP_RES"
DEV_OTP=$(echo "$OTP_RES" | node -e "const d = JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.devOtp || '');")

if [ -n "$DEV_OTP" ]; then
  echo "3) Verifying OTP $DEV_OTP..."
  VER_RES=$(curl -s -X POST "$API_URL/auth/verify-otp" \
    -H "Content-Type: application/json" \
    -H "User-Agent: Mozilla/5.0 GikwebTestClient/1.0" \
    -d "{\"phone\":\"09123456789\",\"otp\":\"$DEV_OTP\"}")
  echo "$VER_RES"
  USER_ID=$(echo "$VER_RES" | node -e "const d = JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.userId || 'test-user');")

  echo "4) Creating cart order..."
  curl -s -X POST "$API_URL/orders" \
    -H "Content-Type: application/json" \
    -H "User-Agent: Mozilla/5.0 GikwebTestClient/1.0" \
    -d "{\"userId\":\"$USER_ID\",\"totalAmountRial\":180000000,\"gatewayCode\":\"GATEWAY_A\",\"items\":[{\"id\":\"ui-fintech\"}]}"
  echo ""
fi
