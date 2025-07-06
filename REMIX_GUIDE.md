# Guía para Remix: SimpleSwap

## Pasos para desplegar y probar SimpleSwap en Remix

### 1. Preparación en Remix

1. Abre [Remix](https://remix.ethereum.org/#lang=en&optimize=false&runs=200&evmVersion=null&version=soljson-v0.8.30+commit.73712a01.js)
2. Instala el plugin de OpenZeppelin:
   - Haz clic en el icono de plugins (cubo de Rubik)
   - Busca "OpenZeppelin"
   - Haz clic en "Activate"
3. Crea nuevos archivos y copia el código de cada uno de estos contratos:
   - `SimpleSwap.sol` (contrato principal)
   - `MockERC20_Remix.sol` (token ERC20 para pruebas)
   - `SimpleSwapTest.sol` (contrato de prueba)

### 2. Compilar los contratos

1. Ve a la pestaña de compilador (icono de S)
2. Selecciona Solidity 0.8.30
3. Compila cada uno de los contratos

### 3. Desplegar los contratos

Sigue estos pasos en la pestaña de "Deploy & Run Transactions":

1. **Desplegar tokens ERC20 de prueba**:
   - Selecciona `MockERC20_Remix.sol`
   - Completa los parámetros:
     - name: "Token A"
     - symbol: "TKNA" 
     - totalSupply: "1000000000000000000000000" (1 millón con 18 decimales)
   - Haz clic en "Deploy" para crear Token A
   - Repite para crear Token B (cambia el nombre a "Token B" y símbolo a "TKNB")

2. **Desplegar SimpleSwap**:
   - Selecciona `SimpleSwap.sol`
   - Haz clic en "Deploy"

3. **Desplegar SimpleSwapTest**:
   - Selecciona `SimpleSwapTest.sol`
   - Haz clic en "Deploy"

### 4. Configurar contrato de prueba

1. Expande el contrato `SimpleSwapTest` en la sección de "Deployed Contracts"
2. Llama a `setContracts` con las direcciones:
   - `_simpleSwap`: dirección de SimpleSwap
   - `_tokenA`: dirección del primer token
   - `_tokenB`: dirección del segundo token

### 5. Transferir tokens al contrato de prueba

1. Expande los contratos de Token A y Token B
2. Usa la función `transfer` para enviar tokens al contrato SimpleSwapTest:
   - `to`: dirección del contrato SimpleSwapTest
   - `amount`: "100000000000000000000000" (100,000 tokens)

### 6. Probar funcionalidades

1. **Agregar liquidez**:
   - Usa `testAddLiquidity` con los siguientes parámetros:
     - amountA: "10000000000000000000000" (10,000 tokens)
     - amountB: "10000000000000000000000" (10,000 tokens)

2. **Hacer swap**:
   - Usa `testSwap` con:
     - amountIn: "1000000000000000000000" (1,000 tokens)
     - tokenIn: dirección del Token A

3. **Verificar estado**:
   - Llama a `checkStatus` para ver los balances y reservas actuales

## Notas importantes

- Las cantidades de tokens deben incluir los 18 decimales
- Si recibes error de gas, aumenta el límite de gas en Remix
- Si tienes problemas de permisos, asegúrate de que las aprobaciones se hayan realizado correctamente

## Solución de problemas comunes

1. **Error: "SimpleSwap: IDENTICAL_ADDRESSES"**
   - Asegúrate de usar direcciones diferentes para tokenA y tokenB

2. **Error: "SimpleSwap: INSUFFICIENT_LIQUIDITY"**
   - Asegúrate de agregar suficiente liquidez inicial

3. **Error: "ERC20: insufficient allowance"**
   - Verifica que los tokens hayan sido aprobados correctamente

4. **Error: "SimpleSwap: EXPIRED"**
   - El plazo de ejecución expiró. Intenta nuevamente con un nuevo deadline

5. **Error: "TypeError: Wrong argument count for constructor call"**
   - Si encuentras este error, asegúrate de que la versión del plugin de OpenZeppelin sea compatible
   - Reinstala el plugin si es necesario o ajusta la forma de inicializar Ownable según la versión

6. **Error: "File import callback not supported"**
   - Asegúrate de que el plugin de OpenZeppelin esté activado
   - Como alternativa, puedes usar: https://remix.ethereum.org/#activate=solidity,fileManager,remixd,@openzeppelin
