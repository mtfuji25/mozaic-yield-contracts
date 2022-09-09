// deploys router and connects the three primary contracts of Stargate onto one chain
// this deploy file does not connect these contracts to other contracts.
module.exports = async ({ ethers, getNamedAccounts, deployments }) => {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    let weth = await ethers.getContract("WETH9")
    let vault = await ethers.getContract("Vault")
    let weightedPoolFactory = await ethers.getContract("WeightedPoolFactory")

    await deploy("Router", weth.address, vault.address, weightedPoolFactory.address, {
        from: deployer,
        log: true,
        skipIfAlreadyDeployed: true,
        waitConfirmations: 1,
    })
}

module.exports.tags = ["Router", "test"]
