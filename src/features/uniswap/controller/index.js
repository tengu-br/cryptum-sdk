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
const { validateUniswapCreatePool, validateUniswapGetPools, validateUniswapGetSwapQuotation, validateUniswapMintPosition, validateGetTokenIds, validategetPosition, validateCollectFees, validateIncreaseLiquidity, validateDecreaseLiquidity, validateGetPositions, validateGetPosition, validateSwap } = require('../../../services/validations/uniswap')


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

    const { protocol, wallet, fee, tokenA, tokenB, price } = input
    const data = { from: wallet.address, tokenA, tokenB, fee, price }
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
   * Mints a position relative to a liquidity pool
   * @param {import('../entity').MintPositionInput} input
   * @returns {Promise<import('../../transaction/entity').TransactionResponse>}
   * 
   * @description
   * Mints a position relative to a liquidity pool
   */
  async mintPosition(input) {
    validateUniswapMintPosition(input)
    const tc = getTransactionControllerInstance(this.config)

    const { protocol, wallet, amountTokenA, amountTokenB, slippage, pool, recipient, minPriceDelta, maxPriceDelta, wrapped } = input
    const data = { from: wallet.address, amountTokenA, amountTokenB, minPriceDelta, maxPriceDelta, slippage, pool, recipient: recipient ? recipient : wallet.address, wrapped}
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
    return response
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
    const { wallet, protocol, tokenIn, tokenOut, amountIn, amountOut, deadline, slippage, recipient } = input
    const data = { tokenIn, tokenOut, amountIn, amountOut, slippage, deadline, recipient: recipient ? recipient : wallet.address }
    const response = await makeRequest(
      {
        method: 'post',
        url: `/contract/uniswap/getSwapQuotation?protocol=${protocol}`,
        body: data, config: this.config
      })
    return response
  }

  /**
 * Get All Uniswap Token Ids By owner address
 * @param {import('../entity').GetTokenIdsInput} input
 * @returns {Promise<import('../../transaction/entity').CreateGetTokenIds>}
 * 
 * @description
 * Returns All the token ids owned by a wallet address
 */
  async getTokenIds(input) {
    validateGetTokenIds(input)
    const { protocol, ownerAddress } = input
    const data = { protocol, ownerAddress }
    const response = await makeRequest(
      {
        method: 'post',
        url: `/contract/uniswap/getTokenIds?protocol=${protocol}`,
        body: data, config: this.config
      })
    return response
  }

  /**
   * Get Uniswap Pool Positions by owner address (optional:filter by pool)
   * @param {import('../entity').GetPositionsInput} input
   * @returns {Promise<import('../../transaction/entity').CreateGetPositions>}
   * 
   * @description
   * Returns pool positions and token ids from owner wallet address
   */
  async getPositions(input) {
    validateGetPositions(input)
    const { protocol, ownerAddress, poolAddress } = input
    const data = { protocol, ownerAddress, poolAddress }
    const response = await makeRequest(
      {
        method: 'post',
        url: `/contract/uniswap/getPositions?protocol=${protocol}`,
        body: data, config: this.config
      })
    return response
  }

  /**
   * Reads a position from a tokenId 
   * @param {import('../entity').GetPositionInput} input
   * @returns {Promise<import('../../transaction/entity').CreateGetPosition>}
   * 
   * @description
   * Returns the position infos
   */
  async getPosition(input) {
    validateGetPosition(input)
    const { protocol, tokenId } = input
    const data = { protocol, tokenId }
    const response = await makeRequest(
      {
        method: 'post',
        url: `/contract/uniswap/getPosition?protocol=${protocol}`,
        body: data, config: this.config
      })
    return response
  }

  /**
   * Collect fees earned by providing liquidity to a specific pool 
   * @param {import('../entity').CollectFeesInput} input
   * @returns {Promise<import('../../transaction/entity').CollectFeesResponse>}
   * 
   * @description
   * Collect the total amount of fees rewarded for a given position TokenID
   */
  async collectFees(input) {
    validateCollectFees(input)
    const tc = getTransactionControllerInstance(this.config)
    const { protocol, wallet, tokenId, wrapped } = input
    const data = { from: wallet.address, tokenId, wrapped }
    const { rawTransaction } = await makeRequest(
      {
        method: 'post',
        url: `/contract/uniswap/collectFees?protocol=${protocol}`,
        body: data, config: this.config
      })
    if (rawTransaction === "Execution Reverted: The position dont have fees to be collected") {
      return rawTransaction
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
    return await tc.sendTransaction(
      new SignedTransaction({
        signedTx, protocol, type: TransactionType.MINT_POSITION
      })
    )
  }

  /**
   * Increase liquidity from pair tokens in a specific pool
   * @param {import('../entity').IncreaseLiquidityInput} input
   * @returns {Promise<import('../../transaction/entity').IncreaseLiquidityResponse>}
   * 
   * @description
   * Increases liquidity for token0 and token1 given the position TokenID from pool
   */
  async increaseLiquidity(input) {
    validateIncreaseLiquidity(input)
    const tc = getTransactionControllerInstance(this.config)
    const { protocol, wallet, tokenId, token0amount, token1amount, slippage, wrapped } = input
    const data = { from: wallet.address, tokenId, token0amount, token1amount, slippage, wrapped }
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
   * @param {import('../entity').DecreaseLiquidityInput} input
   * @returns {Promise<import('../../transaction/entity').DecreaseLiquidityResponse>}
   * 
   * @description
   * Decreases a percentage of the token pair (token0, token1) liquidity from a specific position(tokenId)
   */
  async decreaseLiquidity(input) {
    validateDecreaseLiquidity(input)
    const tc = getTransactionControllerInstance(this.config)
    const { protocol, wallet, tokenId, percentageToDecrease, recipient, slippage, burnToken, wrapped } = input
    const data = { from: wallet.address, tokenId, percentageToDecrease, recipient: recipient ? recipient : wallet.address, slippage, burnToken: burnToken ? burnToken : false, wrapped }
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

    /**
   * Exucutes a swap from a quotationObject
   * @param {import('../entity').SwapInput} input
   * @returns {Promise<import('../../transaction/entity').SwapResponse>}
   * 
   * @description
   * Executes a swap 
   */
  async swap(input) {
    const { transaction, wallet } = input
    validateSwap(input)
    const tc = getTransactionControllerInstance(this.config)
    let protocol
    let value
    let calldata
    let tokenIn
    let tokenOut
    let tokenInAmount 
    let tokenOutAmount 

    if (transaction.hasOwnProperty('swapTransaction') && transaction.hasOwnProperty('swapQuotation')) {
      protocol = transaction.swapTransaction.protocol
      value = transaction.swapTransaction.value
      calldata = transaction.swapTransaction.calldata
      tokenIn = transaction.swapTransaction.tokenIn
      tokenOut = transaction.swapTransaction.tokenOut
      tokenInAmount = transaction.swapQuotation.tokenIn
      tokenOutAmount = transaction.swapQuotation.tokenOut
    } else {
      throw new InvalidException('Please assign the full getSwapQuotation Object to the "transaction" parameter of this function')
    }
    const data = { from: wallet.address, value, calldata, tokenIn, tokenInAmount, tokenOut, tokenOutAmount }
    const { rawTransaction } = await makeRequest(
      {
        method: 'post',
        url: `/contract/uniswap/swap?protocol=${protocol}`,
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