const path = require('path');
const { bsv, buildContractClass, lockScriptTx, unlockScriptTx, getSighashPreimage, getSignature, showError, literal2Asm } = require('scrypttest');
const { getPreimage, signTx, sendTx, num2bin, genPrivKey, DataLen } = require('../testHelper');
const { split } = require('ts-node');

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
    const privateKey3 = new bsv.PrivateKey.fromRandom('testnet')
    const publicKey3 = bsv.PublicKey.fromPrivateKey(privateKey3)
    
    try {
        // get locking script
        const Token = buildContractClass(path.join(__dirname, '../../contracts/tokenUtxo.scrypt'))
        const token = new Token()

        // code part
        const lockingScriptCodePart = token.getLockingScript()
        
        // append state as passive data part
        // initial token supply 100: publicKey1 has 100, publicKey2 0
        let lockingScript = lockingScriptCodePart + ' OP_RETURN ' + toHex(publicKey1) + num2bin(10, DataLen) + num2bin(90, DataLen)
        token.setLockingScript(lockingScript)
        
        let inputSatoshis = 10000
        const FEE = inputSatoshis / 4
        let outputAmount = Math.floor((inputSatoshis - FEE) / 2)
        
        // lock fund to the script
        const lockingTxid = await lockScriptTx(lockingScript, key, inputSatoshis)
        console.log('funding txid:      ', lockingTxid)
        
        // split one UTXO of 100 tokens into one with 70 tokens and one with 30
        let splitTxid, lockingScript0, lockingScript1
        {
            const tx = new bsv.Transaction()
            tx.addInput(new bsv.Transaction.Input({
                prevTxId: lockingTxid,
                outputIndex: 0,
                script: ''
            }), bsv.Script.fromASM(lockingScript), inputSatoshis)

            lockingScript0 = lockingScriptCodePart + ' OP_RETURN ' + toHex(publicKey2) + num2bin(0, DataLen) + num2bin(70, DataLen)
            tx.addOutput(new bsv.Transaction.Output({
                script: bsv.Script.fromASM(lockingScript0),
                satoshis: outputAmount
            }))
            lockingScript1 = lockingScriptCodePart + ' OP_RETURN ' + toHex(publicKey3) + num2bin(0, DataLen) + num2bin(30, DataLen)
            tx.addOutput(new bsv.Transaction.Output({
                script: bsv.Script.fromASM(lockingScript1),
                satoshis: outputAmount
            }))
            
            const preimage = getPreimage(tx, lockingScript, 0, inputSatoshis)
            const sig1 = signTx(tx, privateKey1, lockingScript, 0, inputSatoshis)
            const unlockingScript = [toHex(sig1), toHex(publicKey2), literal2Asm(70), literal2Asm(outputAmount), toHex(publicKey3),
                                        literal2Asm(30), literal2Asm(outputAmount), toHex(preimage), literal2Asm(1)].join(' ')
            tx.inputs[0].setScript(bsv.Script.fromASM(unlockingScript));
            splitTxid = await sendTx(tx);
            console.log('split txid1:       ', splitTxid)
        }

        inputSatoshis = outputAmount
        outputAmount -= FEE
        // merge one UTXO with 70 tokens and one with 30 into a single UTXO of 100 tokens
        {
            const tx = new bsv.Transaction()
            tx.addInput(new bsv.Transaction.Input({
                prevTxId: splitTxid,
                outputIndex: 0,
                script: ''
            }), bsv.Script.fromASM(lockingScript0), inputSatoshis)
              
            tx.addInput(new bsv.Transaction.Input({
                prevTxId: splitTxid,
                outputIndex: 1,
                script: ''
            }), bsv.Script.fromASM(lockingScript1), inputSatoshis)
    
            const lockingScript2 = lockingScriptCodePart + ' OP_RETURN ' + toHex(publicKey1) + num2bin(70, DataLen) + num2bin(30, DataLen)
            tx.addOutput(new bsv.Transaction.Output({
                script: bsv.Script.fromASM(lockingScript2),
                satoshis: outputAmount
            }))
            
            // input 0
            {
                const preimage = getPreimage(tx, lockingScript0, 0, inputSatoshis)
                const sig2 = signTx(tx, privateKey2, lockingScript0, 0, inputSatoshis)
                const unlockingScript = [toHex(sig2), toHex(publicKey1), literal2Asm(true), literal2Asm(30), literal2Asm(outputAmount), toHex(preimage), literal2Asm(2)].join(' ')
                tx.inputs[0].setScript(bsv.Script.fromASM(unlockingScript));
            }

            // input 1
            {
                const preimage = getPreimage(tx, lockingScript1, 1, inputSatoshis)
                const sig3 = signTx(tx, privateKey3, lockingScript1, 1, inputSatoshis)
                const unlockingScript = [toHex(sig3), toHex(publicKey1),  literal2Asm(false), literal2Asm(70), literal2Asm(outputAmount), toHex(preimage), literal2Asm(2)].join(' ')
                tx.inputs[1].setScript(bsv.Script.fromASM(unlockingScript));
            }

            const mergeTxid = await sendTx(tx);
            console.log('merge txid1:       ', mergeTxid)
        }

        console.log('Succeeded on testnet')
    } catch (error) {
        console.log('Failed on testnet')
        showError(error)
    }
})()