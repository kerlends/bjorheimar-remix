#!/bin/bash

STORES=(104 110 112)

for store in ${STORES[@]}
do
  curl -X POST "https://bjor.konrade.tech/store/$store/sync"
  echo "Sync for store $store completed"
done