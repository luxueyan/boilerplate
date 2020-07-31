const path = require('path');
const { expect } = require('chai');
const { readFileSync } = require('fs');
const { buildContractClass } = require('scryptjs');

describe('Test sCrypt contract Ackermann In Javascript', () => {
  let ackermann;

  before(() => {
    const Ackermann = buildContractClass(JSON.parse(readFileSync(path.join(__dirname, '../fixture/autoGen/ackermann_desc.json')).toString()));
    ackermann = new Ackermann(2, 1);
  });

  it('should return true', () => {
    expect(ackermann.unlock(5).verify()).to.equal(true);
  });

  it('should return false', () => {
    expect(ackermann.unlock(0).verify()).to.equal(false);
  });
});
