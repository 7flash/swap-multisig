const { artifacts, web3 } = require('@nomiclabs/buidler')
const { describe } = require('riteway')

const Token = artifacts.require('Token')
const Multisig = artifacts.require('Multisig')
const MultisigFactory = artifacts.require('MultisigFactory')

const fixSignature = (signature) => {
  let v = parseInt(signature.slice(130, 132), 16);
  if (v < 27) {
    v += 27;
  }
  const vHex = v.toString(16);
  return signature.slice(0, 130) + vHex;
}

const sign = async (message, signer) => {
  const signature = await web3.eth.sign(message, signer)
  return fixSignature(signature)
}

describe('Multisig Factory', async assert => {
  const [ owner1, owner2, owner3 ] = await web3.eth.getAccounts()

  console.log(`deploy new token from ${owner1}`)
  const token = await Token.new({ from: owner1 })

  console.log(`deploy new fabric for token ${token.address}`)
  const fabric = await MultisigFactory.new(token.address, { from: owner1 })

  console.log(`deploy new multisig from fabric ${fabric.address}`)
  const { logs } = await fabric.create([owner1, owner2, owner3], { from: owner1 })

  const multisigAddress = logs[0].args.multisig

  console.log(`instantiate multisig at ${multisigAddress}`)
  const multisig = await Multisig.at(multisigAddress)

  console.log('\n')

  assert({
    given: 'deployed multisig',
    should: 'have correct owners',
    actual: await multisig.getOwners(),
    expected: [owner1, owner2, owner3]
  })

  assert({
    given: 'deployed multisig',
    should: 'have correct token',
    actual: await multisig.getToken(),
    expected: token.address
  })

  assert({
    given: 'deployed multisig',
    should: 'fire created event',
    actual: logs[0].event,
    expected: 'Created'
  })
})

describe('Multisig 2/2', async assert => {
  const emptyOwner = '0x0000000000000000000000000000000000000000'
  const value = 1000

  const [ firstOwner, secondOwner ] = await web3.eth.getAccounts()

  console.log(`deploy new token for ${firstOwner}`)
  const token = await Token.new({ from: firstOwner })

  console.log(`deploy new multisig for ${firstOwner} and ${secondOwner}`)
  const multisig = await Multisig.new(
    token.address,
    firstOwner, secondOwner, emptyOwner,
    { from: firstOwner }
  )

  const owners = await multisig.getOwners();

  console.log(`transfer from ${firstOwner} to ${multisig.address}`)
  await token.transfer(multisig.address, value, { from: firstOwner })

  const fundedBalance = await token.balanceOf(multisig.address);

  console.log(`prepare message for transaction to ${secondOwner} with value of ${value}`)
  const rawMessage = await multisig.prepare(secondOwner, value)

  console.log(`sign ${rawMessage} by ${firstOwner}`)
  const firstSignature = await sign(rawMessage, firstOwner)

  console.log(`sign ${rawMessage} by ${secondOwner}`)
  const secondSignature = await sign(rawMessage, secondOwner)

  console.log(`send transaction to ${secondOwner} with value of ${value} using ${firstSignature} and ${secondSignature}`)
  const { logs } = await multisig.send(secondOwner, value, firstSignature, secondSignature, { from: firstOwner })

  const finalBalance = await token.balanceOf(multisig.address);

  assert({
    given: 'initialized multisig',
    should: 'have correct owners',
    actual: owners,
    expected: [firstOwner, secondOwner, emptyOwner]
  })

  assert({
    given: 'funded balance',
    should: 'have increased balance',
    actual: Number(fundedBalance),
    expected: value
  })

  assert({
    given: 'send transaction',
    should: 'have decreased balance',
    actual: Number(finalBalance),
    expected: 0
  })

  assert({
    given: 'send transaction',
    should: 'fire send event',
    actual: logs[0].event,
    expected: 'Send'
  })
})

describe('Multisig 2/3', async assert => {
  const value = 10000

  const [ firstOwner, secondOwner, thirdOwner ] = await web3.eth.getAccounts()

  console.log(`deploy new token by ${firstOwner}`)
  const token = await Token.new({ from: firstOwner })

  console.log(`deploy new 2/3 multisig (${firstOwner}, ${secondOwner}, ${thirdOwner})`)
  const multisig = await Multisig.new(
    token.address,
    firstOwner, secondOwner, thirdOwner,
    { from: thirdOwner }
  )

  console.log(`fund multisig by ${firstOwner} with value of ${value}`)
  await token.transfer(multisig.address, value, { from: firstOwner })

  console.log(`prepare message for sending value of ${value} to ${secondOwner}`)
  const messageHash = await multisig.prepare(secondOwner, value)

  console.log(`sign ${messageHash} by ${firstOwner}`)
  const firstSignature = await sign(messageHash, firstOwner)

  console.log(`sign ${messageHash} by ${secondOwner}`)
  const secondSignature = await sign(messageHash, secondOwner)

  console.log(`sign ${messageHash} by ${thirdOwner}`)
  const thirdSignature = await sign(messageHash, thirdOwner)

  console.log(`try broadcast transaction with duplicate signatures`)
  try {
    await multisig.send(secondOwner, value, secondSignature, secondSignature, { from: secondOwner })
  } catch (err) {
    console.log(`invalid transaction failed as expected`)
  }

  console.log(`broadcast transaction with signatures of ${secondOwner} and ${thirdOwner}`)
  const { logs } = await multisig.send(secondOwner, value, secondSignature, thirdSignature, { from: secondOwner })

  assert({
    given: 'broadcasted transaction',
    should: 'fire send event',
    actual: logs[0].event,
    expected: 'Send'
  })
})
