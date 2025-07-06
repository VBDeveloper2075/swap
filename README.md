# SimpleSwap - Decentralized Exchange (DEX) Contract

![Solidity](https://img.shields.io/badge/Solidity-0.8.19-blue)
![Hardhat](https://img.shields.io/badge/Framework-Hardhat-yellow)
![OpenZeppelin](https://img.shields.io/badge/Security-OpenZeppelin-green)
![Gas Optimized](https://img.shields.io/badge/Gas-Optimized-red)

## 🎯 Project Overview

SimpleSwap es un contrato inteligente de intercambio descentralizado (DEX) que implementa un Market Maker Automatizado (AMM) simplificado, similar a Uniswap V2. Permite a los usuarios intercambiar tokens, agregar/remover liquidez y ganar comisiones como proveedores de liquidez con optimizaciones avanzadas de gas.

### 🚀 Contrato Verificado

El contrato está desplegado y verificado en la red Sepolia:

- **Dirección**: [0x82ae690ad18b1bc5849ca42f7af5fec34546e3bc](https://sepolia.etherscan.io/address/0x82ae690ad18b1bc5849ca42f7af5fec34546e3bc)
- **Red**: Sepolia Testnet
- **Estado**: Verificado ✅
- **Optimizaciones**: Gas optimizado ⛽
- **Documento de Verificación**: [Ver informe completo](./VERIFICATION.md)

## 📋 Features

### 1. **Add Liquidity** (`addLiquidity`)
- Allows users to add liquidity to token pairs
- Automatically calculates optimal amounts to maintain pool ratios
- Mints liquidity tokens (LP tokens) representing user's share
- Implements slippage protection with minimum amount parameters
- Emits liquidity addition events for tracking

### 2. **Remove Liquidity** (`removeLiquidity`)
- Enables users to withdraw their liquidity from pools
- Burns LP tokens and returns underlying assets proportionally
- Includes slippage protection for received amounts
- Updates pool reserves accordingly

### 3. **Token Swapping** (`swapExactTokensForTokens`)
- Performs token-to-token swaps with exact input amounts
- Implements constant product formula (x * y = k)
- Charges 0.3% trading fee (similar to Uniswap V2)
- Supports slippage protection with minimum output amounts
- Currently supports direct swaps (no multi-hop routing)

### 4. **Price Information** (`getPrice`)
- Returns current price of tokenA in terms of tokenB
- Uses pool reserves to calculate real-time pricing
- Returns price scaled by 1e18 for precision

### 5. **Amount Calculation** (`getAmountOut`)
- Calculates output amount for given input amount
- Pure function that can be called off-chain
- Includes trading fee calculation in the formula

## 🏗️ Contract Architecture

### Core Components

- **ERC20 Inheritance**: LP tokens are ERC20 compliant
- **ReentrancyGuard**: Prevents reentrancy attacks
- **Ownable**: Basic access control (future upgrades)

### Data Structures

```solidity
struct Reserves {
    uint256 reserve0;
    uint256 reserve1;
    address token0;
    address token1;
}
```

### Key Mappings

- `pairReserves`: Stores reserves for each token pair
- `pairExists`: Tracks which pairs have been created
- `allPairs`: Array of all created pairs

## 🔧 Technical Implementation

### AMM Formula

The contract uses the constant product formula:
```
x * y = k
```

Where:
- `x` = reserve of token A
- `y` = reserve of token B  
- `k` = constant (must remain constant during swaps)

### Fee Mechanism

- **Trading Fee**: 0.3% (3/1000) charged on swaps
- **Fee Distribution**: Currently retained in pool (increases value for LP holders)

### Liquidity Calculation

**Initial Liquidity**: `sqrt(amountA * amountB) - MINIMUM_LIQUIDITY`

**Subsequent Liquidity**: `min((amountA * totalSupply) / reserveA, (amountB * totalSupply) / reserveB)`

## 📖 Usage Examples

### Adding Liquidity

```solidity
// Approve tokens first
tokenA.approve(address(simpleSwap), amountA);
tokenB.approve(address(simpleSwap), amountB);

// Add liquidity
simpleSwap.addLiquidity(
    address(tokenA),        // Token A address
    address(tokenB),        // Token B address  
    1000 * 10**18,         // Amount A desired
    2000 * 10**18,         // Amount B desired
    950 * 10**18,          // Amount A minimum (5% slippage)
    1900 * 10**18,         // Amount B minimum (5% slippage)
    msg.sender,            // LP tokens recipient
    block.timestamp + 300  // 5 minute deadline
);
```

### Swapping Tokens

```solidity
// Approve input token
tokenA.approve(address(simpleSwap), amountIn);

// Perform swap
address[] memory path = new address[](2);
path[0] = address(tokenA);  // Input token
path[1] = address(tokenB);  // Output token

simpleSwap.swapExactTokensForTokens(
    100 * 10**18,          // Amount in
    95 * 10**18,           // Minimum amount out (5% slippage)
    path,                  // Swap path
    msg.sender,            // Recipient
    block.timestamp + 300  // Deadline
);
```

### Getting Price Information

```solidity
// Get current price of tokenA in terms of tokenB
uint256 price = simpleSwap.getPrice(
    address(tokenA),
    address(tokenB)
);

// Price is scaled by 1e18
// To get human-readable price: price / 1e18
```

### Calculating Swap Output

```solidity
// Get reserves
(uint256 reserveA, uint256 reserveB) = simpleSwap.getReserves(
    address(tokenA),
    address(tokenB)
);

// Calculate output amount
uint256 amountOut = simpleSwap.getAmountOut(
    100 * 10**18,  // Amount in
    reserveA,      // Input token reserve
    reserveB       // Output token reserve
);
```

## 🛡️ Security Features

### Access Controls
- **ReentrancyGuard**: Prevents reentrancy attacks on state-changing functions
- **Deadline checks**: All user-facing functions include deadline validation
- **Zero address checks**: Validates token and recipient addresses
- **Amount validations**: Ensures minimum amounts and sufficient liquidity

### Slippage Protection
- Minimum amount parameters in `addLiquidity` and `removeLiquidity`
- `amountOutMin` parameter in swap functions
- Front-running protection through deadline mechanism

### Liquidity Safeguards
- **Minimum Liquidity**: 1000 units locked forever to prevent division by zero
- **Proportional withdrawals**: Ensures fair liquidity removal
- **Reserve updates**: Atomic updates prevent inconsistent states

## 📊 Events

```solidity
event LiquidityAdded(
    address indexed user,
    address indexed tokenA,
    address indexed tokenB,
    uint256 amountA,
    uint256 amountB,
    uint256 liquidity
);

event LiquidityRemoved(
    address indexed user,
    address indexed tokenA,
    address indexed tokenB,
    uint256 amountA,
    uint256 amountB,
    uint256 liquidity
);

event Swap(
    address indexed user,
    address indexed tokenIn,
    address indexed tokenOut,
    uint256 amountIn,
    uint256 amountOut
);
```

## 🚀 Deployment

### Prerequisites
- Node.js v16+
- Hardhat development environment
- Access to Ethereum network (mainnet/testnet)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd eth_kipu_tp3_veronicaBar

# Install dependencies
npm install

# Compile contracts
npx hardhat compile
```

### Deployment Script

```bash
# Deploy to testnet
npx hardhat run scripts/deploy.js --network <network-name>

# Verify contract (optional)
npx hardhat verify --network <network-name> <contract-address>
```

## 🧪 Testing

The contract includes comprehensive test coverage for:
- Liquidity addition and removal
- Token swapping functionality  
- Price calculations
- Edge cases and error conditions
- Gas optimization

```bash
# Run tests
npx hardhat test

# Run tests with gas reporting
REPORT_GAS=true npx hardhat test
```

## 📈 Gas Optimization

The contract is optimized for gas efficiency through:
- Minimal storage operations
- Efficient mathematical calculations
- Reduced external calls
- Optimized data structures

## ⚠️ Known Limitations

1. **Single-hop swaps only**: Multi-hop routing not implemented
2. **No price oracle**: Relies on pool reserves for pricing
3. **No governance**: No mechanism for parameter updates
4. **Fixed fee**: 0.3% fee is hardcoded

## 🔮 Future Enhancements

- Multi-hop swap routing
- Dynamic fee structures
- Governance mechanisms
- Price oracle integration
- Flash loan functionality
- Advanced LP token features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Contact

**Author**: Veronica Bar  
**Project**: ETH Kipu TP3 - SimpleSwap Implementation

---

**⚡ Built with Solidity ^0.8.19 and OpenZeppelin contracts for security and reliability.**
"# swap" 
