#!/bin/bash

# add liquidity to a local chain for a given pool id
function add_balancer_liquidity {
  N=$1
  networks=(${N//,/ })
  P=$2
  pools=(${P//,/ })
  for network in "${networks[@]}"
  do
    for poolId in "${pools[@]}"
    do
      eval "npx hardhat --network ${network} addBalancerLiquidity --pool-id ${poolId} --qty 2000000"
    done
  done
}

# usage: $ ./add_balancer_liquidity.sh rinkeby-sandbox,fuji-sandbox 1,2,2
add_liquidity $1 $2