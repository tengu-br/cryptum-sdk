module.exports.getUniswapControllerInstance = (config) => new Controller(config)
const InvalidException = require('../../../errors/InvalidException')
const { makeRequest } = require('../../../services')
const { signEthereumTx } = require('../../../services/blockchain/ethereum')
const { isTestnet } = require('../../../services/utils')
const { Protocol } = require('../../../services/blockchain/constants')
const Interface = require('./interface')
const { getTransactionControllerInstance } = require('../../transaction/controller')
const { SignedTransaction, TransactionType } = require('../../transaction/entity')
const { signCeloTx } = require('../../../services/blockchain/celo')
const { validateUniswapCreatePool, validateUniswapGetPools, validateUniswapGetSwapQuotation, validateUniswapMintPosition, validateUniswapRemovePosition, validateGetTokenIds, validateReadPosition, validateCollectFees, validateIncreaseLiquidity, validateDecreaseLiquidity } = require('../../../services/validations/uniswap')


class Controller extends Interface {
  /**
   * Creates a Uniswap V3 pool
   * @param {import('../entity').CreatePoolInput} input
   * @returns {Promise<import('../../transaction/entity').CreatePoolResponse>}
   * 
   * @description
   * If pool already existed prior to this call, no transaction will be made and the transaction property will be null
   */
  async createPool(input) {
    validateUniswapCreatePool(input)
    const tc = getTransactionControllerInstance(this.config)

    const { protocol, wallet, fee, tokenA, tokenB, priceNumerator, priceDenominator } = input
    const data = { from: wallet.address, tokenA, tokenB, fee, priceNumerator, priceDenominator }
    const { rawTransaction, pool, initialized } = await makeRequest(
      {
        method: 'post',
        url: `/contract/uniswap/createPool?protocol=${protocol}`,
        body: data, config: this.config
      })

    if (initialized) {
      return {
        transaction: null,
        pool
      }
    }

    let signedTx;
    switch (protocol) {
      case Protocol.CELO:
        signedTx = await signCeloTx(rawTransaction, wallet.privateKey)
        break;
      case Protocol.ETHEREUM:
      case Protocol.POLYGON:
        signedTx = signEthereumTx(rawTransaction, protocol, wallet.privateKey, this.config.environment)
        break;
      default:
        throw new InvalidException('Unsupported protocol')
    }
    return {
      transaction: await tc.sendTransaction(
        new SignedTransaction({
          signedTx, protocol, type: TransactionType.CREATE_POOL
        })),
      pool
    }
  }

  /**
   * Removes a position relative to a liquidity pool
   * @param {import('../entity').MintPositionInput} input
   * @returns {Promise<import('../../transaction/entity').TransactionResponse>}
   */
  async mintPosition(input) {
    validateUniswapMintPosition(input)
    const tc = getTransactionControllerInstance(this.config)

    const { protocol, wallet, amountTokenA, amountTokenB, slippage, pool, recipient, minPriceDelta, maxPriceDelta } = input
    const data = { from: wallet.address, amountTokenA, amountTokenB, minPriceDelta, maxPriceDelta, slippage, pool, recipient: recipient ? recipient : wallet.address }
    const { rawTransaction, amountA, amountB } = await makeRequest(
      {
        method: 'post',
        url: `/contract/uniswap/mintPosition?protocol=${protocol}`,
        body: data, config: this.config
      })


    let signedTx;
    switch (protocol) {
      case Protocol.CELO:
        signedTx = await signCeloTx(rawTransaction, wallet.privateKey)
        break;
      case Protocol.ETHEREUM:
      case Protocol.POLYGON:
        signedTx = signEthereumTx(rawTransaction, protocol, wallet.privateKey, this.config.environment)
        break;
      default:
        throw new InvalidException('Unsupported protocol')
    }
    return await tc.sendTransaction(
      new SignedTransaction({
        signedTx, protocol, type: TransactionType.MINT_POSITION
      })
    )
  }

  /**
   * Removes a position relative to a liquidity pool
   * @param {import('../entity').RemovePositionInput} input
   * @returns {Promise<import('../../transaction/entity').TransactionResponse>}
   */
  async removePosition(input) {
    validateUniswapRemovePosition(input)
    const tc = getTransactionControllerInstance(this.config)

    const { protocol, wallet, slippage, pool, recipient, tokenId, percentageToRemove } = input
    const data = { from: wallet.address, slippage, pool, tokenId, percentageToRemove, recipient: recipient ? recipient : wallet.address }
    const { rawTransaction, amountA, amountB } = await makeRequest(
      {
        method: 'post',
        url: `/contract/uniswap/removePosition?protocol=${protocol}`,
        body: data, config: this.config
      })


    let signedTx;
    switch (protocol) {
      case Protocol.CELO:
        signedTx = await signCeloTx(rawTransaction, wallet.privateKey)
        break;
      case Protocol.ETHEREUM:
      case Protocol.POLYGON:
        signedTx = signEthereumTx(rawTransaction, protocol, wallet.privateKey, this.config.environment)
        break;
      default:
        throw new InvalidException('Unsupported protocol')
    }
    return await tc.sendTransaction(
      new SignedTransaction({
        signedTx, protocol, type: TransactionType.REMOVE_POSITION
      })
    )
  }
  
  /**
   * Get Uniswap Pool Addresses
   * @param {import('../entity').GetPoolsInput} input
   * @returns {Promise<import('../../transaction/entity').CreateGetPoolsResponse>}
   *
   * @description
   * If no Pool Fee is specified, Pool addresses for all possible fee ranges will be returned
   */
  async getPools(input) {
    validateUniswapGetPools(input)
    const { protocol, tokenA, tokenB, poolFee } = input
    const data = { tokenA, tokenB, poolFee }
    const response = await makeRequest(
      {
        method: 'post',
        url: `/contract/uniswap/getPools?protocol=${protocol}`,
        body: data, config: this.config
      })
    return {
      response
    }
  }

  /**
   * Get a Swap Price Quotation using UniSwap Protocol
   * @param {import('../entity').GetSwapQuotationInput} input
   * @returns {Promise<import('../../transaction/entity').CreateGetSwapQuotation>}
   * 
   * @description
   * Returns the quotation for a swap
   */
  async getSwapQuotation(input) {
    validateUniswapGetSwapQuotation(input)
    const { protocol, tokenIn, tokenOut, amount, tradeType } = input
    const data = { tokenIn, tokenOut, amount, tradeType }
    const response = await makeRequest(
      {
        method: 'post',
        url: `/contract/uniswap/getSwapQuotation?protocol=${protocol}`,
        body: data, config: this.config
      })
    return {
      response
    }
  }

  /**
   * Get tokenId from position by owner address (optional:filter by pool)
   * @param {import('../entity').getTokenIds} input
   * @returns {Promise<import('../../transaction/entity').CreateGetTokenIds>}
   * 
   * @description
   * Returns the positions and their token ids of owner address
   */
  async getTokenIds(input) {
    validateGetTokenIds(input)
    const { protocol, ownerAddress, poolAddress} = input
    const data = { protocol, ownerAddress, poolAddress}
    const response = await makeRequest(
      {
        method: 'post',
        url: `/contract/uniswap/getTokenIds?protocol=${protocol}`,
        body: data, config: this.config
      })
    return {
      response
    }
  }

  /**
   * Reads a position from a tokenId 
   * @param {import('../entity').readPosition} input
   * @returns {Promise<import('../../transaction/entity').CreateReadPosition>}
   * 
   * @description
   * Returns the position infos
   */
  async readPosition(input) {
    validateReadPosition(input)
    const { protocol, tokenId } = input
    const data = { protocol, tokenId}
    const response = await makeRequest(
      {
        method: 'post',
        url: `/contract/uniswap/readPosition?protocol=${protocol}`,
        body: data, config: this.config
      })
    return {
      response
    }
  }

  /**
   * Collect fees earned by providing liquidity to a specific pool 
   * @param {import('../entity').collectFees} input
   * @returns {Promise<import('../../transaction/entity').IncreaseLiquidityResponse>}
   * 
   * @description
   * Collect the total amount of fees rewarded for a given position TokenID
   */
  async collectFees(input) {
    validateCollectFees(input)
    const tc = getTransactionControllerInstance(this.config)
    const { protocol, wallet, tokenId } = input
    const data = { from: wallet.address, tokenId }
    const { rawTransaction } = await makeRequest(
      {
        method: 'post',
        url: `/contract/uniswap/collectFees?protocol=${protocol}`,
        body: data, config: this.config
      })
    let signedTx;
    switch (protocol) {
      case Protocol.CELO:
        signedTx = await signCeloTx(rawTransaction, wallet.privateKey)
        break;
      case Protocol.ETHEREUM:
      case Protocol.POLYGON:
        signedTx = signEthereumTx(rawTransaction, protocol, wallet.privateKey, this.config.environment)
        break;
      default:
        throw new InvalidException('Unsupported protocol')
    }
    return await tc.sendTransaction(
      new SignedTransaction({
        signedTx, protocol, type: TransactionType.MINT_POSITION
      })
    )
  }

  /**
   * Increase liquidity from pair tokens in a specific pool
   * @param {import('../entity').increaseLiquidity} input
   * @returns {Promise<import('../../transaction/entity').DecreaseLiquidityResponse>}
   * 
   * @description
   * Increases liquidity for token0 and token1 given the position TokenID from pool
   */
  async increaseLiquidity(input) {
    validateIncreaseLiquidity(input)
    const tc = getTransactionControllerInstance(this.config)
    const { protocol, wallet, tokenId, token0amount, token1amount } = input
    const data = { from: wallet.address, tokenId, token0amount, token1amount }
    const { rawTransaction } = await makeRequest(
      {
        method: 'post',
        url: `/contract/uniswap/increaseLiquidity?protocol=${protocol}`,
        body: data, config: this.config
      })

    let signedTx;
    switch (protocol) {
      case Protocol.CELO:
        signedTx = await signCeloTx(rawTransaction, wallet.privateKey)
        break;
      case Protocol.ETHEREUM:
      case Protocol.POLYGON:
        signedTx = signEthereumTx(rawTransaction, protocol, wallet.privateKey, this.config.environment)
        break;
      default:
        throw new InvalidException('Unsupported protocol')
    }
    return await tc.sendTransaction(
      new SignedTransaction({
        signedTx, protocol, type: TransactionType.MINT_POSITION
      })
    )
  }

  /**
   * Decrease liquidity from pair tokens in a specific pool
   * @param {import('../entity').decreaseLiquidity} input
   * @returns {Promise<import('../../transaction/entity').DecreaseLiquidityResponse>}
   * 
   * @description
   * Decreases a percentage of the token pair (token0, token1) liquidity from a specific position(tokenId)
   */
  async decreaseLiquidity(input) {
    validateDecreaseLiquidity(input)
    const tc = getTransactionControllerInstance(this.config)
    const { protocol, wallet, tokenId, percentageToDecrease } = input
    const data = { from: wallet.address, tokenId, percentageToDecrease }
    const { rawTransaction } = await makeRequest(
      {
        method: 'post',
        url: `/contract/uniswap/decreaseLiquidity?protocol=${protocol}`,
        body: data, config: this.config
      })
    let signedTx;
    switch (protocol) {
      case Protocol.CELO:
        signedTx = await signCeloTx(rawTransaction, wallet.privateKey)
        break;
      case Protocol.ETHEREUM:
      case Protocol.POLYGON:
        signedTx = signEthereumTx(rawTransaction, protocol, wallet.privateKey, this.config.environment)
        break;
      default:
        throw new InvalidException('Unsupported protocol')
    }
    return await tc.sendTransaction(
      new SignedTransaction({
        signedTx, protocol, type: TransactionType.MINT_POSITION
      })
    )
  }
}

module.exports.UniswapController = Controller