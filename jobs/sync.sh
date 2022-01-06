#!/bin/bash

STORES=(104 110 112)

curl -X POST \
  --header 'content-type: application/json' \
  --data "{\"client_id\":\"$AUTH0_CLIENT_ID\",\"client_secret\":\"${AUTH0_CLIENT_SECRET}\",\"audience\":\"${AUTH0_AUDIENCE}\",\"grant_type\":\"client_credentials\"}" \
  "https://$AUTH0_DOMAIN/oauth/token" 

for store in ${STORES[@]}
do
  # curl -X POST "https://bjor.konrade.tech/store/$store/sync"
  echo "Sync for store $store completed"
done