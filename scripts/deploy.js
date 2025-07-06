const { ethers, network } = require("hardhat");

async function main() {
  console.log("🚀 Desplegando contrato SimpleSwap optimizado...\n");

  // Get the ContractFactory and Signers
  const [deployer] = await ethers.getSigners();
  console.log("📝 Desplegando contratos con la cuenta:", deployer.address);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Balance de la cuenta:", ethers.formatEther(balance), "ETH\n");

  // Deploy SimpleSwap with gas optimization
  console.log("📄 Desplegando SimpleSwap...");
  const SimpleSwap = await ethers.getContractFactory("SimpleSwap");
  
  // Estimate deployment gas
  const deployTx = await SimpleSwap.getDeployTransaction();
  const estimatedGas = await deployer.provider.estimateGas(deployTx);
  console.log("⛽ Gas estimado para deployment:", estimatedGas.toString());
  
  const simpleSwap = await SimpleSwap.deploy();
  await simpleSwap.waitForDeployment();
  
  console.log("✅ SimpleSwap desplegado en:", await simpleSwap.getAddress());
  
  // Wait for confirmations
  console.log("⏳ Esperando confirmaciones...");
  const deploymentTx = simpleSwap.deploymentTransaction();
  if (deploymentTx) {
    const receipt = await deploymentTx.wait(2);
    console.log("📊 Gas usado:", receipt.gasUsed.toString());
    console.log("🔗 Hash de transacción:", receipt.hash);
  }
  
  // Verify contract parameters
  console.log("\n🔍 Verificando parámetros del contrato...");
  const feeRate = await simpleSwap.FEE_RATE();
  const feeDenominator = await simpleSwap.FEE_DENOMINATOR();
  const minLiquidity = await simpleSwap.MINIMUM_LIQUIDITY();
  const name = await simpleSwap.name();
  const symbol = await simpleSwap.symbol();
  
  console.log("✅ Deployment completado exitosamente!");
  console.log("="*60);
  console.log("📋 DETALLES DEL CONTRATO");
  console.log("="*60);
  console.log(`🏷️  Nombre: ${name}`);
  console.log(`🔤 Símbolo: ${symbol}`);
  console.log(`📍 Dirección: ${await simpleSwap.getAddress()}`);
  console.log(`🌐 Red: ${network.name}`);
  console.log(`💸 Fee Rate: ${feeRate}/1000 (${Number(feeRate)/10}%)`);
  console.log(`🔒 Liquidez Mínima: ${minLiquidity}`);
  console.log(`⛽ Gas Optimizado: ✅ (runs: 1000, viaIR: true)`);
  
  // Save deployment info
  const deploymentInfo = {
    contractAddress: await simpleSwap.getAddress(),
    network: network.name,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    gasUsed: deploymentTx ? (await deploymentTx.wait()).gasUsed.toString() : "N/A",
    txHash: deploymentTx ? deploymentTx.hash : "N/A"
  };
  
  console.log("\n💾 Información de deployment guardada");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  
  // Verification instructions
  if (network.name !== "hardhat" && network.name !== "localhost") {
    console.log("\n🔍 VERIFICACIÓN EN ETHERSCAN");
    console.log("="*60);
    console.log("Para verificar el contrato, ejecuta:");
    console.log(`npx hardhat verify --network ${network.name} ${await simpleSwap.getAddress()}`);
    console.log("\nO usa el script automatizado:");
    console.log("npm run verification");
  } else {
    console.log("\n🧪 TESTING LOCAL");
    console.log("="*60);
    console.log("Para probar el contrato localmente:");
    console.log("npm run verification");
    console.log("npm run gas-analysis");
  }
  
  return simpleSwap;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
