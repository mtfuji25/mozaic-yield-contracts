task("addBalancerLiquidity", "add balancer liquidity")
    .addParam("poolId", "the poolId")
    .addVariadicPositionalParam("tokenAddresses", "the array of token addresses to add")
    .addVariadicPositionalParam("maxAmountsIn", "the array of max amounts in")
    .addVariadicPositionalParam("joinAmounts", "the array of join amounts")
    .addVariadicPositionalParam("dueProtocolFeeAmounts", "the array of due protocol fee amounts")
    .setAction(async (taskArgs, hre) => {
        let [, admin, creator, lp, relayer] = await ethers.getSigners()

        // const WETH = await TokensDeployer.deployToken({ symbol: 'WETH' });

        // authorizer = await deploy('TimelockAuthorizer', { args: [admin.address, ZERO_ADDRESS, MONTH] });
        // vault = await deploy('Vault', { args: [authorizer.address, WETH.address, MONTH, MONTH] });
        // feesCollector = await deployedAt('ProtocolFeesCollector', await vault.getProtocolFeesCollector());

        // const action = await actionId(feesCollector, 'setSwapFeePercentage');
        // await authorizer.connect(admin).grantPermissions([action], admin.address, [ANY_ADDRESS]);
        // await feesCollector.connect(admin).setSwapFeePercentage(fp(0.1));

        // allTokens = await TokenList.create(['DAI', 'MKR', 'SNX', 'BAT'], { sorted: true });
        // await allTokens.mint({ to: [creator, lp], amount: bn(100e18) });
        // await allTokens.approve({ to: vault, from: [creator, lp] });

        // tokens = await allTokens.subset(tokenAmount);

        // await pool.registerTokens(tokens.addresses, Array(tokenAmount).fill(ZERO_ADDRESS));

        joinAmounts = taskArgs.tokenAddresses.addresses.map((_, i) => bn(1e18).mul(i + 1));
        DUE_PROTOCOL_FEE_AMOUNTS = array(0);

        // Join the Pool from the creator so that it has some tokens to pay protocol fees with
        await vault.connect(creator).joinPool(poolId, creator.address, ZERO_ADDRESS, {
            assets: tokens.addresses,
            maxAmountsIn: array(MAX_UINT256),
            fromInternalBalance: false,
            userData: encodeJoin(array(50e18), array(0)),
        });

        const joinPoolData = {
            poolId: taskArgs.poolId,
            tokenAddresses: taskArgs.tokenAddresses,
            maxAmountsIn: taskArgs.maxAmountsIn,
            fromInternalBalance: false,
            joinAmounts: taskArgs.joinAmounts,
            dueProtocolFeeAmounts: taskArgs.dueProtocolFeeAmounts,
            fromRelayer: false,
            signature: false
        };

        async function joinPool() {
            const request = {
                assets: joinPoolData.tokenAddresses,
                maxAmountsIn: joinPoolData.maxAmountsIn ?? array(MAX_UINT256),
                fromInternalBalance: joinPoolData.fromInternalBalance ?? false,
                userData: encodeJoin(joinPoolData.joinAmounts ?? joinAmounts, joinPoolData.dueProtocolFeeAmounts ?? DUE_PROTOCOL_FEE_AMOUNTS),
            };

            const args = [joinPoolData.poolId, lp.address, ZERO_ADDRESS, request];
            let calldata = vault.interface.encodeFunctionData('joinPool', args);

            if (joinPoolData.signature) {
                const nonce = await vault.getNextNonce(lp.address);
                const signature = await RelayerAuthorization.signJoinAuthorization(
                    vault,
                    lp,
                    relayer.address,
                    calldata,
                    MAX_UINT256,
                    nonce
                );
                calldata = RelayerAuthorization.encodeCalldataAuthorization(calldata, MAX_UINT256, signature);
            }

            // Hardcoding a gas limit prevents (slow) gas estimation
            return (joinPoolData.fromRelayer ? relayer : lp).sendTransaction({
                to: vault.address,
                data: calldata,
                gasLimit: MAX_GAS_LIMIT,
            });
        }

        // // factory / router
        // const factory = await ethers.getContract("Factory")
        // const router = await ethers.getContract("Router")

        // // get the token from the router
        // let Pool = await ethers.getContractFactory("Pool")
        // let poolData = await factory.getPool(taskArgs.poolId) // return stg lp address
        // let pool = await Pool.attach(poolData)
        // let tokenAddr = await pool.token()
        // console.log(`${hre.network.name} > addBalancerLiquidity poolId:${taskArgs.poolId} tokenAddr: ${tokenAddr}`)

        // let MockToken = await ethers.getContractFactory("MockToken")
        // let mockToken = await MockToken.attach(tokenAddr)
        // let balance = await mockToken.balanceOf(owner.address)
        // let allowance = await mockToken.allowance(owner.address, router.address)

        // let amountInTokenDecimals = ethers.utils.parseUnits(taskArgs.qty, await mockToken.decimals())
        // console.log(`amountInTokenDecimals: ${amountInTokenDecimals}`)

        // await (await mockToken.mint(owner.address, amountInTokenDecimals)).wait(1)

        // if (balance == 0 || balance < allowance) {
        //     await (await mockToken.mint(owner.address, amountInTokenDecimals)).wait(1)
        //     balance = await mockToken.balanceOf(owner.address)
        //     console.log(`    (now) we have this much to addBalancerLiquidity: ${balance}`)
        // }

        // let t = await mockToken.approve(router.address, amountInTokenDecimals) // give stargate router approval for this qty
        // await t.wait(1)

        // let tx = await (await router.addBalancerLiquidity(taskArgs._poolId, amountInTokenDecimals, owner.address)).wait(1)
        // console.log(`💦 addBalancerLiquidity | tx: ${tx.transactionHash}`)
    })
