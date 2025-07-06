// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// No se necesitan importaciones específicas para este contrato de prueba

/**
 * @title SimpleSwapTest
 * @dev Script para probar SimpleSwap en Remix
 */
contract SimpleSwapTest {
    // Direcciones de contratos desplegados (se completan después del despliegue)
    address public simpleSwapAddress;
    address public tokenAAddress;
    address public tokenBAddress;
    
    // Interfaces para interactuar con los contratos
    interface IERC20 {
        function approve(address spender, uint256 amount) external returns (bool);
        function transfer(address recipient, uint256 amount) external returns (bool);
        function balanceOf(address account) external view returns (uint256);
    }
    
    interface ISimpleSwap {
        function addLiquidity(
            address tokenA,
            address tokenB,
            uint256 amountADesired,
            uint256 amountBDesired,
            uint256 amountAMin,
            uint256 amountBMin,
            address to,
            uint256 deadline
        ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity);
        
        function swapExactTokensForTokens(
            uint256 amountIn,
            uint256 amountOutMin,
            address[] calldata path,
            address to,
            uint256 deadline
        ) external returns (uint256[] memory amounts);
        
        function getPrice(address tokenA, address tokenB) external view returns (uint256);
        function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) external pure returns (uint256);
        function getReserves(address tokenA, address tokenB) external view returns (uint256, uint256);
    }
    
    /**
     * @dev Establece las direcciones de los contratos desplegados
     */
    function setContracts(address _simpleSwap, address _tokenA, address _tokenB) external {
        simpleSwapAddress = _simpleSwap;
        tokenAAddress = _tokenA;
        tokenBAddress = _tokenB;
    }
    
    /**
     * @dev Agrega liquidez al pool
     */
    function testAddLiquidity(uint256 amountA, uint256 amountB) external returns (uint256 liquidity) {
        require(simpleSwapAddress != address(0), "Contratos no configurados");
        
        // Aprobar tokens
        IERC20(tokenAAddress).approve(simpleSwapAddress, amountA);
        IERC20(tokenBAddress).approve(simpleSwapAddress, amountB);
        
        // Agregar liquidez
        uint256 deadline = block.timestamp + 300; // 5 minutos
        (,, liquidity) = ISimpleSwap(simpleSwapAddress).addLiquidity(
            tokenAAddress,
            tokenBAddress,
            amountA,
            amountB,
            0, // Sin protección de slippage para el ejemplo
            0,
            address(this),
            deadline
        );
        
        return liquidity;
    }
    
    /**
     * @dev Realiza un swap de tokens
     */
    function testSwap(uint256 amountIn, address tokenIn) external returns (uint256 amountOut) {
        require(simpleSwapAddress != address(0), "Contratos no configurados");
        
        // Determinar token de salida
        address tokenOut = tokenIn == tokenAAddress ? tokenBAddress : tokenAAddress;
        
        // Aprobar tokens
        IERC20(tokenIn).approve(simpleSwapAddress, amountIn);
        
        // Crear path
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;
        
        // Ejecutar swap
        uint256 deadline = block.timestamp + 300; // 5 minutos
        uint256[] memory amounts = ISimpleSwap(simpleSwapAddress).swapExactTokensForTokens(
            amountIn,
            0, // Sin protección de slippage para el ejemplo
            path,
            address(this),
            deadline
        );
        
        return amounts[1]; // Cantidad recibida
    }
    
    /**
     * @dev Consulta balances y precios
     */
    function checkStatus() external view returns (
        uint256 tokenABalance,
        uint256 tokenBBalance,
        uint256 price,
        uint256 reserveA,
        uint256 reserveB
    ) {
        require(simpleSwapAddress != address(0), "Contratos no configurados");
        
        tokenABalance = IERC20(tokenAAddress).balanceOf(address(this));
        tokenBBalance = IERC20(tokenBAddress).balanceOf(address(this));
        price = ISimpleSwap(simpleSwapAddress).getPrice(tokenAAddress, tokenBAddress);
        (reserveA, reserveB) = ISimpleSwap(simpleSwapAddress).getReserves(tokenAAddress, tokenBAddress);
    }
    
    /**
     * @dev Rescatar tokens (en caso de emergencia)
     */
    function rescueTokens(address token) external {
        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(msg.sender, balance);
    }
}
