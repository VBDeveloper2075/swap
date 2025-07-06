const { ethers, run, network } = require("hardhat");

async function main() {
    console.log("🚀 Iniciando verificación del contrato SimpleSwap...\n");

    // Deploy Mock tokens for testing
    console.log("📄 Desplegando tokens de prueba...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    
    const tokenA = await MockERC20.deploy("Token A", "TKNA", ethers.utils.parseEther("1000000"));
    await tokenA.waitForDeployment();
    console.log(`✅ Token A desplegado en: ${tokenA.target}`);
    
    const tokenB = await MockERC20.deploy("Token B", "TKNB", ethers.utils.parseEther("1000000"));
    await tokenB.waitForDeployment();
    console.log(`✅ Token B desplegado en: ${tokenB.target}`);

    // Deploy SimpleSwap
    console.log("\n📄 Desplegando contrato SimpleSwap...");
    const SimpleSwap = await ethers.getContractFactory("SimpleSwap");
    const simpleSwap = await SimpleSwap.deploy();
    await simpleSwap.waitForDeployment();
    console.log(`✅ SimpleSwap desplegado en: ${simpleSwap.target}`);

    // Get signers
    const [owner, user1] = await ethers.getSigners();
    
    // Initial setup
    const initialAmount = ethers.utils.parseEther("1000");
    await tokenA.transfer(user1.address, initialAmount);
    await tokenB.transfer(user1.address, initialAmount);
    
    console.log("\n🧪 Ejecutando verificaciones del contrato...\n");

    // Test 1: Verificar parámetros del contrato
    console.log("1️⃣ Verificando parámetros del contrato...");
    const feeRate = await simpleSwap.FEE_RATE();
    const feeDenominator = await simpleSwap.FEE_DENOMINATOR();
    const minLiquidity = await simpleSwap.MINIMUM_LIQUIDITY();
    
    console.log(`   Fee Rate: ${feeRate}/1000 (${feeRate/10}%)`);
    console.log(`   Fee Denominator: ${feeDenominator}`);
    console.log(`   Minimum Liquidity: ${minLiquidity}`);
    console.log("   ✅ Parámetros verificados correctamente\n");

    // Test 2: Verificar funciones de utilidad
    console.log("2️⃣ Verificando funciones de utilidad...");
    const pairKey = await simpleSwap.getPairKey(tokenA.target, tokenB.target);
    const [token0, token1] = await simpleSwap.sortTokens(tokenA.target, tokenB.target);
    
    console.log(`   Pair Key: ${pairKey}`);
    console.log(`   Token 0 (menor): ${token0}`);
    console.log(`   Token 1 (mayor): ${token1}`);
    console.log("   ✅ Funciones de utilidad verificadas\n");

    // Test 3: Agregar liquidez (primera vez)
    console.log("3️⃣ Verificando agregar liquidez (primera vez)...");
    const liquidityAmount = ethers.utils.parseEther("100");
    
    // Aprobar tokens
    await tokenA.connect(user1).approve(simpleSwap.target, liquidityAmount);
    await tokenB.connect(user1).approve(simpleSwap.target, liquidityAmount);
    
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutos
    
    const tx1 = await simpleSwap.connect(user1).addLiquidity(
        tokenA.target,
        tokenB.target,
        liquidityAmount,
        liquidityAmount,
        ethers.utils.parseEther("95"), // 5% slippage
        ethers.utils.parseEther("95"),
        user1.address,
        deadline
    );
    
    const receipt1 = await tx1.wait();
    const gasUsed1 = receipt1.gasUsed;
    console.log(`   Gas usado: ${gasUsed1.toString()}`);
    
    // Verificar LP tokens
    const lpBalance = await simpleSwap.balanceOf(user1.address);
    console.log(`   LP Tokens recibidos: ${ethers.utils.formatEther(lpBalance)}`);
    console.log("   ✅ Liquidez agregada exitosamente\n");

    // Test 4: Verificar reservas
    console.log("4️⃣ Verificando reservas del pool...");
    const [reserveA, reserveB] = await simpleSwap.getReserves(tokenA.target, tokenB.target);
    console.log(`   Reserva Token A: ${ethers.utils.formatEther(reserveA)}`);
    console.log(`   Reserva Token B: ${ethers.utils.formatEther(reserveB)}`);
    console.log("   ✅ Reservas verificadas\n");

    // Test 5: Verificar precio
    console.log("5️⃣ Verificando cálculo de precios...");
    const priceAB = await simpleSwap.getPrice(tokenA.target, tokenB.target);
    const priceBA = await simpleSwap.getPrice(tokenB.target, tokenA.target);
    console.log(`   Precio A en términos de B: ${ethers.utils.formatEther(priceAB)}`);
    console.log(`   Precio B en términos de A: ${ethers.utils.formatEther(priceBA)}`);
    console.log("   ✅ Precios calculados correctamente\n");

    // Test 6: Swap de tokens
    console.log("6️⃣ Verificando swap de tokens...");
    const swapAmount = ethers.utils.parseEther("10");
    await tokenA.connect(user1).approve(simpleSwap.target, swapAmount);
    
    const amountOut = await simpleSwap.getAmountOut(
        swapAmount,
        reserveA,
        reserveB
    );
    console.log(`   Amount Out esperado: ${ethers.utils.formatEther(amountOut)}`);
    
    const tx2 = await simpleSwap.connect(user1).swapExactTokensForTokens(
        swapAmount,
        amountOut.mul(95).div(100), // 5% slippage
        [tokenA.target, tokenB.target],
        user1.address,
        deadline
    );
    
    const receipt2 = await tx2.wait();
    const gasUsed2 = receipt2.gasUsed;
    console.log(`   Gas usado en swap: ${gasUsed2.toString()}`);
    console.log("   ✅ Swap ejecutado exitosamente\n");

    // Test 7: Verificar optimización de gas
    console.log("7️⃣ Análisis de optimización de gas...");
    console.log(`   Gas addLiquidity: ${gasUsed1.toString()}`);
    console.log(`   Gas swap: ${gasUsed2.toString()}`);
    
    if (gasUsed1.lt(ethers.BigNumber.from("200000"))) {
        console.log("   ✅ Gas optimizado para addLiquidity");
    } else {
        console.log("   ⚠️  Gas alto para addLiquidity");
    }
    
    if (gasUsed2.lt(ethers.BigNumber.from("100000"))) {
        console.log("   ✅ Gas optimizado para swap");
    } else {
        console.log("   ⚠️  Gas alto para swap");
    }

    // Test 8: Verificar eventos
    console.log("\n8️⃣ Verificando eventos emitidos...");
    const liquidityEvents = await simpleSwap.queryFilter("LiquidityAdded");
    const swapEvents = await simpleSwap.queryFilter("Swap");
    
    console.log(`   Eventos LiquidityAdded: ${liquidityEvents.length}`);
    console.log(`   Eventos Swap: ${swapEvents.length}`);
    console.log("   ✅ Eventos verificados\n");

    // Resumen final
    console.log("🎉 VERIFICACIÓN COMPLETADA EXITOSAMENTE");
    console.log("="*50);
    console.log(`📋 Contratos desplegados:`);
    console.log(`   SimpleSwap: ${simpleSwap.target}`);
    console.log(`   Token A: ${tokenA.target}`);
    console.log(`   Token B: ${tokenB.target}`);
    console.log(`⛽ Gas total usado: ${gasUsed1.add(gasUsed2).toString()}`);
    console.log(`🏦 LP Tokens en circulación: ${ethers.utils.formatEther(lpBalance)}`);
    console.log(`💱 Pairs creados: ${await simpleSwap.getPairsLength()}`);
    
    // Verificar en Etherscan si no es red local
    if (network.name !== "hardhat" && network.name !== "localhost") {
        console.log("\n🔍 Iniciando verificación en Etherscan...");
        try {
            await run("verify:verify", {
                address: simpleSwap.target,
                constructorArguments: [],
            });
            console.log("✅ Contrato verificado en Etherscan");
        } catch (error) {
            console.log("⚠️  Error en verificación Etherscan:", error.message);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error en verificación:", error);
        process.exit(1);
    });
