const path = require('path');
const { bsv, literal2Asm, buildContractClass, lockScriptTx, unlockScriptTx, getSighashPreimage, getSignature, showError } = require('scrypttest');
const { genPrivKey, num2bin, DataLen } = require('../testHelper');

// private key on testnet in WIF
const key = ''
if (!key) {
    genPrivKey()
}

(async() => {
    const privateKey1 = new bsv.PrivateKey.fromRandom('testnet')
    const publicKey1 = bsv.PublicKey.fromPrivateKey(privateKey1)
    const privateKey2 = new bsv.PrivateKey.fromRandom('testnet')
    const publicKey2 = bsv.PublicKey.fromPrivateKey(privateKey2)
    
    try {
        // get locking script
        const Token = buildContractClass(path.join(__dirname, '../../contracts/token.scrypt'))
        const token = new Token()

        // code part
        const lockingScriptCodePart = token.getLockingScript()
        
        // append state as passive data part
        // initial token supply 100: publicKey1 has 100, publicKey2 0
        let lockingScript = lockingScriptCodePart + ' OP_RETURN ' + toHex(publicKey1) + num2bin(100, DataLen) + toHex(publicKey2) + num2bin(0, DataLen)
        token.setLockingScript(lockingScript)
        
        let amount = 10000
        const FEE = amount / 10
        
        // lock fund to the script
        let lockingTxid = await lockScriptTx(lockingScript, key, amount)
        console.log('funding txid:      ', lockingTxid)
        
        // transfer 40 tokens from publicKey1 to publicKey2
        {
            const newLockingScript = lockingScriptCodePart + ' OP_RETURN ' + toHex(publicKey1) + num2bin(60, DataLen) + toHex(publicKey2) + num2bin(40, DataLen)
            const newAmount = amount - FEE
            const preimage = getSighashPreimage(lockingTxid, lockingScript, amount, newLockingScript, newAmount)
            const sig1 = getSignature(lockingTxid, privateKey1, lockingScript, amount, newLockingScript, newAmount)
            const unlockingScript = [toHex(publicKey1), sig1, toHex(publicKey2), literal2Asm(40), preimage, literal2Asm(newAmount)].join(' ')
            lockingTxid = await unlockScriptTx(unlockingScript, lockingTxid, lockingScript, amount, newLockingScript, newAmount)
            console.log('transfer txid1:    ', lockingTxid)

            lockingScript = newLockingScript
            amount = newAmount
        }

        // transfer 10 tokens from publicKey2 to publicKey1
        {
            const newLockingScript = lockingScriptCodePart + ' OP_RETURN ' + toHex(publicKey1) + num2bin(70, DataLen) + toHex(publicKey2) + num2bin(30, DataLen)
            const newAmount = amount - FEE
            const preimage = getSighashPreimage(lockingTxid, lockingScript, amount, newLockingScript, newAmount)
            const sig2 = getSignature(lockingTxid, privateKey2, lockingScript, amount, newLockingScript, newAmount)
            const unlockingScript = [toHex(publicKey2), sig2, toHex(publicKey1), literal2Asm(10), preimage, literal2Asm(newAmount)].join(' ')
            lockingTxid = await unlockScriptTx(unlockingScript, lockingTxid, lockingScript, amount, newLockingScript, newAmount)
            console.log('transfer txid2:    ', lockingTxid)
        }

        console.log('Succeeded on testnet')
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()