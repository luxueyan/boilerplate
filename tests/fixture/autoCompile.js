const { compile } = require('scryptjs');
const glob = require('glob');
const { join } = require('path');
const { exit } = require('process');

function compileAllContracts() {
  const contracts = glob.sync(join(__dirname, '../../contracts/*.scrypt'));
  contracts.forEach(filePath => {
    console.log(`Compiling contract ${filePath} ...`)

    const result = compile(
      { path: filePath },
      { desc: true, outputDir: join(__dirname, 'autoGen') }
    );

    if (result.errors.length > 0) {
      console.log(`Contract ${filePath} compiling failed with errors:`);
      console.log(result.errors);
      exit(1);
    }
  })
}

compileAllContracts();