require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Lee las variables de entorno
const INFURA_API_KEY = process.env.INFURA_API_KEY || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000
      },
      viaIR: true
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      gasPrice: 35000000000, // 35 gwei
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD"
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};
