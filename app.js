const BigchainDB = require('bigchaindb-driver')

const API_PATH = 'https://test.ipdb.io/api/v1/'
const conn = new BigchainDB.Connection(API_PATH)

const bip39 = require('bip39')

const runThis = async () => {
    let txCreatedID
    const seed = await bip39.mnemonicToSeed('seedPhrase')
    console.log(seed)
    const alice = new BigchainDB.Ed25519Keypair(seed.slice(0, 32))
    const josh = new BigchainDB.Ed25519Keypair(seed.slice(0, 32))

    const painting = {
        name: 'Meninas',
        author: 'Diego Rodríguez de Silva y Velázquez',
        place: 'Madrid',
        year: '1656'
    }

    const createPaint = async () => {
        // Construct a transaction payload
        const txCreatePaint = BigchainDB.Transaction.makeCreateTransaction(
            // Asset field
            {
                painting,
            },
            // Metadata field, contains information about the transaction itself
            // (can be `null` if not needed)
            {
                datetime: new Date().toString(),
                location: 'Madrid',
                value: {
                    value_eur: '25000000€',
                    value_btc: '2200',
                }
            },
            // Output. For this case we create a simple Ed25519 condition
            [BigchainDB.Transaction.makeOutput(
                BigchainDB.Transaction.makeEd25519Condition(alice.publicKey))],
            // Issuers
            alice.publicKey
        )
        // The owner of the painting signs the transaction
        const txSigned = BigchainDB.Transaction.signTransaction(txCreatePaint,
            alice.privateKey)

        // Send the transaction off to BigchainDB
        await conn.postTransactionCommit(txSigned)
            .then(res => {
                console.log('Transaction created')
                // console.log(txSigned.id)
                txCreatedID = txSigned.id
                // txSigned.id corresponds to the asset id of the painting
            })
    }
    await createPaint()
    console.log(txCreatedID)
    const transferOwnership = async (txCreatedID, newOwner) => {
        // Get transaction payload by ID
        await conn.getTransaction(txCreatedID)
            .then((txCreated) => {
                const createTranfer = BigchainDB.Transaction.
                    makeTransferTransaction(
                        // The output index 0 is the one that is being spent
                        [{
                            tx: txCreated,
                            output_index: 0
                        }],
                        [BigchainDB.Transaction.makeOutput(
                            BigchainDB.Transaction.makeEd25519Condition(
                                newOwner.publicKey))],
                        {
                            datetime: new Date().toString(),
                            value: {
                                value_eur: '30000000€',
                                value_btc: '2100',
                            }
                        }
                    )
                // Sign with the key of the owner of the painting (Alice)
                const signedTransfer = BigchainDB.Transaction
                    .signTransaction(createTranfer, alice.privateKey)
                return conn.postTransactionCommit(signedTransfer)
            })
            .then(res => {
                console.log('Transfer Transaction created')
                console.log(res.id)
            })
    }
    await transferOwnership(txCreatedID, josh)
}
runThis()

