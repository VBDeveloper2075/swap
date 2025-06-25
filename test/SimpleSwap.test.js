const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleSwap", function () {
  let SimpleSwap, simpleSwap;
  let MockToken, tokenA, tokenB;
  let owner, addr1, addr2;
  let deadline;

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2] = await ethers.getSigners();
    
    // Set deadline to 1 hour from now
    deadline = Math.floor(Date.now() / 1000) + 3600;

    // Deploy mock ERC20 tokens
    MockToken = await ethers.getContractFactory("MockERC20");
    tokenA = await MockToken.deploy("Token A", "TKA", ethers.utils.parseEther("1000000"));
    tokenB = await MockToken.deploy("Token B", "TKB", ethers.utils.parseEther("1000000"));
    
    // Deploy SimpleSwap
    SimpleSwap = await ethers.getContractFactory("SimpleSwap");
    simpleSwap = await SimpleSwap.deploy();
    
    await tokenA.deployed();
    await tokenB.deployed();
    await simpleSwap.deployed();

    // Transfer tokens to test accounts
    await tokenA.transfer(addr1.address, ethers.utils.parseEther("10000"));
    await tokenB.transfer(addr1.address, ethers.utils.parseEther("20000"));
    await tokenA.transfer(addr2.address, ethers.utils.parseEther("5000"));
    await tokenB.transfer(addr2.address, ethers.utils.parseEther("10000"));
  });

  describe("Deployment", function () {
    it("Should deploy with correct LP token details", async function () {
      expect(await simpleSwap.name()).to.equal("SimpleSwap LP Token");
      expect(await simpleSwap.symbol()).to.equal("SSLP");
      expect(await simpleSwap.decimals()).to.equal(18);
    });

    it("Should have correct constants", async function () {
      expect(await simpleSwap.FEE_RATE()).to.equal(3);
      expect(await simpleSwap.FEE_DENOMINATOR()).to.equal(1000);
      expect(await simpleSwap.MINIMUM_LIQUIDITY()).to.equal(1000);
    });
  });

  describe("Add Liquidity", function () {
    it("Should add initial liquidity correctly", async function () {
      const amountA = ethers.utils.parseEther("100");
      const amountB = ethers.utils.parseEther("200");

      // Approve tokens
      await tokenA.connect(addr1).approve(simpleSwap.address, amountA);
      await tokenB.connect(addr1).approve(simpleSwap.address, amountB);

      // Add liquidity
      const tx = await simpleSwap.connect(addr1).addLiquidity(
        tokenA.address,
        tokenB.address,
        amountA,
        amountB,
        0,
        0,
        addr1.address,
        deadline
      );

      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "LiquidityAdded");
      
      expect(event).to.not.be.undefined;
      expect(event.args.user).to.equal(addr1.address);
      expect(event.args.amountA).to.equal(amountA);
      expect(event.args.amountB).to.equal(amountB);

      // Check LP token balance
      const lpBalance = await simpleSwap.balanceOf(addr1.address);
      expect(lpBalance).to.be.gt(0);
    });

    it("Should maintain ratio for subsequent liquidity", async function () {
      // Add initial liquidity
      const initialA = ethers.utils.parseEther("100");
      const initialB = ethers.utils.parseEther("200");

      await tokenA.connect(addr1).approve(simpleSwap.address, initialA);
      await tokenB.connect(addr1).approve(simpleSwap.address, initialB);
      
      await simpleSwap.connect(addr1).addLiquidity(
        tokenA.address,
        tokenB.address,
        initialA,
        initialB,
        0,
        0,
        addr1.address,
        deadline
      );

      // Add second liquidity (should maintain 1:2 ratio)
      const secondA = ethers.utils.parseEther("50");
      const expectedB = ethers.utils.parseEther("100");

      await tokenA.connect(addr2).approve(simpleSwap.address, secondA);
      await tokenB.connect(addr2).approve(simpleSwap.address, expectedB);

      const tx = await simpleSwap.connect(addr2).addLiquidity(
        tokenA.address,
        tokenB.address,
        secondA,
        ethers.utils.parseEther("150"), // More than needed
        0,
        0,
        addr2.address,
        deadline
      );

      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "LiquidityAdded");
      
      expect(event.args.amountA).to.equal(secondA);
      expect(event.args.amountB).to.equal(expectedB);
    });

    it("Should revert with insufficient amounts", async function () {
      await tokenA.connect(addr1).approve(simpleSwap.address, ethers.utils.parseEther("100"));
      await tokenB.connect(addr1).approve(simpleSwap.address, ethers.utils.parseEther("200"));

      await expect(
        simpleSwap.connect(addr1).addLiquidity(
          tokenA.address,
          tokenB.address,
          0, // Zero amount
          ethers.utils.parseEther("200"),
          0,
          0,
          addr1.address,
          deadline
        )
      ).to.be.revertedWith("SimpleSwap: INSUFFICIENT_AMOUNT");
    });
  });

  describe("Remove Liquidity", function () {
    beforeEach(async function () {
      // Add initial liquidity
      const amountA = ethers.utils.parseEther("100");
      const amountB = ethers.utils.parseEther("200");

      await tokenA.connect(addr1).approve(simpleSwap.address, amountA);
      await tokenB.connect(addr1).approve(simpleSwap.address, amountB);
      
      await simpleSwap.connect(addr1).addLiquidity(
        tokenA.address,
        tokenB.address,
        amountA,
        amountB,
        0,
        0,
        addr1.address,
        deadline
      );
    });

    it("Should remove liquidity correctly", async function () {
      const lpBalance = await simpleSwap.balanceOf(addr1.address);
      const removeAmount = lpBalance.div(2); // Remove half

      const tx = await simpleSwap.connect(addr1).removeLiquidity(
        tokenA.address,
        tokenB.address,
        removeAmount,
        0,
        0,
        addr1.address,
        deadline
      );

      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "LiquidityRemoved");
      
      expect(event).to.not.be.undefined;
      expect(event.args.user).to.equal(addr1.address);
      expect(event.args.liquidity).to.equal(removeAmount);
    });

    it("Should revert when removing non-existent pair", async function () {
      const MockTokenC = await ethers.getContractFactory("MockERC20");
      const tokenC = await MockTokenC.deploy("Token C", "TKC", ethers.utils.parseEther("1000000"));
      
      await expect(
        simpleSwap.connect(addr1).removeLiquidity(
          tokenA.address,
          tokenC.address,
          100,
          0,
          0,
          addr1.address,
          deadline
        )
      ).to.be.revertedWith("SimpleSwap: PAIR_NOT_EXISTS");
    });
  });

  describe("Token Swapping", function () {
    beforeEach(async function () {
      // Add liquidity first
      const amountA = ethers.utils.parseEther("1000");
      const amountB = ethers.utils.parseEther("2000");

      await tokenA.connect(addr1).approve(simpleSwap.address, amountA);
      await tokenB.connect(addr1).approve(simpleSwap.address, amountB);
      
      await simpleSwap.connect(addr1).addLiquidity(
        tokenA.address,
        tokenB.address,
        amountA,
        amountB,
        0,
        0,
        addr1.address,
        deadline
      );
    });

    it("Should swap tokens correctly", async function () {
      const swapAmount = ethers.utils.parseEther("100");
      
      await tokenA.connect(addr2).approve(simpleSwap.address, swapAmount);
      
      const path = [tokenA.address, tokenB.address];
      
      const balanceBefore = await tokenB.balanceOf(addr2.address);
      
      const tx = await simpleSwap.connect(addr2).swapExactTokensForTokens(
        swapAmount,
        0,
        path,
        addr2.address,
        deadline
      );

      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "Swap");
      
      expect(event).to.not.be.undefined;
      expect(event.args.user).to.equal(addr2.address);
      expect(event.args.tokenIn).to.equal(tokenA.address);
      expect(event.args.tokenOut).to.equal(tokenB.address);
      expect(event.args.amountIn).to.equal(swapAmount);

      const balanceAfter = await tokenB.balanceOf(addr2.address);
      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it("Should calculate correct output amount", async function () {
      const amountIn = ethers.utils.parseEther("100");
      const [reserveA, reserveB] = await simpleSwap.getReserves(tokenA.address, tokenB.address);
      
      const expectedOut = await simpleSwap.getAmountOut(amountIn, reserveA, reserveB);
      expect(expectedOut).to.be.gt(0);
      
      // Check that we get approximately the expected amount (accounting for fees)
      await tokenA.connect(addr2).approve(simpleSwap.address, amountIn);
      
      const balanceBefore = await tokenB.balanceOf(addr2.address);
      
      await simpleSwap.connect(addr2).swapExactTokensForTokens(
        amountIn,
        0,
        [tokenA.address, tokenB.address],
        addr2.address,
        deadline
      );

      const balanceAfter = await tokenB.balanceOf(addr2.address);
      const actualOut = balanceAfter.sub(balanceBefore);
      
      expect(actualOut).to.equal(expectedOut);
    });

    it("Should revert with insufficient output amount", async function () {
      const swapAmount = ethers.utils.parseEther("100");
      const unreasonableMinOut = ethers.utils.parseEther("1000"); // Too high
      
      await tokenA.connect(addr2).approve(simpleSwap.address, swapAmount);
      
      await expect(
        simpleSwap.connect(addr2).swapExactTokensForTokens(
          swapAmount,
          unreasonableMinOut,
          [tokenA.address, tokenB.address],
          addr2.address,
          deadline
        )
      ).to.be.revertedWith("SimpleSwap: INSUFFICIENT_OUTPUT_AMOUNT");
    });
  });

  describe("Price Functions", function () {
    beforeEach(async function () {
      // Add liquidity: 1000 A : 2000 B (1:2 ratio)
      const amountA = ethers.utils.parseEther("1000");
      const amountB = ethers.utils.parseEther("2000");

      await tokenA.connect(addr1).approve(simpleSwap.address, amountA);
      await tokenB.connect(addr1).approve(simpleSwap.address, amountB);
      
      await simpleSwap.connect(addr1).addLiquidity(
        tokenA.address,
        tokenB.address,
        amountA,
        amountB,
        0,
        0,
        addr1.address,
        deadline
      );
    });

    it("Should return correct price", async function () {
      const price = await simpleSwap.getPrice(tokenA.address, tokenB.address);
      // Price should be 2 (2000B/1000A) scaled by 1e18
      expect(price).to.equal(ethers.utils.parseEther("2"));
    });

    it("Should return correct reserves", async function () {
      const [reserveA, reserveB] = await simpleSwap.getReserves(tokenA.address, tokenB.address);
      expect(reserveA).to.equal(ethers.utils.parseEther("1000"));
      expect(reserveB).to.equal(ethers.utils.parseEther("2000"));
    });

    it("Should calculate getAmountOut correctly", async function () {
      const amountIn = ethers.utils.parseEther("100");
      const [reserveA, reserveB] = await simpleSwap.getReserves(tokenA.address, tokenB.address);
      
      const amountOut = await simpleSwap.getAmountOut(amountIn, reserveA, reserveB);
      
      // With 0.3% fee, we should get less than simple ratio calculation
      const simpleRatio = amountIn.mul(reserveB).div(reserveA);
      expect(amountOut).to.be.lt(simpleRatio);
      expect(amountOut).to.be.gt(0);
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should revert with expired deadline", async function () {
      const pastDeadline = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      
      await tokenA.connect(addr1).approve(simpleSwap.address, ethers.utils.parseEther("100"));
      await tokenB.connect(addr1).approve(simpleSwap.address, ethers.utils.parseEther("200"));

      await expect(
        simpleSwap.connect(addr1).addLiquidity(
          tokenA.address,
          tokenB.address,
          ethers.utils.parseEther("100"),
          ethers.utils.parseEther("200"),
          0,
          0,
          addr1.address,
          pastDeadline
        )
      ).to.be.revertedWith("SimpleSwap: EXPIRED");
    });

    it("Should revert with zero addresses", async function () {
      await expect(
        simpleSwap.connect(addr1).addLiquidity(
          ethers.constants.AddressZero,
          tokenB.address,
          ethers.utils.parseEther("100"),
          ethers.utils.parseEther("200"),
          0,
          0,
          addr1.address,
          deadline
        )
      ).to.be.revertedWith("SimpleSwap: ZERO_ADDRESS");
    });

    it("Should revert with identical addresses", async function () {
      await expect(
        simpleSwap.getPairKey(tokenA.address, tokenA.address)
      ).to.be.revertedWith("SimpleSwap: IDENTICAL_ADDRESSES");
    });
  });
});
