# Deploy LifePool to Base Sepolia

```bash
# 1. Fund deployer with Base Sepolia ETH (https://docs.base.org/docs/tools/network-faucets)
export DEPLOYER_PRIVATE_KEY=0x...
export BASE_SEPOLIA_RPC_URL=https://sepolia.base.org

# 2. Deploy + export addresses
bash contracts/scripts/deploy-and-export.sh

# 3. Verify on Basescan
cd contracts
forge verify-contract <ADDRESS> src/LifeEUR.sol:LifeEUR --chain-id 84532 --etherscan-api-key $BASESCAN_API_KEY
```

Local dev with Anvil:

```bash
anvil --port 8545
DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 bash contracts/scripts/deploy-and-export.sh
```

## Treasury + B3OS operator

After deploy, set the B3OS org wallet as treasury operator:

```bash
cast send $TREASURY_VAULT "setOperator(address)" $B3OS_WALLET \
  --rpc-url $BASE_SEPOLIA_RPC_URL --private-key $DEPLOYER_PRIVATE_KEY
```

See `ops/b3os/README.md` for workflow setup. Local keepers: `npm run keeper:all`.
