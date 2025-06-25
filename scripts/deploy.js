const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying SimpleSwap contract...");

  // Get the ContractFactory and Signers
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  
  const balance = await deployer.getBalance();
  console.log("Account balance:", ethers.utils.formatEther(balance));

  // Deploy SimpleSwap
  const SimpleSwap = await ethers.getContractFactory("SimpleSwap");
  const simpleSwap = await SimpleSwap.deploy();
  
  await simpleSwap.deployed();
  
  console.log("SimpleSwap contract deployed to:", simpleSwap.address);
  console.log("Contract deployment transaction hash:", simpleSwap.deployTransaction.hash);
  
  // Wait for a few confirmations
  console.log("Waiting for confirmations...");
  await simpleSwap.deployTransaction.wait(2);
  
  console.log("✅ SimpleSwap deployment completed!");
  console.log("📋 Contract Details:");
  console.log("   - Address:", simpleSwap.address);
  console.log("   - Network:", network.name);
  console.log("   - LP Token Name: SimpleSwap LP Token");
  console.log("   - LP Token Symbol: SSLP");
  console.log("   - Fee Rate: 0.3% (3/1000)");
  
  // Optional: Verify contract on Etherscan
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n🔍 To verify the contract on Etherscan, run:");
    console.log(`npx hardhat verify --network ${network.name} ${simpleSwap.address}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
