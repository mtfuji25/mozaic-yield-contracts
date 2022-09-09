let { getLayerZeroAddress } = require("../utils/layerzero");
const CONFIG = require("../constants/config.json");

task("verifyContracts", `Verify contracts deployed on networks`)
    .setAction(async (_, hre) => {

        console.log(`Verifying contracts on ${hre.network.name}...`);

        const lzAddress = getLayerZeroAddress(hre.network.name);
        let routerAddress, factoryAddress, stargateTokenAddress;

        switch (hre.network.name) {
            case "rinkeby":
                routerAddress = "0x5f68f2aE6d433f851053a72F77beE9B75D8cF486";
                factoryAddress = "0x08D8c4b91794868d40750DFF5653B66820e5F225";
                stargateTokenAddress = "0x655Ac0023d198f60e1DCB3170386EF464bDCEb51";

                // Router: https://rinkeby.etherscan.io/address/0x5f68f2aE6d433f851053a72F77beE9B75D8cF486#code
                await hre.run("verify:verify", {
                    address: routerAddress,
                    constructorArguments: [],
                    contract: "contracts/Router.sol:Router",
                });

                // Bridge: https://rinkeby.etherscan.io/address/0xBff6fa17A58fAc2B0742573Dbe595e1F2a0ce5ea#code
                await hre.run("verify:verify", {
                    address: "0xBff6fa17A58fAc2B0742573Dbe595e1F2a0ce5ea",
                    constructorArguments: [lzAddress, routerAddress],
                    contract: "contracts/Bridge.sol:Bridge",
                });

                // Factory: https://rinkeby.etherscan.io/address/0x08D8c4b91794868d40750DFF5653B66820e5F225#code
                await hre.run("verify:verify", {
                    address: factoryAddress,
                    constructorArguments: [routerAddress],
                    contract: "contracts/Factory.sol:Factory",
                });

                // StargateToken: https://rinkeby.etherscan.io/address/0x655Ac0023d198f60e1DCB3170386EF464bDCEb51#code
                await hre.run("verify:verify", {
                    address: stargateTokenAddress,
                    constructorArguments: [
                        CONFIG.stargateToken.name,
                        CONFIG.stargateToken.symbol,
                        lzAddress,
                        "10001", // CONFIG.stargateToken.mainEndpointId,
                        CONFIG.stargateToken.initialSupplyMainEndpoint],
                    contract: "contracts/StargateToken.sol:StargateToken",
                });

                // LPStaking: https://rinkeby.etherscan.io/address/0xA68af086D16148A88363AA576CE3DdE80535C7cc#code
                await hre.run("verify:verify", {
                    address: "0xA68af086D16148A88363AA576CE3DdE80535C7cc",
                    constructorArguments: [
                        stargateTokenAddress,
                        "1000000000000000000",
                        "10852965",
                        "10852966"],
                    contract: "contracts/LPStaking.sol:LPStaking",
                });

                // StargateFeeLibraryV01: https://rinkeby.etherscan.io/address/0x952c3BDa1B84644B0F8A480Ee141955bA173c547#code
                await hre.run("verify:verify", {
                    address: "0x952c3BDa1B84644B0F8A480Ee141955bA173c547",
                    constructorArguments: [factoryAddress],
                    contract: "contracts/libraries/StargateFeeLibraryV01.sol:StargateFeeLibraryV01",
                });

                // StargateFeeLibraryV02: https://rinkeby.etherscan.io/address/0x33a883E1553b1030952ea58358023fe82c53b604#code
                await hre.run("verify:verify", {
                    address: "0x33a883E1553b1030952ea58358023fe82c53b604",
                    constructorArguments: [factoryAddress],
                    contract: "contracts/libraries/StargateFeeLibraryV02.sol:StargateFeeLibraryV02",
                });
            case "fuji":
                routerAddress = "0x5f68f2aE6d433f851053a72F77beE9B75D8cF486";
                factoryAddress = "0x08D8c4b91794868d40750DFF5653B66820e5F225";
                stargateTokenAddress = "0x655Ac0023d198f60e1DCB3170386EF464bDCEb51";

                // Router: https://testnet.snowtrace.io/address/0x5f68f2aE6d433f851053a72F77beE9B75D8cF486#code
                await hre.run("verify:verify", {
                    address: routerAddress,
                    constructorArguments: [],
                    contract: "contracts/Router.sol:Router",
                });

                // Bridge: https://testnet.snowtrace.io/address/0xBff6fa17A58fAc2B0742573Dbe595e1F2a0ce5ea#code
                await hre.run("verify:verify", {
                    address: "0xBff6fa17A58fAc2B0742573Dbe595e1F2a0ce5ea",
                    constructorArguments: [lzAddress, routerAddress],
                    contract: "contracts/Bridge.sol:Bridge",
                });

                // Factory: https://testnet.snowtrace.io/address/0x08D8c4b91794868d40750DFF5653B66820e5F225#code
                await hre.run("verify:verify", {
                    address: factoryAddress,
                    constructorArguments: [routerAddress],
                    contract: "contracts/Factory.sol:Factory",
                });

                // StargateToken: https://testnet.snowtrace.io/address/0x655Ac0023d198f60e1DCB3170386EF464bDCEb51#code
                await hre.run("verify:verify", {
                    address: stargateTokenAddress,
                    constructorArguments: [
                        CONFIG.stargateToken.name,
                        CONFIG.stargateToken.symbol,
                        lzAddress,
                        "10006", // CONFIG.stargateToken.mainEndpointId,
                        CONFIG.stargateToken.initialSupplyMainEndpoint],
                    contract: "contracts/StargateToken.sol:StargateToken",
                });

                // LPStaking: https://testnet.snowtrace.io/address/0xA68af086D16148A88363AA576CE3DdE80535C7cc#code
                await hre.run("verify:verify", {
                    address: "0xA68af086D16148A88363AA576CE3DdE80535C7cc",
                    constructorArguments: [
                        stargateTokenAddress,
                        "1000000000000000000",
                        "10704695",
                        "10704696"],
                    contract: "contracts/LPStaking.sol:LPStaking",
                });

                // StargateFeeLibraryV01: https://testnet.snowtrace.io/address/0x952c3BDa1B84644B0F8A480Ee141955bA173c547#code
                await hre.run("verify:verify", {
                    address: "0x952c3BDa1B84644B0F8A480Ee141955bA173c547",
                    constructorArguments: [factoryAddress],
                    contract: "contracts/libraries/StargateFeeLibraryV01.sol:StargateFeeLibraryV01",
                });

                // StargateFeeLibraryV02: https://testnet.snowtrace.io/address/0x33a883E1553b1030952ea58358023fe82c53b604#code
                await hre.run("verify:verify", {
                    address: "0x33a883E1553b1030952ea58358023fe82c53b604",
                    constructorArguments: [factoryAddress],
                    contract: "contracts/libraries/StargateFeeLibraryV02.sol:StargateFeeLibraryV02",
                });
            default:
                break;
        }
    });