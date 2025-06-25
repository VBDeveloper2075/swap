// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SimpleSwap
 * @dev A simplified decentralized exchange (DEX) contract that allows users to:
 * - Add and remove liquidity from token pairs
 * - Swap tokens with automated market maker (AMM) functionality
 * - Get price information and calculate swap amounts
 * @author Veronica Bar
 */
contract SimpleSwap is ERC20, ReentrancyGuard, Ownable {
    
    // Constant for fee calculation (0.3% = 3/1000)
    uint256 public constant FEE_RATE = 3;
    uint256 public constant FEE_DENOMINATOR = 1000;
    
    // Minimum liquidity locked forever to prevent division by zero
    uint256 public constant MINIMUM_LIQUIDITY = 10**3;
    
    // Mapping to store reserves for each token pair
    // keccak256(abi.encodePacked(tokenA, tokenB)) => reserves
    mapping(bytes32 => Reserves) public pairReserves;
    
    // Mapping to track existing pairs
    mapping(bytes32 => bool) public pairExists;
    
    // Array to keep track of all pairs
    bytes32[] public allPairs;
    
    // Structure to store token pair reserves
    struct Reserves {
        uint256 reserve0;
        uint256 reserve1;
        address token0;
        address token1;
    }
    
    // Events
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
    
    /**
     * @dev Constructor initializes the LP token with name and symbol
     */
    constructor() ERC20("SimpleSwap LP Token", "SSLP") {}
    
    /**
     * @dev Modifier to check if deadline has not passed
     * @param deadline The deadline timestamp
     */
    modifier ensure(uint256 deadline) {
        require(deadline >= block.timestamp, "SimpleSwap: EXPIRED");
        _;
    }
    
    /**
     * @dev Gets the pair key for two tokens (sorted)
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return The pair key as bytes32
     */
    function getPairKey(address tokenA, address tokenB) public pure returns (bytes32) {
        require(tokenA != tokenB, "SimpleSwap: IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        return keccak256(abi.encodePacked(token0, token1));
    }
    
    /**
     * @dev Sorts two tokens by address
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return token0 Lower address token
     * @return token1 Higher address token
     */
    function sortTokens(address tokenA, address tokenB) public pure returns (address token0, address token1) {
        require(tokenA != tokenB, "SimpleSwap: IDENTICAL_ADDRESSES");
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    }
    
    /**
     * @dev Adds liquidity to a token pair pool
     * @param tokenA Address of the first token
     * @param tokenB Address of the second token
     * @param amountADesired Desired amount of tokenA to add
     * @param amountBDesired Desired amount of tokenB to add
     * @param amountAMin Minimum amount of tokenA to add (slippage protection)
     * @param amountBMin Minimum amount of tokenB to add (slippage protection)
     * @param to Address to receive the liquidity tokens
     * @param deadline Deadline for the transaction
     * @return amountA Actual amount of tokenA added
     * @return amountB Actual amount of tokenB added
     * @return liquidity Amount of liquidity tokens minted
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external nonReentrant ensure(deadline) returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        require(tokenA != address(0) && tokenB != address(0), "SimpleSwap: ZERO_ADDRESS");
        require(to != address(0), "SimpleSwap: ZERO_ADDRESS");
        require(amountADesired > 0 && amountBDesired > 0, "SimpleSwap: INSUFFICIENT_AMOUNT");
        
        bytes32 pairKey = getPairKey(tokenA, tokenB);
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        
        Reserves storage reserves = pairReserves[pairKey];
        
        if (!pairExists[pairKey]) {
            // First liquidity addition - create new pair
            pairExists[pairKey] = true;
            allPairs.push(pairKey);
            reserves.token0 = token0;
            reserves.token1 = token1;
            
            (amountA, amountB) = (amountADesired, amountBDesired);
            
            // Calculate initial liquidity (geometric mean)
            liquidity = sqrt(amountA * amountB) - MINIMUM_LIQUIDITY;
            require(liquidity > 0, "SimpleSwap: INSUFFICIENT_LIQUIDITY_MINTED");
            
            // Lock minimum liquidity forever
            _mint(address(0), MINIMUM_LIQUIDITY);
        } else {
            // Subsequent liquidity additions - maintain ratio
            uint256 reserveA = tokenA == token0 ? reserves.reserve0 : reserves.reserve1;
            uint256 reserveB = tokenB == token0 ? reserves.reserve0 : reserves.reserve1;
            
            uint256 amountBOptimal = (amountADesired * reserveB) / reserveA;
            
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, "SimpleSwap: INSUFFICIENT_B_AMOUNT");
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = (amountBDesired * reserveA) / reserveB;
                require(amountAOptimal <= amountADesired && amountAOptimal >= amountAMin, "SimpleSwap: INSUFFICIENT_A_AMOUNT");
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
            
            // Calculate liquidity tokens to mint
            uint256 totalSupply = totalSupply();
            liquidity = min((amountA * totalSupply) / reserveA, (amountB * totalSupply) / reserveB);
            require(liquidity > 0, "SimpleSwap: INSUFFICIENT_LIQUIDITY_MINTED");
        }
        
        // Transfer tokens from user to contract
        IERC20(tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountB);
        
        // Update reserves
        if (tokenA == token0) {
            reserves.reserve0 += amountA;
            reserves.reserve1 += amountB;
        } else {
            reserves.reserve0 += amountB;
            reserves.reserve1 += amountA;
        }
        
        // Mint liquidity tokens to user
        _mint(to, liquidity);
        
        emit LiquidityAdded(msg.sender, tokenA, tokenB, amountA, amountB, liquidity);
    }
    
    /**
     * @dev Removes liquidity from a token pair pool
     * @param tokenA Address of the first token
     * @param tokenB Address of the second token
     * @param liquidity Amount of liquidity tokens to burn
     * @param amountAMin Minimum amount of tokenA to receive (slippage protection)
     * @param amountBMin Minimum amount of tokenB to receive (slippage protection)
     * @param to Address to receive the tokens
     * @param deadline Deadline for the transaction
     * @return amountA Amount of tokenA received
     * @return amountB Amount of tokenB received
     */
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external nonReentrant ensure(deadline) returns (uint256 amountA, uint256 amountB) {
        require(tokenA != address(0) && tokenB != address(0), "SimpleSwap: ZERO_ADDRESS");
        require(to != address(0), "SimpleSwap: ZERO_ADDRESS");
        require(liquidity > 0, "SimpleSwap: INSUFFICIENT_LIQUIDITY");
        
        bytes32 pairKey = getPairKey(tokenA, tokenB);
        require(pairExists[pairKey], "SimpleSwap: PAIR_NOT_EXISTS");
        
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        Reserves storage reserves = pairReserves[pairKey];
        
        // Calculate amounts to return
        uint256 totalSupply = totalSupply();
        amountA = (liquidity * (tokenA == token0 ? reserves.reserve0 : reserves.reserve1)) / totalSupply;
        amountB = (liquidity * (tokenB == token0 ? reserves.reserve0 : reserves.reserve1)) / totalSupply;
        
        require(amountA >= amountAMin, "SimpleSwap: INSUFFICIENT_A_AMOUNT");
        require(amountB >= amountBMin, "SimpleSwap: INSUFFICIENT_B_AMOUNT");
        require(amountA > 0 && amountB > 0, "SimpleSwap: INSUFFICIENT_LIQUIDITY_BURNED");
        
        // Burn liquidity tokens from user
        _burn(msg.sender, liquidity);
        
        // Update reserves
        if (tokenA == token0) {
            reserves.reserve0 -= amountA;
            reserves.reserve1 -= amountB;
        } else {
            reserves.reserve0 -= amountB;
            reserves.reserve1 -= amountA;
        }
        
        // Transfer tokens to user
        IERC20(tokenA).transfer(to, amountA);
        IERC20(tokenB).transfer(to, amountB);
        
        emit LiquidityRemoved(msg.sender, tokenA, tokenB, amountA, amountB, liquidity);
    }
    
    /**
     * @dev Swaps an exact amount of input tokens for as many output tokens as possible
     * @param amountIn The amount of input tokens to send
     * @param amountOutMin The minimum amount of output tokens that must be received
     * @param path An array of token addresses representing the swap path
     * @param to Recipient of the output tokens
     * @param deadline Unix timestamp after which the transaction will revert
     * @return amounts The input token amount and all subsequent output token amounts
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external nonReentrant ensure(deadline) returns (uint256[] memory amounts) {
        require(path.length >= 2, "SimpleSwap: INVALID_PATH");
        require(amountIn > 0, "SimpleSwap: INSUFFICIENT_INPUT_AMOUNT");
        require(to != address(0), "SimpleSwap: ZERO_ADDRESS");
        
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        
        // For this simple implementation, we only support direct swaps (path length = 2)
        require(path.length == 2, "SimpleSwap: ONLY_DIRECT_SWAPS");
        
        address tokenIn = path[0];
        address tokenOut = path[1];
        
        bytes32 pairKey = getPairKey(tokenIn, tokenOut);
        require(pairExists[pairKey], "SimpleSwap: PAIR_NOT_EXISTS");
        
        Reserves storage reserves = pairReserves[pairKey];
        (address token0, address token1) = sortTokens(tokenIn, tokenOut);
        
        uint256 reserveIn = tokenIn == token0 ? reserves.reserve0 : reserves.reserve1;
        uint256 reserveOut = tokenOut == token0 ? reserves.reserve0 : reserves.reserve1;
        
        // Calculate output amount
        uint256 amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        require(amountOut >= amountOutMin, "SimpleSwap: INSUFFICIENT_OUTPUT_AMOUNT");
        
        amounts[1] = amountOut;
        
        // Transfer input tokens from user to contract
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        
        // Update reserves
        if (tokenIn == token0) {
            reserves.reserve0 += amountIn;
            reserves.reserve1 -= amountOut;
        } else {
            reserves.reserve0 -= amountOut;
            reserves.reserve1 += amountIn;
        }
        
        // Transfer output tokens to user
        IERC20(tokenOut).transfer(to, amountOut);
        
        emit Swap(msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }
    
    /**
     * @dev Gets the current price of tokenA in terms of tokenB
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return price Price of tokenA in terms of tokenB (scaled by 1e18)
     */
    function getPrice(address tokenA, address tokenB) external view returns (uint256 price) {
        require(tokenA != address(0) && tokenB != address(0), "SimpleSwap: ZERO_ADDRESS");
        require(tokenA != tokenB, "SimpleSwap: IDENTICAL_ADDRESSES");
        
        bytes32 pairKey = getPairKey(tokenA, tokenB);
        require(pairExists[pairKey], "SimpleSwap: PAIR_NOT_EXISTS");
        
        Reserves storage reserves = pairReserves[pairKey];
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        
        uint256 reserveA = tokenA == token0 ? reserves.reserve0 : reserves.reserve1;
        uint256 reserveB = tokenB == token0 ? reserves.reserve0 : reserves.reserve1;
        
        require(reserveA > 0 && reserveB > 0, "SimpleSwap: INSUFFICIENT_LIQUIDITY");
        
        // Price = reserveB / reserveA (scaled by 1e18 for precision)
        price = (reserveB * 1e18) / reserveA;
    }
    
    /**
     * @dev Calculates the amount of output tokens for a given input amount
     * @param amountIn Amount of input tokens
     * @param reserveIn Reserve of input token in the pool
     * @param reserveOut Reserve of output token in the pool
     * @return amountOut Amount of output tokens
     */
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) 
        public 
        pure 
        returns (uint256 amountOut) 
    {
        require(amountIn > 0, "SimpleSwap: INSUFFICIENT_INPUT_AMOUNT");
        require(reserveIn > 0 && reserveOut > 0, "SimpleSwap: INSUFFICIENT_LIQUIDITY");
        
        // Apply 0.3% fee
        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - FEE_RATE);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * FEE_DENOMINATOR) + amountInWithFee;
        
        amountOut = numerator / denominator;
    }
    
    /**
     * @dev Returns the reserves for a given token pair
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return reserveA Reserve of tokenA
     * @return reserveB Reserve of tokenB
     */
    function getReserves(address tokenA, address tokenB) 
        external 
        view 
        returns (uint256 reserveA, uint256 reserveB) 
    {
        bytes32 pairKey = getPairKey(tokenA, tokenB);
        require(pairExists[pairKey], "SimpleSwap: PAIR_NOT_EXISTS");
        
        Reserves storage reserves = pairReserves[pairKey];
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        
        reserveA = tokenA == token0 ? reserves.reserve0 : reserves.reserve1;
        reserveB = tokenB == token0 ? reserves.reserve0 : reserves.reserve1;
    }
    
    /**
     * @dev Returns the total number of pairs
     * @return The number of token pairs
     */
    function getPairsLength() external view returns (uint256) {
        return allPairs.length;
    }
    
    /**
     * @dev Helper function to calculate square root
     * @param y Input value
     * @return z Square root of y
     */
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
    
    /**
     * @dev Helper function to get minimum of two values
     * @param x First value
     * @param y Second value
     * @return The smaller value
     */
    function min(uint256 x, uint256 y) internal pure returns (uint256) {
        return x < y ? x : y;
    }
}
