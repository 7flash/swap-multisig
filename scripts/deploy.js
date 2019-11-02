const { artifacts, ethereum } = require("@nomiclabs/buidler");
const MultisigFabric = artifacts.require('MultisigFabric')

async function main() {
  const { address, transactionHash } = await MultisigFabric.new()

  console.log(`🚀 Contract deployed on ${address} (transaction: ${transactionHash})`)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
