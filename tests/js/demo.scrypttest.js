const path = require('path');
const { expect } = require('chai');
const { readFileSync } = require('fs');
const { buildContractClass } = require('scryptjs');

describe('Test sCrypt contract Demo In Javascript', () => {
  let demo;

  before(() => {
    const Demo = buildContractClass(JSON.parse(readFileSync(path.join(__dirname, '../fixture/autoGen/demo_desc.json')).toString()));
    demo = new Demo(7, 4);
  });

  it('should return true', () => {
    expect(demo.add(7 + 4).verify()).to.equal(true);
    expect(demo.sub(7 - 4).verify()).to.equal(true);
  });

  it('should return false', () => {
    expect(demo.add(0).verify()).to.equal(false);
    expect(demo.sub(1).verify()).to.equal(false);
  });
});
