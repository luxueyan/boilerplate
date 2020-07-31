const path = require('path');
const {
  expect
} = require('chai');
const { bsv } = require('scrypttest');
const {
  readFileSync
} = require('fs');
const {
  buildContractClass,
  Bytes
} = require('scryptjs');

const {
  inputIndex,
  inputSatoshis,
  tx,
  getPreimage,
  toHex,
  num2bin,
  DataLen
} = require('../testHelper');

// make a copy since it will be mutated
const tx_ = bsv.Transaction.shallowCopy(tx)
const outputAmount = 222222

describe('Test sCrypt contract Counter In Javascript', () => {
  let counter, preimage

  before(() => {
    // const Counter = buildContractClass(path.join(__dirname, '../../contracts/counter.scrypt'), tx_, inputIndex, inputSatoshis)
    const Counter = buildContractClass(JSON.parse(readFileSync(path.join(__dirname, '../fixture/autoGen/counter_desc.json')).toString()))
    counter = new Counter()

    // lockingScriptCodePart = counter.getLockingScript()
    // append state as passive data
    // const lockingScript = lockingScriptCodePart + ' OP_RETURN ' + num2bin(0, DataLen)
    // counter.setLockingScript(lockingScript)
    counter.opReturn = num2bin(0, DataLen)

    // const newLockingScript = lockingScriptCodePart + ' OP_RETURN ' + num2bin(1, DataLen)
    const newLockingScript = counter.codePart.toASM() + ' OP_RETURN ' + num2bin(1, DataLen)

    tx_.addOutput(new bsv.Transaction.Output({
      script: bsv.Script.fromASM(newLockingScript),
      satoshis: outputAmount
    }))

    // preimage = getPreimage(tx_, lockingScript)
    preimage = getPreimage(tx_, counter.lockingScript.toASM())

    // set txContext for verify
    counter.txContext = {
      tx: tx_,
      inputIndex,
      inputSatoshis
    }
  });

  it('should succeed when pushing right preimage & amount', () => {
    expect(counter.increment(new Bytes(toHex(preimage)), outputAmount).verify()).to.equal(true);
  });

  it('should fail when pushing wrong preimage', () => {
    expect(counter.increment(new Bytes(toHex(preimage) + '01'), outputAmount).verify()).to.equal(false);
  });

  it('should fail when pushing wrong amount', () => {
    expect(counter.increment(new Bytes(toHex(preimage)), outputAmount - 1).verify()).to.equal(false);
  });
});