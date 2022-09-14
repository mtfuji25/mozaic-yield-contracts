// deploys router and connects the three primary contracts of Stargate onto one chain
// this deploy file does not connect these contracts to other contracts.
module.exports = async ({ ethers, getNamedAccounts, deployments }) => {
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()
    const MONTH = 60 * 60 * 24 * 30;

    await deploy("WETH9", {
        from: deployer,
        log: true,
        skipIfAlreadyDeployed: true,
        waitConfirmations: 1,
    })
    
    await deploy("Authorizer", {
        from: deployer,
        args: [deployer],
        log: true,
        skipIfAlreadyDeployed: true,
        waitConfirmations: 1,
    })

    let weth = await ethers.getContract("WETH9")
    let authorizer = await ethers.getContract("Authorizer")

    await deploy("Vault", {
        from: deployer,
        args: [authorizer.address, weth.address, 3 * MONTH, MONTH],
        log: true,
        skipIfAlreadyDeployed: true,
        waitConfirmations: 1,
    })

    let vault = await ethers.getContract("Vault")

    await deploy("WeightedPoolFactory", {
        from: deployer,
        args: [vault.address],
        log: true,
        skipIfAlreadyDeployed: true,
        waitConfirmations: 1,
    })

    let weightedPoolFactory = await ethers.getContract("WeightedPoolFactory")

    await deploy("Router", {
        from: deployer,
        args: [weth.address, vault.address, weightedPoolFactory.address],
        log: true,
        skipIfAlreadyDeployed: true,
        waitConfirmations: 1,
    })
}

module.exports.tags = ["Router", "test"]
