# Instrucciones para Completar la Verificación

Para completar la verificación del contrato `SimpleSwap` en la dirección `0x82ae690ad18b1bc5849ca42f7af5fec34546e3bc` en la red Sepolia, sigue estos pasos:

## 1. Configura las Variables de Entorno

Edita el archivo `.env` en la raíz del proyecto y agrega tus claves:

```
INFURA_API_KEY=tu_infura_api_key_aqui
PRIVATE_KEY=tu_private_key_aqui
ETHERSCAN_API_KEY=tu_etherscan_api_key_aqui
REPORT_GAS=true
```

## 2. Instala las Dependencias

```bash
npm install
npm install dotenv
```

## 3. Compila el Contrato

```bash
npm run compile
```

## 4. Verifica el Contrato en Sepolia

```bash
npx hardhat verify --network sepolia 0x82ae690ad18b1bc5849ca42f7af5fec34546e3bc
```

O usa el script que ya hemos creado:

```bash
npm run verify:sepolia
```

## 5. Verifica la Optimización de Gas

Para asegurar que el contrato está correctamente optimizado para gas:

```bash
npm run gas-analysis
```

## 6. Confirmación Final

Después de ejecutar estos comandos, verifica:

1. El contrato debe estar verificado en [Etherscan](https://sepolia.etherscan.io/address/0x82ae690ad18b1bc5849ca42f7af5fec34546e3bc)
2. Revisa el archivo `VERIFICATION.md` para confirmar todos los requisitos
3. Asegúrate de que el README.md incluya la información actualizada

## 7. Documentación para la Evaluación

Para la evaluación, asegúrate de incluir:

1. El enlace al contrato verificado: https://sepolia.etherscan.io/address/0x82ae690ad18b1bc5849ca42f7af5fec34546e3bc
2. El informe de verificación: `VERIFICATION.md`
3. El README actualizado
4. El código del contrato con las optimizaciones de gas implementadas

Con esto, habrás cumplido todos los requisitos para aprobar la evaluación.

## Datos de Verificación

```
Dirección del contrato: 0x82ae690ad18b1bc5849ca42f7af5fec34546e3bc
Red: Sepolia Testnet
Optimizaciones: Enabled (1000 runs, viaIR: true)
```
