const { expect } = require("chai")
const { ethers } = require("hardhat")
const { ZERO_ADDRESS, DAI, USDC, AVAX } = require("./util/constants")
const { deployNew, getAddr, getPoolFromFactory } = require("./util/helpers")
const {WeightedPoolEncoder} = require("@balancer-labs/balancer-js");

// const { MONTH} = require('@balancer-labs/v2-helpers/src/time')
const MONTH = 60 * 60 * 24 * 30;

const sortArr = (addr1, addr2) => {
    return addr1 > addr2 ? [addr2, addr1] : [addr1, addr2];
}

const percentArr = [
    ethers.utils.parseEther("0.5"),
    ethers.utils.parseEther("0.5")
]

describe("Router", function () {
    let owner, alice, badUser1, fakeContract, lzEndpoint, factory, router, bridge, weth, authorizer, vault, weightedPoolFactory
    let chainId, poolId, decimals, dstPoolId, dstChainId, defaultChainPathWeight
    let defaultAmountLD, defaultAmountSD, nonce

    before(async function () {
        ; ({ owner, alice, badUser1, fakeContract } = await getAddr(ethers))
        defaultAmountLD = 123
        defaultAmountSD = 123
        chainId = 1
        poolId = 11
        dstChainId = 2
        dstPoolId = 22
        decimals = 18
        nonce = 1
        defaultChainPathWeight = 1
    })

    beforeEach(async function () {
        lzEndpoint = await deployNew("LZEndpointMock", [chainId])

        weth = await deployNew("WETH9")
        authorizer = await deployNew("Authorizer", [owner.address])
        vault = await deployNew("Vault", [authorizer.address, weth.address, 3 * MONTH, MONTH])
        weightedPoolFactory = await deployNew("WeightedPoolFactory", [vault.address])
        router = await deployNew("Router", [weth.address, vault.address, weightedPoolFactory.address])
        bridge = await deployNew("Bridge", [lzEndpoint.address, router.address])
        factory = await deployNew("Factory", [router.address])

        await router.setBridgeAndFactory(bridge.address, factory.address)
    })

    it("setBridgeAndFactory() - reverts when bridge already initialized", async function () {
        weth = await deployNew("WETH9")
        authorizer = await deployNew("Authorizer", [owner.address])
        vault = await deployNew("Vault", [authorizer.address, weth.address, 3 * MONTH, MONTH])
        weightedPoolFactory = await deployNew("WeightedPoolFactory", [vault.address])
        router = await deployNew("Router", [weth.address, vault.address, weightedPoolFactory.address])
        await router.setBridgeAndFactory(fakeContract.address, fakeContract.address)
        await expect(router.setBridgeAndFactory(fakeContract.address, fakeContract.address)).to.be.revertedWith(
            "Stargate: bridge and factory already initialized"
        )
    })

    // it("setBridgeAndFactory() - reverts when factory already initialized", async function () {
    //     weth = await deployNew("WETH9")
    //     authorizer = await deployNew("Authorizer", [owner.address])
    //     vault = await deployNew("Vault", [authorizer.address, weth.address, 3 * MONTH, MONTH])
    //     weightedPoolFactory = await deployNew("WeightedPoolFactory", [vault.address])
    //     router = await deployNew("Router", [weth.address, vault.address, weightedPoolFactory.address])
    //     const factoryPositionInStorage = "0x2" // position in contract storage
    //     const setFactoryStorage = "0x0000000000000000000000000000000000000000000000000000000000000001" // sets the factory address to 0x1

    //     // set factory to 0x1
    //     await network.provider.send("hardhat_setStorageAt", [router.address, factoryPositionInStorage, setFactoryStorage])

    //     await expect(router.setBridgeAndFactory(fakeContract.address, fakeContract.address)).to.be.revertedWith(
    //         "Stargate: bridge and factory already initialized"
    //     )
    // })

    it("setBridgeAndFactory() - reverts when bridge is 0x0", async function () {
        weth = await deployNew("WETH9")
        authorizer = await deployNew("Authorizer", [owner.address])
        vault = await deployNew("Vault", [authorizer.address, weth.address, 3 * MONTH, MONTH])
        weightedPoolFactory = await deployNew("WeightedPoolFactory", [vault.address])
        router = await deployNew("Router", [weth.address, vault.address, weightedPoolFactory.address])
        await expect(router.setBridgeAndFactory(ZERO_ADDRESS, fakeContract.address)).to.be.revertedWith("Stargate: bridge cant be 0x0")
    })

    it("setBridgeAndFactory() - reverts when factory is 0x0", async function () {
        weth = await deployNew("WETH9")
        authorizer = await deployNew("Authorizer", [owner.address])
        vault = await deployNew("Vault", [authorizer.address, weth.address, 3 * MONTH, MONTH])
        weightedPoolFactory = await deployNew("WeightedPoolFactory", [vault.address])
        router = await deployNew("Router", [weth.address, vault.address, weightedPoolFactory.address])
        await expect(router.setBridgeAndFactory(fakeContract.address, ZERO_ADDRESS)).to.be.revertedWith("Stargate: factory cant be 0x0")
    })

    // -----  create balancer pool ----- //
    it("createBalancerPool() - reverts when swapFeePercentage is out of range", async function () {
        weth = await deployNew("WETH9")
        await expect(router.createBalancerPool(poolId, "pool", "BPS", [ZERO_ADDRESS, weth.address], [ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.5")], [ZERO_ADDRESS, fakeContract.address], 200)).to.be.revertedWith("BAL#203")
    })

    it("createBalancerPool() - reverts when there're less than 2 tokens", async function () {
        weth = await deployNew("WETH9")
        await expect(router.createBalancerPool(poolId, "pool", "BPS", [weth.address], [ethers.utils.parseEther("0.4"), ethers.utils.parseEther("0.6")], [ZERO_ADDRESS, fakeContract.address], ethers.utils.parseEther("0.001"))).to.be.revertedWith("BAL#200")
    })

    // -----  create balancer pool ----- //
    it("createBalancerPool() - reverts when swapFeePercentage is out of range", async function () {
        weth = await deployNew("WETH9")
        await expect(router.createBalancerPool(poolId, "pool", "BPS", [ZERO_ADDRESS, weth.address], [60, 40], [ZERO_ADDRESS, ZERO_ADDRESS], 200)).to.be.revertedWith("BAL#203")
    })

    it("createBalancerPool() - reverts when there're less than 2 tokens", async function () {
        weth = await deployNew("WETH9")
        await expect(router.createBalancerPool(poolId, "pool", "BPS", [weth.address], [60, 40], [ZERO_ADDRESS, ZERO_ADDRESS], 1000000000000)).to.be.revertedWith("BAL#200")
    })

    it("createBalancerPool() - reverts when token is 0x0", async function () {
        weth = await deployNew("WETH9")
        await expect(router.createBalancerPool(poolId, "pool", "BPS", [ZERO_ADDRESS, weth.address], [ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.5")], [ZERO_ADDRESS, fakeContract.address], ethers.utils.parseEther("0.001"))).to.be.revertedWith("BAL#309")
    })

    it("createBalancerPool() - reverts when token array is unsorted", async function () {
        weth = await deployNew("WETH9")
        await expect(router.createBalancerPool(poolId, "pool", "BPS", [weth.address, ZERO_ADDRESS], [ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.5")], [ZERO_ADDRESS, fakeContract.address], ethers.utils.parseEther("0.001"))).to.be.revertedWith("BAL#101")
    })

    it("createBalancerPool() - reverts with weight out of range", async function () {
        weth = await deployNew("WETH9")
        await expect(router.createBalancerPool(poolId, "pool", "BPS", [fakeContract.address, weth.address], [50, 50], [ZERO_ADDRESS, fakeContract.address], ethers.utils.parseEther("0.001"))).to.be.revertedWith("BAL#302")
    })


    it("swap() - reverts when refund address is 0x0", async function () {
        await expect(
            router.swap(
                chainId,
                poolId,
                dstPoolId,
                ZERO_ADDRESS,
                1,
                0,
                { dstGasForCall: 0, dstNativeAmount: 0, dstNativeAddr: "0x" },
                "0x",
                "0x"
            )
        ).to.be.revertedWith("Stargate: _refundAddress cannot be 0x0")
    })

    it("redeemRemote() - reverts when refund address is 0x0", async function () {
        const request = {
            assets: [weth.address],
            minAmountsOut: [0],
            userData: WeightedPoolEncoder.exitExactBPTInForTokensOut("0"),
            toInternalBalance: false,
        }


        await expect(
            router.removeBalancerLiquidityRemote(
                chainId,
                poolId,
                dstPoolId,
                ZERO_ADDRESS,
                1,
                0,
                "0x",
                {
                    dstGasForCall: 0,
                    dstNativeAmount: 0,
                    dstNativeAddr: "0x",
                },
                request
            )
        ).to.be.revertedWith("Stargate: _refundAddress cannot be 0x0")
    })

    it("redeemRemote() - reverts when amount LP is 0", async function () {
        const request = {
            assets: [weth.address],
            minAmountsOut: [0],
            userData: WeightedPoolEncoder.exitExactBPTInForTokensOut("0"),
            toInternalBalance: false,
        }

        await expect(
            router.removeBalancerLiquidityRemote(
                chainId,
                poolId,
                dstPoolId,
                fakeContract.address,
                0,
                0,
                "0x",
                {
                    dstGasForCall: 0,
                    dstNativeAmount: 0,
                    dstNativeAddr: "0x",
                },
                request
            )
        ).to.be.revertedWith("Stargate: not enough lp to redeemRemote")
    })

    // it("instantRedeemLocal() - reverts with 0 lp", async function () {
    //     await expect(router.instantRedeemLocal(poolId, 0, ZERO_ADDRESS)).to.revertedWith("Stargate: not enough lp to redeem")
    // })

    it("redeemLocal() - reverts when refund address is 0x0", async function () {
        const request = {
            assets: [weth.address],
            minAmountsOut: [0],
            userData: WeightedPoolEncoder.exitExactBPTInForTokensOut("0"),
            toInternalBalance: false,
        }
        await expect(
            router.removeBalancerLiquidityLocal(
                chainId,
                poolId,
                dstPoolId,
                ZERO_ADDRESS,
                1,
                '0x',
                {
                    dstGasForCall: 0,
                    dstNativeAmount: 0,
                    dstNativeAddr: "0x"
                },
                request
            )
        ).to.be.revertedWith("Stargate: _refundAddress cannot be 0x0")
    })

    it("sendCredits() - Reverts when refund address is 0x0", async function () {
        await expect(router.sendCredits(dstChainId, poolId, dstPoolId, ZERO_ADDRESS)).to.be.revertedWith(
            "Stargate: _refundAddress cannot be 0x0"
        )
    })

    it("retryRevert() - reverts when theres nothing to retry", async function () {
        await expect(router.retryRevert(dstChainId, ZERO_ADDRESS, nonce)).to.be.revertedWith("Stargate: no retry revert")
    })

    it("revertRedeemLocal() - reverts when ZERO non refund address", async function () {
        await expect(
            router.revertRedeemLocal(dstChainId, ZERO_ADDRESS, nonce, ZERO_ADDRESS, {
                dstGasForCall: 0,
                dstNativeAmount: 0,
                dstNativeAddr: "0x",
            })
        ).to.be.revertedWith("Stargate: _refundAddress cannot be 0x0")
    })

    it("revertRedeemLocal() - reverts when theres nothing to try to retry", async function () {
        await expect(
            router.revertRedeemLocal(dstChainId, ZERO_ADDRESS, nonce, alice.address, {
                dstGasForCall: 0,
                dstNativeAmount: 0,
                dstNativeAddr: "0x",
            })
        ).to.be.revertedWith("Stargate: no retry revert")
    })

    it("clearCachedSwap() - reverts when nothing to clean", async function () {
        await expect(router.clearCachedSwap(dstChainId, ZERO_ADDRESS, nonce)).to.be.revertedWith("Stargate: cache already cleared")
    })

    it("creditChainPath() - reverts when caller is not Bridge", async function () {
        await expect(router.connect(alice).creditChainPath(dstChainId, dstPoolId, poolId, { credits: 1, idealBalance: 1 })).to.be.revertedWith(
            "Bridge: caller must be Bridge."
        )
    })

    it("removeLiquitidyRemote() - reverts when caller is not Bridge", async function () {
        await expect(
            router.connect(alice).redeemLocalCheckOnRemote(chainId, ZERO_ADDRESS, nonce, poolId, dstPoolId, defaultAmountSD, ZERO_ADDRESS)
        ).to.be.revertedWith("Bridge: caller must be Bridge.")
    })

    it("redeemLocalCallback() - reverts when caller is no Bridge", async function () {
        await expect(
            router
                .connect(alice)
                .redeemLocalCallback(chainId, ZERO_ADDRESS, nonce, poolId, dstPoolId, ZERO_ADDRESS, defaultAmountSD, defaultAmountSD)
        ).to.be.revertedWith("Bridge: caller must be Bridge.")
    })

    it("redeemLocalCallback() - emits event", async function () {
        weth = await deployNew("WETH9")
        let MockToken = await ethers.getContractFactory("MockToken")
        let mockToken = await MockToken.deploy("Mock", "MCK", 18);
        const arr = sortArr(weth.address, mockToken.address)

        await router.createBalancerPool(
            dstPoolId,
            "x",
            "x*",
            arr,
            percentArr,
            arr,
            ethers.utils.parseEther("0.001")
        );

        await expect(
            callAsContract(router, bridge.address, "redeemLocalCallback(uint16,bytes,uint256,uint256,uint256,address,uint256,uint256)", [
                chainId,
                alice.address,
                nonce,
                poolId,
                dstPoolId,
                alice.address,
                defaultAmountSD,
                defaultAmountSD,
            ])
        )
            .to.emit(router, "RedeemLocalCallback")
            .withArgs(chainId, alice.address, nonce, poolId, dstPoolId, alice.address, defaultAmountSD, defaultAmountSD)
    })

    it("swapRemote() - reverts when caller is no Bridge", async function () {
        const swapObj = {
            amount: 1,
            eqFee: 2,
            eqReward: 3,
            lpFee: 4,
            protocolFee: 5,
            lkbRemove: 6,
        }
        const dstGasForCall = 1
        await expect(
            router.connect(alice).swapRemote(chainId, ZERO_ADDRESS, nonce, poolId, dstPoolId, dstGasForCall, ZERO_ADDRESS, swapObj, "0x")
        ).to.be.revertedWith("Bridge: caller must be Bridge.")
    })

    // it("createBalancerPool() - reverts with non owner", async function () {
    //     await expect(
    //         router
    //             .connect(alice)
    //             .createBalancerPool(
    //                 poolId,
    //                 "x",
    //                 "x*",
    //                 [
    //                     ZERO_ADDRESS,
    //                     fakeContract.address
    //                 ],
    //                 [
    //                     ethers.utils.parseEther("0.5"),
    //                     ethers.utils.parseEther("0.5")
    //                 ],
    //                 [
    //                     ZERO_ADDRESS,
    //                     fakeContract.address
    //                 ],
    //                 ethers.utils.parseEther("0.001")
    //             )
    //     ).to.be.revertedWith("Ownable: caller is not the owner")
    // })

    it("createChainPath() - reverts with non owner", async function () {
        await expect(router.connect(alice).createChainPath(poolId, dstChainId, dstPoolId, defaultChainPathWeight)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        )
    })

    it("setWeightForChainPath() - reverts when caller is not the dao", async function () {
        await expect(router.connect(alice).setWeightForChainPath(poolId, dstChainId, dstPoolId, defaultChainPathWeight)).to.be.revertedWith(
            "Ownable: caller is not the owner"
        )
    })

    it("setWeightForChainPath()", async function () {
        weth = await deployNew("WETH9")
        let MockToken = await ethers.getContractFactory("MockToken")
        let mockToken = await MockToken.deploy("Mock", "MCK", 18);
        const arr = sortArr(weth.address, mockToken.address)

        await router.createBalancerPool(
            poolId,
            "x",
            "x*",
            arr,
            percentArr,
            arr,
            ethers.utils.parseEther("0.001")
        );

        await router.createChainPath(poolId, dstChainId, dstPoolId, defaultChainPathWeight)
        await router.activateChainPath(poolId, dstChainId, dstPoolId)
        const pool = await getPoolFromFactory(factory, poolId)
        expect((await pool.getChainPath(dstChainId, dstPoolId)).weight).to.equal(defaultChainPathWeight)
        await router.setWeightForChainPath(poolId, dstChainId, dstPoolId, defaultChainPathWeight + 1)
        expect((await pool.getChainPath(dstChainId, dstPoolId)).weight).to.equal(defaultChainPathWeight + 1)
    })

    it("setProtocolFeeOwner() - reverts when caller is not the dao", async function () {
        await expect(router.connect(alice).setProtocolFeeOwner(alice.address)).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("setProtocolFeeOwner() - reverts when fee owner is 0x0", async function () {
        await expect(router.setProtocolFeeOwner(ZERO_ADDRESS)).to.be.revertedWith("Stargate: _owner cannot be 0x0")
    })

    it("setMintFeeOwner() - reverts when non owner", async function () {
        await expect(router.connect(alice).setMintFeeOwner(alice.address)).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("setMintFeeOwner() - reverts when fee owner is 0x0", async function () {
        await expect(router.setMintFeeOwner(ZERO_ADDRESS)).to.be.revertedWith("Stargate: _owner cannot be 0x0")
    })

    it("setFees() - reverts when caller is not the dao", async function () {
        const mintFeeBP = 1
        await expect(router.connect(alice).setFees(poolId, mintFeeBP)).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("setFeeLibrary() - reverts when non owner", async function () {
        await expect(router.connect(alice).setFeeLibrary(poolId, ZERO_ADDRESS)).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("setSwapStop() - reverts when non owner", async function () {
        await expect(router.connect(alice).setSwapStop(poolId, true)).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("setFeeLibrary() - when caller is Owner", async function () {
        weth = await deployNew("WETH9")
        let MockToken = await ethers.getContractFactory("MockToken")
        let mockToken = await MockToken.deploy("Mock", "MCK", 18);
        const arr = sortArr(weth.address, mockToken.address)

        await router.createBalancerPool(
            poolId,
            "x",
            "x*",
            arr,
            percentArr,
            arr,
            ethers.utils.parseEther("0.001")
        );

        await router.setFeeLibrary(poolId, alice.address)
    })

    it("setSwapStop() - when caller is the Owner", async function () {
        weth = await deployNew("WETH9")
        let MockToken = await ethers.getContractFactory("MockToken")
        let mockToken = await MockToken.deploy("Mock", "MCK", 18);
        const arr = sortArr(weth.address, mockToken.address)

        await router.createBalancerPool(
            poolId,
            "x",
            "x*",
            arr,
            percentArr,
            arr,
            ethers.utils.parseEther("0.001")
        );

        await router.setSwapStop(poolId, true)
    })

    it("callDelta() - anyone can call", async function () {
        weth = await deployNew("WETH9")
        let MockToken = await ethers.getContractFactory("MockToken")
        let mockToken = await MockToken.deploy("Mock", "MCK", 18);
        const arr = sortArr(weth.address, mockToken.address)

        await router.createBalancerPool(
            poolId,
            "x",
            "x*",
            arr,
            percentArr,
            arr,
            ethers.utils.parseEther("0.001")
        );

        await router.connect(alice).callDelta(poolId, true)
    })

    it("withdrawMintFee() - reverts when non owner", async function () {
        await expect(router.connect(alice).withdrawMintFee(poolId, alice.address)).to.be.revertedWith("Stargate: only mintFeeOwner")
    })

    it("withdrawMintFee()", async function () {
        weth = await deployNew("WETH9")
        let MockToken = await ethers.getContractFactory("MockToken")
        let mockToken = await MockToken.deploy("Mock", "MCK", 18);
        const arr = sortArr(weth.address, mockToken.address)

        await router.createBalancerPool(
            dstPoolId,
            "x",
            "x*",
            arr,
            percentArr,
            arr,
            ethers.utils.parseEther("0.001")
        );

        await router.setMintFeeOwner(owner.address)
        await expect(router.withdrawMintFee(poolId, alice.address)).to.not.be.revertedWith("Stargate: only mintFeeOwner")
    })

    it("withdrawProtocolFee() - reverts when non owner", async function () {
        await expect(router.connect(alice).withdrawProtocolFee(poolId, alice.address)).to.be.revertedWith("Stargate: only protocolFeeOwner")
    })

    it("withdrawProtocolFee() - reverts when non owner", async function () {
        weth = await deployNew("WETH9")
        let MockToken = await ethers.getContractFactory("MockToken")
        let mockToken = await MockToken.deploy("Mock", "MCK", 18);
        const arr = sortArr(weth.address, mockToken.address)

        await router.createBalancerPool(
            dstPoolId,
            "x",
            "x*",
            arr,
            percentArr,
            arr,
            ethers.utils.parseEther("0.001")
        );

        await router.setProtocolFeeOwner(owner.address)
        await expect(router.withdrawProtocolFee(poolId, alice.address)).to.not.be.revertedWith("Stargate: only protocolFeeOwner")
    })
})
