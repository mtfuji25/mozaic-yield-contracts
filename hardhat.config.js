require("dotenv").config();

require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-solhint");
require("@nomiclabs/hardhat-web3");
require("hardhat-gas-reporter");
require("solidity-coverage");
require("hardhat-contract-sizer");
require("hardhat-tracer");
require("@primitivefi/hardhat-dodoc");
require("hardhat-deploy");
require("hardhat-deploy-ethers");
require("hardhat-spdx-license-identifier");

// custom helper tasks
require("./tasks/addBalancerLiquidity");
require("./tasks/sendCredits");
require("./tasks/swap");
require("./tasks/createChainPath");
require("./tasks/setWeightForChainPath");
require("./tasks/setBridge");
require("./tasks/getBridge");
require("./tasks/mintTokens");
require("./tasks/getPool");
require("./tasks/addLPStakingPool");
require("./tasks/createBalancerPool");
require("./tasks/createChainPaths");
require("./tasks/activateChainPath");
require("./tasks/activateChainPaths");
require("./tasks/deployToken");
require("./tasks/testnetSwap");
require("./tasks/verifyContracts");
require("./tasks/wireBridges");
require("./tasks/wireStargateTokens");
require("./tasks/sendStargateTokens");
require("./tasks/sendCreditsAll");
require("./tasks/getChainPath");
require("./tasks/getFeeVersion");
require("./tasks");

const getApiKey = (chain) => {
    switch (chain) {
        case "ethereum":
        case "rinkeby":
            return process.env.ETHERSCAN_API_KEY;
        case "avalanche":
        case "fuji":
            return process.env.SNOWTRACE_API_KEY;
        default:
            return "";
    }
}

const getAccounts = (chain) => {
    switch (chain) {
        case "ethereum":
            return [`0x${process.env.PRIVATE_KEY_ETHEREUM}`];
        case "rinkeby":
            return [`0x${process.env.PRIVATE_KEY_RINKEBY}`];
        case "avalanche":
            return [`0x${process.env.PRIVATE_KEY_AVALANCHE}`];
        case "fuji":
            return [`0x${process.env.PRIVATE_KEY_FUJI}`];
        default:
            return "";
    }
}

module.exports = {
    solidity: {
        version: "0.7.6",
        settings: {
            optimizer: {
                enabled: true,
                runs: 10,
            },
        },
    },
    contractSizer: {
        alphaSort: false,
        runOnCompile: true,
        disambiguatePaths: false,
    },
    namedAccounts: {
        deployer: 0,
    },
    defaultNetwork: "hardhat",
    networks: {
        ethereum: {
            url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_ETHEREUM_API_KEY}`,
            chainId: 1,
            accounts: getAccounts("ethereum"),
        },
        rinkeby: {
            url: `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_RINKEBY_API_KEY}`,
            chainId: 4,
            accounts: getAccounts("rinkeby"),
            gas: 10000000,
            gasPrice: 30000000000,
            skipDryRun: true,
            networkCheckTimeout: 100000000,
            timeoutBlocks: 200,
        },
        avalanche: {
            url: "https://api.avax.network/ext/bc/C/rpc",
            chainId: 43114,
            accounts: getAccounts("avalanche"),
        },
        fuji: {
            url: `https://api.avax-test.network/ext/bc/C/rpc`,
            chainId: 43113,
            accounts: getAccounts("fuji"),
        },
        // 'bsc-testnet': {
        //     url: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
        //     chainId: 97,
        //     accounts: accounts(),
        // },
        // mumbai: {
        //     url: "https://rpc-mumbai.maticvigil.com/",
        //     chainId: 80001,
        //     accounts: accounts(),
        // },
        // 'arbitrum-rinkeby': {
        //     url: `https://rinkeby.arbitrum.io/rpc`,
        //     chainId: 421611,
        //     accounts: accounts(),
        // },
        // 'optimism-kovan': {
        //     url: `https://kovan.optimism.io/`,
        //     chainId: 69,
        //     accounts: accounts(),
        // },
        // 'fantom-testnet': {
        //     url: `https://rpc.testnet.fantom.network/`,
        //     chainId: 4002,
        //     accounts: accounts(),
        // }
    },
    mocha: {
        timeout: 500000,
    },
    gasReporter: {
        enabled: process.env.REPORT_GAS === "true",
        currency: "USD",
    },
    etherscan: {
        apiKey: getApiKey("fuji")
    },
};
