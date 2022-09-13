const { POOLS } = require("@layerzerolabs/sg-sdk")
const { getEndpointId } = require("../utils/network")

task("createBalancerPool", "create the pools for the network").setAction(async (taskArgs) => {
    let router = await ethers.getContract("Router")
    let pools = POOLS[hre.network.name]
    // console.log(pools)
    // for(let poolId in pools){
    //     console.log(pools[poolId].info)
    //     console.log(`poolId: ${poolId}`)
    //     console.table(pools[poolId].chainPaths)
    // }

    // make sure the token exists
    
    for (let poolId in pools) {
        console.log(pools[poolId].info)
        console.log(`poolId: ${poolId}`)
        console.table(pools[poolId].chainPaths)

        let sharedDecimals = pools[poolId].info.sharedDecimals
        let address = pools[poolId].info.address

        let Token = await ethers.getContractFactory("MockToken")
        let token = await Token.attach(address)
        let Token2 = await ethers.getContractFactory("MockToken")
        let token2 = await Token2.attach(address)
        let name = await token.name()
        let symbol = await token.symbol()
        let decimals = await token.decimals()

        let poolName = `${name}-LP`
        let poolSymbol = `S*${symbol}`

        const factory = await ethers.getContract("Factory")

        try {
            let poolAddr = await router.createBalancerPool(
                    poolId, 
                    poolName, 
                    poolSymbol, 
                    [token.address, token2.address], 
                    [ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.5")], 
                    [ZERO_ADDRESS, ZERO_ADDRESS], 
                    ethers.utils.parseEther("0.001"))
            
            console.log(`[${getEndpointId()}] createBalancerPool | name:${poolName} symbol:${poolSymbol} pool address: ${poolAddr}`)
        } catch (e) {
            if (e.error.message.includes("Stargate: Pool already created")) {
                let poolAddr = await factory.getPool(poolId)
                console.log(
                    `[${getEndpointId()}] createPool | name:${name} symbol:${symbol} decimals:${decimals} address:${
                        token.address
                    } | *already created*`
                )
                console.log(`- pool.address: ${poolAddr} name: ${poolName} symbol: ${poolSymbol}`)
            }
        }
    }
})
