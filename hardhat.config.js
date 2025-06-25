require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    // Add other networks as needed
    // sepolia: {
    //   url: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
    //   accounts: [PRIVATE_KEY]
    // }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD"
  },
  etherscan: {
    // apiKey: ETHERSCAN_API_KEY
  }
};
