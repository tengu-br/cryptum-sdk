const nock = require('nock')
const chai = require('chai')
var chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const assert = chai.assert
const AxiosApi = require('../../../axios')
const TransactionController = require('../../../src/features/transaction/controller')
const { Protocol, CUSD_CONTRACT_ADDRESS } = require('../../../src/services/blockchain/constants')
const { getWallets, config } = require('../../wallet/constants')
const txController = new TransactionController(config)
const axiosApi = new AxiosApi(config)
const baseUrl = axiosApi.getBaseUrl(config.enviroment)
let wallets = {}

describe.only('Celo transfer transactions', () => {
  before(async () => {
    wallets = await getWallets()

    nock(baseUrl)
      .get(`/wallet/${wallets.celo.address}/info`)
      .query({ protocol: Protocol.CELO })
      .reply(200, {
        nonce: '2',
      })
      .persist()
    nock(baseUrl)
      .get(`/fee`)
      .query({
        from: wallets.celo.address,
        destination: '0x3f2f3D45196D7B99D0a615e8f530165eCb93e772',
        amount: '0.1',
        method: 'transferWithComment',
        params: ['0x3f2f3D45196D7B99D0a615e8f530165eCb93e772', '100000000000000000', 'create-transfer'],
        protocol: Protocol.CELO,
      })
      .reply(200, {
        gas: 21000,
        gasPrice: '4000000',
        chainId: 44787,
      })
      .persist()
    nock(baseUrl)
      .get(`/fee`)
      .query({
        from: wallets.celo.address,
        destination: '0x3f2f3D45196D7B99D0a615e8f530165eCb93e772',
        amount: '0.01',
        contractAddress: CUSD_CONTRACT_ADDRESS.testnet,
        method: 'transfer',
        params: ['0x3f2f3D45196D7B99D0a615e8f530165eCb93e772', '10000000000000000'],
        protocol: Protocol.CELO,
      })
      .reply(200, {
        gas: 21000,
        gasPrice: '4000000',
        chainId: 44787,
      })
      .persist()
    nock(baseUrl)
      .get(`/fee`)
      .query({
        from: wallets.celo.address,
        destination: '0x3f2f3D45196D7B99D0a615e8f530165eCb93e772',
        amount: '0.01',
        contractAddress: '0x07274039422F722076863ADa0b4dB77ad6c163dc',
        method: 'transfer',
        params: ['0x3f2f3D45196D7B99D0a615e8f530165eCb93e772', '10000000000000000'],
        protocol: Protocol.CELO,
      })
      .reply(200, {
        gas: 21000,
        gasPrice: '4000000',
        chainId: 44787,
      })
      .persist()
  })
  after(() => {
    nock.isDone()
  })

  it('create transfer celo', async () => {
    const transaction = await txController.createCeloTransferTransaction({
      wallet: wallets.celo,
      tokenSymbol: 'CELO',
      amount: '0.1',
      destination: '0x3f2f3D45196D7B99D0a615e8f530165eCb93e772',
      memo: 'create-transfer',
      testnet: true,
    })
    assert.include(transaction.signedTx, '0x')
    console.log(await txController.sendTransaction(transaction))
  })
  it('create transfer celo and pay fee with cusd', async () => {
    const transaction = await txController.createCeloTransferTransaction({
      wallet: wallets.celo,
      tokenSymbol: 'cUSD',
      amount: '0.01',
      destination: '0x3f2f3D45196D7B99D0a615e8f530165eCb93e772',
      feeCurrency: 'cUSD',
      testnet: true,
    })
    assert.include(transaction.signedTx, '0x')
    console.log(await txController.sendTransaction(transaction))
  })
  it('create transfer token', async () => {
    const transaction = await txController.createCeloTransferTransaction({
      wallet: wallets.celo,
      tokenSymbol: 'MTK',
      amount: '0.01',
      destination: '0x3f2f3D45196D7B99D0a615e8f530165eCb93e772',
      contractAddress: '0x07274039422F722076863ADa0b4dB77ad6c163dc',
      testnet: true,
    })
    assert.include(transaction.signedTx, '0x')
    console.log(await txController.sendTransaction(transaction))
  })
})