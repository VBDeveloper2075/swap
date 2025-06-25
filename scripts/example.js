const { ethers } = require("hardhat");

/**
 * Example script demonstrating how to interact with SimpleSwap contract
 * This script shows all the main functionalities:
 * 1. Deploy tokens and SimpleSwap
 * 2. Add liquidity
 * 3. Perform swaps
 * 4. Get price information
 * 5. Remove liquidity
 */
async function main() {
  console.log("🚀 SimpleSwap Interaction Example");
  console.log("==================================\n");

  // Get signers
  const [deployer, user1, user2] = await ethers.getSigners();
  console.log("📋 Accounts:");
  console.log("   Deployer:", deployer.address);
  console.log("   User 1:", user1.address);
  console.log("   User 2:", user2.address);
  console.log();

  // Deploy mock tokens
  console.log("📦 Deploying Mock Tokens...");
  const MockToken = await ethers.getContractFactory("MockERC20");
  const tokenA = await MockToken.deploy("USD Coin", "USDC", ethers.utils.parseEther("1000000"));
  const tokenB = await MockToken.deploy("Ethereum", "ETH", ethers.utils.parseEther("1000000"));
  
  await tokenA.deployed();
  await tokenB.deployed();
  
  console.log("   Token A (USDC):", tokenA.address);
  console.log("   Token B (ETH):", tokenB.address);
  console.log();

  // Deploy SimpleSwap
  console.log("📦 Deploying SimpleSwap...");
  const SimpleSwap = await ethers.getContractFactory("SimpleSwap");
  const simpleSwap = await SimpleSwap.deploy();
  await simpleSwap.deployed();
  
  console.log("   SimpleSwap:", simpleSwap.address);
  console.log();

  // Transfer tokens to users
  console.log("💰 Distributing Tokens...");
  await tokenA.transfer(user1.address, ethers.utils.parseEther("10000")); // 10,000 USDC
  await tokenB.transfer(user1.address, ethers.utils.parseEther("100"));   // 100 ETH
  await tokenA.transfer(user2.address, ethers.utils.parseEther("5000"));  // 5,000 USDC
  await tokenB.transfer(user2.address, ethers.utils.parseEther("50"));    // 50 ETH
  
  console.log("   User 1: 10,000 USDC, 100 ETH");
  console.log("   User 2: 5,000 USDC, 50 ETH");
  console.log();

  // Set deadline (1 hour from now)
  const deadline = Math.floor(Date.now() / 1000) + 3600;

  // ========================================
  // 1. ADD LIQUIDITY
  // ========================================
  console.log("🏊 Adding Initial Liquidity...");
  
  const liquidityAmountA = ethers.utils.parseEther("1000"); // 1,000 USDC
  const liquidityAmountB = ethers.utils.parseEther("1");    // 1 ETH (1:1000 ratio)

  // Approve tokens for User 1
  await tokenA.connect(user1).approve(simpleSwap.address, liquidityAmountA);
  await tokenB.connect(user1).approve(simpleSwap.address, liquidityAmountB);

  // Add liquidity
  const addLiquidityTx = await simpleSwap.connect(user1).addLiquidity(
    tokenA.address,
    tokenB.address,
    liquidityAmountA,
    liquidityAmountB,
    ethers.utils.parseEther("950"),  // Min USDC (5% slippage)
    ethers.utils.parseEther("0.95"), // Min ETH (5% slippage)
    user1.address,
    deadline
  );

  const addLiquidityReceipt = await addLiquidityTx.wait();
  const addLiquidityEvent = addLiquidityReceipt.events?.find(e => e.event === "LiquidityAdded");
  
  console.log("   ✅ Liquidity added:");
  console.log("      USDC added:", ethers.utils.formatEther(addLiquidityEvent.args.amountA));
  console.log("      ETH added:", ethers.utils.formatEther(addLiquidityEvent.args.amountB));
  console.log("      LP tokens received:", ethers.utils.formatEther(addLiquidityEvent.args.liquidity));
  console.log();

  // ========================================
  // 2. GET PRICE INFORMATION
  // ========================================
  console.log("💱 Getting Price Information...");
  
  const price = await simpleSwap.getPrice(tokenA.address, tokenB.address);
  console.log("   Current price (USDC per ETH):", ethers.utils.formatEther(price));
  
  const [reserveA, reserveB] = await simpleSwap.getReserves(tokenA.address, tokenB.address);
  console.log("   Pool reserves:");
  console.log("      USDC reserve:", ethers.utils.formatEther(reserveA));
  console.log("      ETH reserve:", ethers.utils.formatEther(reserveB));
  console.log();

  // ========================================
  // 3. CALCULATE SWAP AMOUNT
  // ========================================
  console.log("🧮 Calculating Swap Output...");
  
  const swapAmountIn = ethers.utils.parseEther("100"); // 100 USDC
  const expectedOut = await simpleSwap.getAmountOut(swapAmountIn, reserveA, reserveB);
  
  console.log("   Swapping 100 USDC for ETH:");
  console.log("      Expected ETH output:", ethers.utils.formatEther(expectedOut));
  console.log();

  // ========================================
  // 4. PERFORM SWAP
  // ========================================
  console.log("🔄 Performing Token Swap...");
  
  // User 2 swaps USDC for ETH
  await tokenA.connect(user2).approve(simpleSwap.address, swapAmountIn);
  
  const ethBalanceBefore = await tokenB.balanceOf(user2.address);
  
  const swapTx = await simpleSwap.connect(user2).swapExactTokensForTokens(
    swapAmountIn,
    expectedOut.mul(95).div(100), // Accept 5% slippage
    [tokenA.address, tokenB.address],
    user2.address,
    deadline
  );

  const swapReceipt = await swapTx.wait();
  const swapEvent = swapReceipt.events?.find(e => e.event === "Swap");
  
  const ethBalanceAfter = await tokenB.balanceOf(user2.address);
  const actualEthReceived = ethBalanceAfter.sub(ethBalanceBefore);
  
  console.log("   ✅ Swap completed:");
  console.log("      USDC spent:", ethers.utils.formatEther(swapEvent.args.amountIn));
  console.log("      ETH received:", ethers.utils.formatEther(actualEthReceived));
  console.log("      Swap rate:", ethers.utils.formatEther(swapEvent.args.amountIn.mul(ethers.utils.parseEther("1")).div(actualEthReceived)), "USDC per ETH");
  console.log();

  // ========================================
  // 5. CHECK UPDATED PRICES
  // ========================================
  console.log("📊 Updated Pool Information...");
  
  const newPrice = await simpleSwap.getPrice(tokenA.address, tokenB.address);
  const [newReserveA, newReserveB] = await simpleSwap.getReserves(tokenA.address, tokenB.address);
  
  console.log("   New price (USDC per ETH):", ethers.utils.formatEther(newPrice));
  console.log("   Updated reserves:");
  console.log("      USDC reserve:", ethers.utils.formatEther(newReserveA));
  console.log("      ETH reserve:", ethers.utils.formatEther(newReserveB));
  console.log();

  // ========================================
  // 6. ADD MORE LIQUIDITY
  // ========================================
  console.log("🏊 Adding More Liquidity...");
  
  const additionalAmountA = ethers.utils.parseEther("500"); // 500 USDC
  const additionalAmountB = ethers.utils.parseEther("0.5"); // 0.5 ETH
  
  await tokenA.connect(user2).approve(simpleSwap.address, additionalAmountA);
  await tokenB.connect(user2).approve(simpleSwap.address, additionalAmountB);
  
  const addLiquidity2Tx = await simpleSwap.connect(user2).addLiquidity(
    tokenA.address,
    tokenB.address,
    additionalAmountA,
    additionalAmountB,
    0, // Accept any amount
    0, // Accept any amount
    user2.address,
    deadline
  );

  const addLiquidity2Receipt = await addLiquidity2Tx.wait();
  const addLiquidity2Event = addLiquidity2Receipt.events?.find(e => e.event === "LiquidityAdded");
  
  console.log("   ✅ Additional liquidity added:");
  console.log("      USDC added:", ethers.utils.formatEther(addLiquidity2Event.args.amountA));
  console.log("      ETH added:", ethers.utils.formatEther(addLiquidity2Event.args.amountB));
  console.log("      LP tokens received:", ethers.utils.formatEther(addLiquidity2Event.args.liquidity));
  console.log();

  // ========================================
  // 7. REMOVE LIQUIDITY
  // ========================================
  console.log("🏊 Removing Liquidity...");
  
  const lpBalance = await simpleSwap.balanceOf(user1.address);
  const removeAmount = lpBalance.div(2); // Remove half of LP tokens
  
  const removeLiquidityTx = await simpleSwap.connect(user1).removeLiquidity(
    tokenA.address,
    tokenB.address,
    removeAmount,
    0, // Accept any amount
    0, // Accept any amount
    user1.address,
    deadline
  );

  const removeLiquidityReceipt = await removeLiquidityTx.wait();
  const removeLiquidityEvent = removeLiquidityReceipt.events?.find(e => e.event === "LiquidityRemoved");
  
  console.log("   ✅ Liquidity removed:");
  console.log("      USDC received:", ethers.utils.formatEther(removeLiquidityEvent.args.amountA));
  console.log("      ETH received:", ethers.utils.formatEther(removeLiquidityEvent.args.amountB));
  console.log("      LP tokens burned:", ethers.utils.formatEther(removeLiquidityEvent.args.liquidity));
  console.log();

  // ========================================
  // 8. FINAL SUMMARY
  // ========================================
  console.log("📈 Final Summary");
  console.log("================");
  
  const finalReserves = await simpleSwap.getReserves(tokenA.address, tokenB.address);
  const finalPrice = await simpleSwap.getPrice(tokenA.address, tokenB.address);
  const totalSupply = await simpleSwap.totalSupply();
  const pairsLength = await simpleSwap.getPairsLength();
  
  console.log("Final Pool State:");
  console.log("   USDC Reserve:", ethers.utils.formatEther(finalReserves[0]));
  console.log("   ETH Reserve:", ethers.utils.formatEther(finalReserves[1]));
  console.log("   Current Price:", ethers.utils.formatEther(finalPrice), "USDC per ETH");
  console.log("   Total LP Supply:", ethers.utils.formatEther(totalSupply));
  console.log("   Number of Pairs:", pairsLength.toString());
  
  console.log("\nUser LP Balances:");
  console.log("   User 1:", ethers.utils.formatEther(await simpleSwap.balanceOf(user1.address)));
  console.log("   User 2:", ethers.utils.formatEther(await simpleSwap.balanceOf(user2.address)));
  
  console.log("\n✅ SimpleSwap interaction example completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Example failed:");
    console.error(error);
    process.exit(1);
  });
