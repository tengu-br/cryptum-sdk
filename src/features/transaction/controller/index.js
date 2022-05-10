const { handleRequestError, getApiMethod, mountHeaders } = require('../../../services')
const requests = require('./requests.json')
const Interface = require('./interface')
const {
  Protocol,
  TRANSFER_METHOD_ABI,
  TRANSFER_COMMENT_METHOD_ABI,
  CUSD_CONTRACT_ADDRESS,
  CEUR_CONTRACT_ADDRESS,
} = require('../../../services/blockchain/constants')
const { getTokenAddress, toWei, toHTRUnit } = require('../../../services/blockchain/utils')

const {
  FeeResponse,
  TransactionResponse,
  SignedTransaction,
  UTXO,
  TransactionType,
  SmartContractCallResponse,
  Input,
} = require('../entity')
const {
  buildStellarTransferTransaction,
  buildStellarTrustlineTransaction,
} = require('../../../services/blockchain/stellar')
const {
  buildRippleTransferTransaction,
  buildRippleTrustlineTransaction,
} = require('../../../services/blockchain/ripple')
const {
  buildAvaxCChainTransferTransaction,
  buildBscTransferTransaction,
  buildEthereumTransferTransaction,
  buildEthereumSmartContractTransaction,
  buildEthereumSmartContractDeployTransaction,
} = require('../../../services/blockchain/ethereum')
const {
  buildSolanaTransferTransaction, deploySolanaToken, deploySolanaNFT, mintEdition, buildSolanaTokenBurnTransaction, updateMetaplexMetadata, buildSolanaCustomProgramInteraction, mintSolanaToken, updateAuctionAuthority, updateVaultAuthority, validateAuction, whitelistCreators, emptyPaymentAccount,
} = require('../../../services/blockchain/solana')
const { buildBitcoinTransferTransaction } = require('../../../services/blockchain/bitcoin')
const WalletController = require('../../wallet/controller')
const { GenericException, HathorException } = require('../../../../errors')
const {
  buildCeloSmartContractTransaction,
  buildCeloTransferTransaction,
  buildCeloSmartContractDeployTransaction,
} = require('../../../services/blockchain/celo')
const {
  validateCeloTransferTransactionParams,
  validateBitcoinTransferTransactionParams,
  validateSignedTransaction,
  validateSmartContractTransactionParams,
  validateSmartContractCallParams,
  validateSmartContractDeployTransactionParams,
  validateTokenDeployTransactionParams,
  validateRippleTransferTransactionParams,
  validateStellarTransferTransactionParams,
  validateStellarTrustlineTransactionParams,
  validateRippleTrustlineTransactionParams,
  validateEthereumTransferTransactionParams,
  validateHathorTokenTransactionFromUTXO,
  validateHathorTokenTransactionFromWallet,
  validateHathorTransferTransactionFromWallet,
  validateHathorTransferTransactionFromUTXO,
  validateSolanaTransferTransaction,
  validateSolanaDeployTransaction,
  validateSolanaDeployNFT,
  validateSolanaCustomProgramInput,
} = require('../../../services/validations')

const { buildHathorTransferTransaction, buildHathorTokenTransaction } = require('../../../services/blockchain/hathor')
const { buildOperation, buildOperationFromInputs } = require('../../../services/blockchain/cardano')
const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs')

class Controller extends Interface {
  /**
   * Method to send an transaction to Cryptum
   *
   * @param {SignedTransaction} transaction object with all transaction data
   * @param {Protocol} transaction.protocol
   * @returns {Promise<TransactionResponse>}
   */
  async sendTransaction(transaction) {
    try {
      validateSignedTransaction(transaction)
      const apiRequest = getApiMethod({
        requests,
        key: 'sendTransaction',
        config: this.config,
      })
      const headers = mountHeaders(this.config.apiKey)
      const { protocol, signedTx, type } = transaction
      const response = await apiRequest(
        requests.sendTransaction.url,
        { signedTx, type },
        {
          headers,
          params: { protocol },
        }
      )
      return new TransactionResponse(response.data)
    } catch (error) {
      handleRequestError(error)
    }
  }
  /**
   * Method to get fee info
   *
   * @param {object} input
   * @param {string} input.type
   * @param {string=} input.from
   * @param {string=} input.destination
   * @param {string=} input.assetSymbol
   * @param {string=} input.contractAddress
   * @param {string=} input.method
   * @param {Array=} input.params
   * @param {Protocol} input.protocol
   * @param {string} input.amount
   * @param {string=} input.contractName
   * @param {string=} input.source
   * @param {string=} input.feeCurrency
   */
  async getFee({
    type = null,
    from = null,
    amount = null,
    destination = null,
    contractAddress = null,
    contractAbi = null,
    method = null,
    params = null,
    protocol,
    contractName = null,
    source = null,
    feeCurrency = null,
    tokenType = null,
  }) {
    try {
      const apiRequest = getApiMethod({
        requests,
        key: 'getFee',
        config: this.config,
      })
      const headers = mountHeaders(this.config.apiKey)
      const data = {}
      if (type) data.type = type
      if (from) data.from = from
      if (destination) data.destination = destination
      if (amount) data.amount = amount
      if (contractAddress) data.contractAddress = contractAddress
      if (contractAbi) data.contractAbi = contractAbi
      if (method) data.method = method
      if (params) data.params = params
      if (contractName) data.contractName = contractName
      if (source) data.source = source
      if (feeCurrency) data.feeCurrency = feeCurrency
      if (tokenType) data.tokenType = tokenType
      const response = await apiRequest(`${requests.getFee.url}?protocol=${protocol}`, data, {
        headers,
      })
      return new FeeResponse(response.data)
    } catch (error) {
      handleRequestError(error)
    }
  }
  /**
   * Get UTXOs from address
   *
   * @param {object} input
   * @param {string} input.address
   * @param {Protocol} input.protocol
   * @returns {Promise<Array<import('../entity').UTXOResponse>>}
   */
  async getUTXOs({ address, protocol }) {
    try {
      const apiRequest = getApiMethod({
        requests,
        key: 'getUTXOs',
        config: this.config,
      })
      const headers = mountHeaders(this.config.apiKey)
      const response = await apiRequest(`${requests.getUTXOs.url}/${address}?protocol=${protocol}`, {
        headers,
      })
      return Array.isArray(response.data) && response.data.map((utxo) => new UTXO(utxo))
    } catch (error) {
      handleRequestError(error)
    }
  }
  /**
   * Get transaction by hash (tx id)
   *
   * @param {object} input
   * @param {string} input.hash transaction hash
   * @param {Protocol} input.protocol blockchain protocol
   */
  async getTransactionByHash({ hash, protocol }) {
    try {
      const apiRequest = getApiMethod({
        requests,
        key: 'getTransactionByHash',
        config: this.config,
      })
      const headers = mountHeaders(this.config.apiKey)
      const response = await apiRequest(`${requests.getTransactionByHash.url}/${hash}?protocol=${protocol}`, {
        headers,
      })
      return response.data
    } catch (error) {
      handleRequestError(error)
    }
  }
  /**
   * Get block info
   *
   * @param {object} input
   * @param {string} input.block block number or hash
   * @param {Protocol} input.protocol blockchain protocol
   */
  async getBlock({ block, protocol }) {
    try {
      const apiRequest = getApiMethod({
        requests,
        key: 'getBlock',
        config: this.config,
      })
      const headers = mountHeaders(this.config.apiKey)
      const response = await apiRequest(`${requests.getBlock.url}/${block}?protocol=${protocol}`, {
        headers,
      })
      return response.data
    } catch (error) {
      handleRequestError(error)
    }
  }
  /**
   * Create stellar trustline transaction
   *
   * @param {import('../entity').StellarTrustlineTransactionInput} input
   * @returns {Promise<SignedTransaction>} signed transaction data
   */
  async createStellarTrustlineTransaction(input) {
    validateStellarTrustlineTransactionParams(input)
    const { wallet, assetSymbol, issuer, fee, limit, memo, testnet } = input
    const protocol = Protocol.STELLAR
    const info = await new WalletController(this.config).getWalletInfo({
      address: wallet.publicKey,
      protocol,
    })
    let networkFee = fee
    if (!networkFee) {
      const { estimateValue } = await this.getFee({
        type: TransactionType.CHANGE_TRUST,
        protocol,
      })
      networkFee = estimateValue
    }
    const signedTx = await buildStellarTrustlineTransaction({
      fromPublicKey: wallet.publicKey,
      fromPrivateKey: wallet.privateKey,
      assetSymbol,
      issuer,
      limit,
      memo,
      fee: networkFee,
      sequence: info.sequence,
      testnet: testnet !== undefined ? testnet : this.config.environment === 'development',
    })
    return new SignedTransaction({ signedTx, protocol, type: TransactionType.CHANGE_TRUST })
  }
  /**
   * Create ripple trustline transaction
   *
   * @param {import('../entity').RippleTrustlineTransactionInput} input
   * @returns {Promise<SignedTransaction>} signed transaction data
   */
  async createRippleTrustlineTransaction(input) {
    validateRippleTrustlineTransactionParams(input)
    const { wallet, assetSymbol, issuer, fee, limit, memo, testnet } = input
    const protocol = Protocol.RIPPLE
    const info = await new WalletController(this.config).getWalletInfo({
      address: wallet.address,
      protocol,
    })
    let networkFee = fee
    if (!networkFee) {
      const { estimateValue } = await this.getFee({
        type: TransactionType.CHANGE_TRUST,
        protocol,
      })
      networkFee = estimateValue
    }
    const signedTx = await buildRippleTrustlineTransaction({
      fromAddress: wallet.address,
      fromPrivateKey: wallet.privateKey,
      assetSymbol,
      issuer,
      limit,
      memo,
      fee: networkFee,
      sequence: info.sequence,
      maxLedgerVersion: info.ledgerCurrentIndex + 10,
      testnet: testnet !== undefined ? testnet : this.config.environment === 'development',
    })
    return new SignedTransaction({ signedTx, protocol, type: TransactionType.CHANGE_TRUST })
  }
  /**
   * Create stellar transfer transaction
   *
   * @param {import('../entity').StellarTransferTransactionInput} input
   * @returns {Promise<SignedTransaction>} signed transaction data
   */
  async createStellarTransferTransaction(input) {
    validateStellarTransferTransactionParams(input)
    const { wallet, assetSymbol, issuer, amount, destination, memo, fee, testnet, createAccount } = input
    const protocol = Protocol.STELLAR
    const info = await new WalletController(this.config).getWalletInfo({
      address: wallet.publicKey,
      protocol,
    })
    let networkFee = fee
    if (!networkFee) {
      const { estimateValue } = await this.getFee({
        type: TransactionType.TRANSFER,
        protocol,
      })
      networkFee = estimateValue
    }
    const signedTx = await buildStellarTransferTransaction({
      fromPublicKey: wallet.publicKey,
      fromPrivateKey: wallet.privateKey,
      assetSymbol,
      issuer,
      amount,
      destination,
      memo,
      fee: networkFee,
      sequence: info.sequence,
      testnet: testnet !== undefined ? testnet : this.config.environment === 'development',
      createAccount,
    })
    return new SignedTransaction({ signedTx, protocol, type: TransactionType.TRANSFER })
  }
  /**
   * Create ripple transfer transaction
   *
   * @param {import('../entity').RippleTransferTransactionInput} input
   * @returns {Promise<SignedTransaction>} signed transaction data
   */
  async createRippleTransferTransaction(input) {
    validateRippleTransferTransactionParams(input)
    const { wallet, assetSymbol, issuer, amount, destination, memo, fee, testnet } = input
    const protocol = Protocol.RIPPLE
    const info = await new WalletController(this.config).getWalletInfo({
      address: wallet.address,
      protocol,
    })
    let networkFee = fee
    if (!networkFee) {
      const { estimateValue } = await this.getFee({
        type: TransactionType.TRANSFER,
        protocol,
      })
      networkFee = estimateValue
    }
    const signedTx = await buildRippleTransferTransaction({
      fromAddress: wallet.address,
      fromPrivateKey: wallet.privateKey,
      assetSymbol,
      issuer,
      amount,
      destination,
      memo,
      fee: networkFee,
      sequence: info.sequence,
      maxLedgerVersion: info.ledgerCurrentIndex + 10,
      testnet: testnet !== undefined ? testnet : this.config.environment === 'development',
    })
    return new SignedTransaction({ signedTx, protocol, type: TransactionType.TRANSFER })
  }
  /**
   * Create celo transfer transaction
   *
   * @param {import('../entity').CeloTransferTransactionInput} input
   * @returns {Promise<SignedTransaction>} signed transaction data
   */
  async createCeloTransferTransaction(input) {
    validateCeloTransferTransactionParams(input)
    let { wallet, tokenSymbol, amount, destination, memo, fee, testnet, contractAddress, feeCurrency } = input
    testnet = testnet !== undefined ? testnet : this.config.environment === 'development'
    const protocol = Protocol.CELO
    let type, method, params, value, contractAbi
    const amountWei = toWei(amount).toString()
    if (tokenSymbol === 'CELO') {
      type = memo ? TransactionType.CALL_CONTRACT_METHOD : TransactionType.TRANSFER
      method = memo ? 'transferWithComment' : null
      params = memo ? [destination, amountWei, memo] : null
      value = memo ? null : amount
      contractAddress = memo ? getTokenAddress(Protocol.CELO, tokenSymbol, testnet) : null
      contractAbi = memo ? TRANSFER_COMMENT_METHOD_ABI : null
    } else {
      type = TransactionType.CALL_CONTRACT_METHOD
      method = memo ? 'transferWithComment' : 'transfer'
      params = memo ? [destination, amountWei, memo] : [destination, amountWei]
      contractAbi = memo ? TRANSFER_COMMENT_METHOD_ABI : TRANSFER_METHOD_ABI

      if (['cUSD', 'cEUR'].includes(tokenSymbol)) {
        contractAddress = getTokenAddress(Protocol.CELO, tokenSymbol, testnet)
      }
    }
    if (feeCurrency) {
      const network = testnet ? 'testnet' : 'mainnet'
      feeCurrency =
        feeCurrency === 'cUSD'
          ? CUSD_CONTRACT_ADDRESS[network]
          : feeCurrency === 'cEUR'
            ? CEUR_CONTRACT_ADDRESS[network]
            : feeCurrency
    }
    const { info, networkFee } = await this._getFeeInfo({
      wallet,
      type,
      destination,
      amount: value,
      contractAddress,
      contractAbi,
      method,
      params,
      testnet,
      fee,
      feeCurrency,
      protocol,
    })
    const signedTx = await buildCeloTransferTransaction({
      fromPrivateKey: wallet.privateKey,
      tokenSymbol,
      amount,
      destination,
      memo,
      fee: networkFee,
      nonce: info.nonce,
      testnet,
      contractAddress,
      feeCurrency,
    })
    return new SignedTransaction({ signedTx, protocol, type: TransactionType.TRANSFER })
  }
  /**
   * Create ethereum transfer transaction
   *
   * @param {import('../entity').EthereumTransferTransactionInput} input
   * @returns {Promise<SignedTransaction>} signed transaction data
   */
  async createEthereumTransferTransaction(input) {
    validateEthereumTransferTransactionParams(input)
    const { wallet, tokenSymbol, amount, destination, fee, testnet, contractAddress } = input
    const protocol = Protocol.ETHEREUM
    const { info, networkFee } = await this._getFeeInfo({
      wallet,
      type: tokenSymbol === 'ETH' ? TransactionType.TRANSFER : TransactionType.CALL_CONTRACT_METHOD,
      destination,
      amount: tokenSymbol === 'ETH' ? amount : null,
      contractAddress,
      contractAbi: tokenSymbol === 'ETH' ? null : TRANSFER_METHOD_ABI,
      method: tokenSymbol === 'ETH' ? null : 'transfer',
      params: tokenSymbol === 'ETH' ? null : [destination, toWei(amount).toString()],
      fee,
      protocol,
    })
    const signedTx = await buildEthereumTransferTransaction({
      fromPrivateKey: wallet.privateKey,
      tokenSymbol,
      amount,
      destination,
      fee: networkFee,
      nonce: info.nonce,
      testnet: testnet !== undefined ? testnet : this.config.environment === 'development',
      contractAddress,
    })
    return new SignedTransaction({ signedTx, protocol, type: TransactionType.TRANSFER })
  }
  /**
   * Create bsc transfer transaction
   *
   * @param {EthereumTransferTransactionInput} input
   * @returns {Promise<SignedTransaction>} signed transaction data
   */
  async createBscTransferTransaction(input) {
    validateEthereumTransferTransactionParams(input)
    const { wallet, tokenSymbol, amount, destination, fee, testnet, contractAddress } = input
    const protocol = Protocol.BSC
    const { info, networkFee } = await this._getFeeInfo({
      wallet,
      type: tokenSymbol === 'BNB' ? TransactionType.TRANSFER : TransactionType.CALL_CONTRACT_METHOD,
      destination,
      amount: tokenSymbol === 'BNB' ? amount : null,
      contractAddress,
      contractAbi: tokenSymbol === 'BNB' ? null : TRANSFER_METHOD_ABI,
      method: tokenSymbol === 'BNB' ? null : 'transfer',
      params: tokenSymbol === 'BNB' ? null : [destination, toWei(amount).toString()],
      testnet,
      fee,
      protocol,
    })
    const signedTx = await buildBscTransferTransaction({
      fromPrivateKey: wallet.privateKey,
      tokenSymbol,
      amount,
      destination,
      fee: networkFee,
      nonce: info.nonce,
      testnet: testnet !== undefined ? testnet : this.config.environment === 'development',
      contractAddress,
    })
    return new SignedTransaction({ signedTx, protocol, type: TransactionType.TRANSFER })
  }
  /**
  * Create avalanche transfer transaction
  *
  * @param {EthereumTransferTransactionInput} input
  * @returns {Promise<SignedTransaction>} signed transaction data
  */
  async createAvaxCChainTransferTransaction(input) {
    validateEthereumTransferTransactionParams(input)
    const { wallet, tokenSymbol, amount, destination, fee, testnet, contractAddress } = input
    const protocol = Protocol.AVAXCCHAIN
    const { info, networkFee } = await this._getFeeInfo({
      wallet,
      type: tokenSymbol === 'AVAX' ? TransactionType.TRANSFER : TransactionType.CALL_CONTRACT_METHOD,
      destination,
      amount: tokenSymbol === 'AVAX' ? amount : null,
      contractAddress,
      contractAbi: tokenSymbol === 'AVAX' ? null : TRANSFER_METHOD_ABI,
      method: tokenSymbol === 'AVAX' ? null : 'transfer',
      params: tokenSymbol === 'AVAX' ? null : [destination, toWei(amount).toString()],
      testnet,
      fee,
      protocol,
    })
    const signedTx = await buildAvaxCChainTransferTransaction({
      fromPrivateKey: wallet.privateKey,
      tokenSymbol,
      amount,
      destination,
      fee: networkFee,
      nonce: info.nonce,
      testnet: testnet !== undefined ? testnet : this.config.environment === 'development',
      contractAddress,
    })
    return new SignedTransaction({ signedTx, protocol, type: TransactionType.TRANSFER })
  }
  /**
   * Create bitcoin transfer transaction
   *
   * @param {import('../entity').BitcoinTransferTransactionInput} input
   * @returns {Promise<SignedTransaction>} signed transaction data
   */
  async createBitcoinTransferTransaction(input) {
    validateBitcoinTransferTransactionParams(input)
    let { wallet, inputs, outputs, fee, testnet } = input
    const protocol = Protocol.BITCOIN
    if (wallet) {
      const utxos = await this.getUTXOs({ address: wallet.address, protocol })
      inputs = []
      for (let i = 0; i < utxos.length; ++i) {
        const tx = await this.getTransactionByHash({ hash: utxos[i].txHash, protocol })
        inputs[i] = new Input({ ...utxos[i], privateKey: wallet.privateKey, hex: tx.hex, blockhash: tx.blockhash })
      }
    } else if (inputs) {
      for (let i = 0; i < inputs.length; ++i) {
        const tx = await this.getTransactionByHash({ hash: inputs[i].txHash, protocol })
        if (!tx.vout[inputs[i].index]) {
          throw new GenericException(`Invalid UTXO hash ${inputs[i].txHash}`, 'InvalidParams')
        }
        inputs[i].hex = tx.hex
        inputs[i].blockhash = tx.blockhash
      }
    }
    let networkFee = fee
    if (!networkFee) {
      ; ({ estimateValue: networkFee } = await this.getFee({
        type: TransactionType.TRANSFER,
        protocol,
      }))
    }

    const signedTx = await buildBitcoinTransferTransaction({
      wallet,
      inputs,
      outputs,
      fee: networkFee,
      testnet: testnet !== undefined ? testnet : this.config.environment === 'development',
    })
    return new SignedTransaction({ signedTx, protocol, type: TransactionType.TRANSFER })
  }
  /**
   * Create call transaction to smart contract
   *
   * @param {import('../entity').SmartContractCallTransactionInput} input
   * @returns {Promise<SignedTransaction>}
   */
  async createSmartContractTransaction(input) {
    validateSmartContractTransactionParams(input)
    const { wallet, fee, testnet, value, contractAddress, contractAbi, method, params, protocol, feeCurrency } = input
    const { info, networkFee } = await this._getFeeInfo({
      wallet,
      type: TransactionType.CALL_CONTRACT_METHOD,
      contractAddress,
      contractAbi,
      method,
      params,
      testnet,
      fee,
      protocol,
    })
    let signedTx
    const transactionOptions = {
      fromPrivateKey: wallet.privateKey,
      nonce: info.nonce,
      value,
      contractAddress,
      contractAbi,
      method,
      params,
      fee: networkFee,
      feeCurrency,

      testnet: testnet !== undefined ? testnet : this.config.environment === 'development',
    }
    if (protocol === Protocol.CELO) {
      signedTx = await buildCeloSmartContractTransaction(transactionOptions)
    } else if ([Protocol.ETHEREUM, Protocol.BSC, Protocol.AVAXCCHAIN].includes(protocol)) {
      signedTx = await buildEthereumSmartContractTransaction({ ...transactionOptions, protocol })
    } else {
      throw new GenericException('Invalid protocol', 'InvalidTypeException')
    }
    return new SignedTransaction({ signedTx, protocol, type: TransactionType.CALL_CONTRACT_METHOD })
  }

  /**
   * Call a smart contract method
   * @param {import('../entity').SmartContractCallMethodInput} input
   * @returns {Promise<SmartContractCallResponse>}
   */
  async callSmartContractMethod(input) {
    validateSmartContractCallParams(input)
    const { from, contractAddress, contractAbi, method, params, protocol } = input
    try {
      const apiRequest = getApiMethod({
        requests,
        key: 'callSmartContractMethod',
        config: this.config,
      })
      const headers = mountHeaders(this.config.apiKey)
      const response = await apiRequest(
        requests.callSmartContractMethod.url,
        { from, contractAddress, contractAbi, method, params },
        {
          headers,
          params: { protocol },
        }
      )
      return new SmartContractCallResponse(response.data)
    } catch (error) {
      handleRequestError(error)
    }
  }

  async _getFeeInfo({
    wallet,
    type,
    destination,
    amount,
    contractAddress,
    contractAbi,
    method,
    params,
    fee,
    feeCurrency,
    protocol,
    contractName,
    source,
    tokenType,
  }) {
    const [info, networkFee] = await Promise.all([
      new WalletController(this.config).getWalletInfo({
        address: wallet.address,
        protocol,
      }),
      this.getFee({
        type,
        from: wallet.address,
        destination,
        amount,
        method,
        params,
        contractAddress,
        contractAbi,
        protocol,
        contractName,
        source,
        tokenType,
        feeCurrency,
      }),
    ])
    if (fee && fee.gas) networkFee.gas = fee && fee.gas
    if (fee && fee.gasPrice) networkFee.gasPrice = fee && fee.gasPrice
    return { info, networkFee }
  }

  /**
   * Create call transaction to smart contract deploy
   *
   * @param {import('../entity').SmartContractDeployTransactionInput} input
   * @returns {Promise<SignedTransaction>}
   */
  async createSmartContractDeployTransaction(input) {
    validateSmartContractDeployTransactionParams(input)
    const { wallet, fee, testnet, params, protocol, feeCurrency, source, contractName } = input

    const { info, networkFee } = await this._getFeeInfo({
      wallet,
      type: TransactionType.DEPLOY_CONTRACT,
      params,
      testnet,
      fee,
      protocol,
      source,
      contractName,
    })

    let signedTx

    const transactionOptions = {
      source,
      contractName,
      fromPrivateKey: wallet.privateKey,
      nonce: info.nonce,
      params,
      fee: networkFee,
      feeCurrency,

      testnet: testnet !== undefined ? testnet : this.config.environment === 'development',
      config: this.config,
    }

    if (protocol === Protocol.CELO) {
      signedTx = await buildCeloSmartContractDeployTransaction(transactionOptions)
    } else if ([Protocol.ETHEREUM, Protocol.BSC, Protocol.AVAXCCHAIN].includes(protocol)) {
      signedTx = await buildEthereumSmartContractDeployTransaction({ ...transactionOptions, protocol })
    } else {
      throw new GenericException('Invalid protocol', 'InvalidTypeException')
    }

    return new SignedTransaction({ signedTx, protocol, type: TransactionType.DEPLOY_CONTRACT })
  }
  /**
   * Create call transaction to token/asset issue
   *
   * @param {import('../entity').TokenDeployTransactionInput} input
   * @returns {Promise<SignedTransaction>}
   */
  async createTokenDeployTransaction(input) {
    validateTokenDeployTransactionParams(input)
    const { wallet, fee, testnet, params, protocol, feeCurrency, tokenType } = input

    const { info, networkFee } = await this._getFeeInfo({
      wallet,
      type: `DEPLOY_${tokenType}`,
      params,
      testnet,
      fee,
      protocol,
      tokenType,
    })

    let signedTx

    const transactionOptions = {
      fromPrivateKey: wallet.privateKey,
      nonce: info.nonce,
      params,
      fee: networkFee,
      feeCurrency,

      testnet: testnet !== undefined ? testnet : this.config.environment === 'development',
      config: this.config,
      tokenType,
    }

    if (protocol === Protocol.CELO) {
      signedTx = await buildCeloSmartContractDeployTransaction(transactionOptions)
    } else if ([Protocol.ETHEREUM, Protocol.BSC, Protocol.AVAXCCHAIN].includes(protocol)) {
      signedTx = await buildEthereumSmartContractDeployTransaction({ ...transactionOptions, protocol })
    } else {
      throw new GenericException('Invalid protocol', 'InvalidTypeException')
    }

    return new SignedTransaction({ signedTx, protocol, type: TransactionType.DEPLOY_CONTRACT })
  }

  /**
   * Create transfer tokens transaction in Hathor blockchain
   * @param {import('../entity').HathorTransferTransactionInput} input
   * @returns {Promise<SignedTransaction>}
   */
  async createHathorTransferTransactionFromWallet(input) {
    validateHathorTransferTransactionFromWallet(input)
    let { wallet, outputs, testnet } = input
    const protocol = Protocol.HATHOR
    const utxos = await this.getUTXOs({ address: wallet.address, protocol })
    if (utxos.length === 0) {
      throw new GenericException('No available UTXOs')
    }
    const tokenSet = new Set()
    for (let i = 0; i < outputs.length; ++i) {
      if (outputs[i].token === 'HTR' || outputs[i].token == null) {
        outputs[i].token = '00'
      }
      tokenSet.add(outputs[i].token)
    }
    const tokens = Array.from(tokenSet).filter((i) => i)
    const inputs = []
    for (let i = 0; i < utxos.length; ++i) {
      if (tokens.includes(utxos[i].token)) {
        const tx = await this.getTransactionByHash({ hash: utxos[i].txHash, protocol })
        if (
          utxos[i].token === '00' ||
          (utxos[i].token !== '00' && ![0, 129].includes(tx.tx.outputs[utxos[i].index].token_data))
        ) {
          inputs.push({
            ...utxos[i],
            privateKey: wallet.privateKey,
          })
        }
      }
    }
    const signedTx = await buildHathorTransferTransaction({
      inputs,
      outputs,
      tokens,
      changeAddress: wallet.address,
      testnet: testnet !== undefined ? testnet : this.config.environment === 'development',
    })
    return new SignedTransaction({ signedTx, protocol, type: TransactionType.TRANSFER })
  }
  /**
   * Create transfer tokens transaction in Hathor blockchain
   * @param {import('../entity').HathorTransferTransactionInput} input
   * @returns {Promise<SignedTransaction>}
   */
  async createHathorTransferTransactionFromUTXO(input) {
    validateHathorTransferTransactionFromUTXO(input)
    let { inputs, outputs, testnet } = input

    const protocol = Protocol.HATHOR
    const tokenSet = new Set()
    for (let i = 0; i < outputs.length; ++i) {
      if (outputs[i].token === 'HTR' || outputs[i].token == null) {
        outputs[i].token = '00'
      }
      tokenSet.add(outputs[i].token)
    }
    const tokens = Array.from(tokenSet).filter((i) => i)
    for (let i = 0; i < inputs.length; ++i) {
      const tx = await this.getTransactionByHash({ hash: inputs[i].txHash, protocol })
      const utxo = tx.tx.outputs[inputs[i].index]
      inputs[i].value = utxo.value
      inputs[i].token = utxo.token_data === 0 ? '00' : tx.tx.tokens[utxo.token_data - 1].uid
    }

    const signedTx = await buildHathorTransferTransaction({
      inputs,
      outputs,
      tokens,
      testnet: testnet !== undefined ? testnet : this.config.environment === 'development',
    })
    return new SignedTransaction({ signedTx, protocol, type: TransactionType.TRANSFER })
  }
  /**
   * Create Hathor token transaction using wallet
   * @param {import('../entity').HathorTokenTransactionFromWalletInput} input
   * @returns {Promise<SignedTransaction>}
   */
  async createHathorTokenTransactionFromWallet(input) {
    validateHathorTokenTransactionFromWallet(input)
    let {
      wallet,
      tokenName,
      tokenSymbol,
      type,
      tokenUid,
      mintAuthorityAddress,
      meltAuthorityAddress,
      amount,
      address,
      changeAddress,
      testnet,
    } = input
    let inputSum = 0
    const amountHTRUnit = toHTRUnit(amount).toNumber()
    const protocol = Protocol.HATHOR
    let utxos = await this.getUTXOs({ address: wallet.address, protocol })
    if (type === TransactionType.HATHOR_TOKEN_MELT) {
      utxos = utxos.filter((utxo) => utxo.token === tokenUid)
    } else {
      utxos = utxos.filter((utxo) => utxo.token === '00' || utxo.token === tokenUid)
    }
    if (utxos.length === 0) {
      throw new HathorException('No available UTXOs')
    }
    const inputs = []
    for (let i = 0; i < utxos.length; ++i) {
      const tx = await this.getTransactionByHash({ hash: utxos[i].txHash, protocol })
      const output = tx.tx.outputs[utxos[i].index]
      if (type === TransactionType.HATHOR_TOKEN_MELT) {
        if (![0, 129].includes(output.token_data)) {
          if (inputSum < amountHTRUnit) {
            inputSum += output.value
            inputs.push({ txHash: utxos[i].txHash, index: utxos[i].index, privateKey: wallet.privateKey })
          }
        } else if (output.token_data === 129 && output.value === 2) {
          inputs.push({ txHash: utxos[i].txHash, index: utxos[i].index, privateKey: wallet.privateKey })
        }
      } else {
        if (output.token_data === 0) {
          if (inputSum < amountHTRUnit) {
            inputSum += output.value
            inputs.push({ txHash: utxos[i].txHash, index: utxos[i].index, privateKey: wallet.privateKey })
          }
        } else if (output.token_data === 129 && output.value === 1) {
          inputs.push({ txHash: utxos[i].txHash, index: utxos[i].index, privateKey: wallet.privateKey })
        }
      }
    }
    const signedTx = await buildHathorTokenTransaction({
      type,
      inputs,
      tokenUid,
      tokenName,
      tokenSymbol,
      address: address || wallet.address,
      changeAddress: changeAddress || wallet.address,
      mintAuthorityAddress,
      meltAuthorityAddress,
      amount,
      testnet: testnet !== undefined ? testnet : this.config.environment === 'development',
      inputSum,
    })
    return new SignedTransaction({ signedTx, protocol, type })
  }
  /**
   * Create Hathor token transaction using UTXO
   * @param {import('../entity').HathorTokenTransactionFromUTXOInput} input
   * @returns {Promise<SignedTransaction>}
   */
  async createHathorTokenTransactionFromUTXO(input) {
    validateHathorTokenTransactionFromUTXO(input)
    let {
      inputs,
      tokenName,
      tokenSymbol,
      address,
      changeAddress,
      mintAuthorityAddress,
      meltAuthorityAddress,
      amount,
      tokenUid,
      type,
      testnet,
    } = input
    let inputSum = 0
    const protocol = Protocol.HATHOR
    for (let i = 0; i < inputs.length; ++i) {
      const tx = await this.getTransactionByHash({ hash: inputs[i].txHash, protocol })
      if (type === TransactionType.HATHOR_TOKEN_MELT && ![0, 129].includes(tx.tx.outputs[inputs[i].index].token_data)) {
        inputSum += tx.tx.outputs[inputs[i].index].value
      } else {
        if (tx.tx.outputs[inputs[i].index].token_data === 0) {
          inputSum += tx.tx.outputs[inputs[i].index].value
        }
      }
    }
    const signedTx = await buildHathorTokenTransaction({
      inputs,
      tokenName,
      tokenSymbol,
      address,
      changeAddress,
      mintAuthorityAddress,
      meltAuthorityAddress,
      amount,
      tokenUid,
      testnet: testnet !== undefined ? testnet : this.config.environment === 'development',
      type,
      inputSum,
    })
    return new SignedTransaction({ signedTx, protocol, type })
  }

  /**
   * Create transfer tokens transaction in Cardano blockchain
   * @param {import('../entity').CardanoTransferTransactionInput} input
   * @returns {Promise<SignedTransaction>}
   */
  async createCardanoTransferTransactionFromWallet(input) {
    try {
      let { wallet, outputs } = input
      const protocol = Protocol.CARDANO
      const keyAddressMapper = {}
      keyAddressMapper[wallet.address] = {
        secretKey: wallet.privateKey.spendingPrivateKey.slice(0, 128),
        publicKey: wallet.privateKey.spendingPrivateKey.slice(128, 192),
      }

      const privateKey = CardanoWasm.Bip32PrivateKey.from_128_xprv(
        new Uint8Array(wallet.privateKey.spendingPrivateKey.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)))
      )
      const headers = mountHeaders(this.config.apiKey)
      const utxo = await this.getUTXOs({ address: wallet.address, protocol })
      let feelessUtxo = JSON.parse(JSON.stringify(utxo))
      const feelessTx = buildOperation(feelessUtxo, wallet.address, outputs)
      const apiRequest = getApiMethod({
        requests,
        key: 'preprocess',
        config: this.config,
      })
      const options = await apiRequest(
        `${requests.preprocess.url}?protocol=${protocol}`,
        {
          operations: feelessTx.operations,
          metadata: { relative_ttl: 1000 },
        },
        {
          headers,
        }
      )

      const metadata = await apiRequest(`${requests.getMetadata.url}?protocol=${protocol}`, {
        ...options.data,
      })

      const builtTx = buildOperation(utxo, wallet.address, outputs, metadata.data.suggested_fee[0].value)
      const payload = await apiRequest(`${requests.getPayload.url}?protocol=${protocol}`, {
        operations: builtTx.operations,
        metadata: metadata.data.metadata,
      })

      const signatures = payload.data.payloads.map((signing_payload) => {
        const {
          account_identifier: { address },
        } = signing_payload
        return {
          signing_payload,
          public_key: {
            hex_bytes: keyAddressMapper[address].publicKey,
            curve_type: 'edwards25519',
          },
          signature_type: 'ed25519',
          hex_bytes: Buffer.from(
            CardanoWasm.make_vkey_witness(
              CardanoWasm.TransactionHash.from_bytes(Buffer.from(signing_payload.hex_bytes, 'hex')),
              privateKey.to_raw_key()
            )
              .signature()
              .to_bytes()
          ).toString('hex'),
        }
      })

      const combine = await apiRequest(`${requests.combineSignatures.url}?protocol=${protocol}`, {
        unsigned_transaction: payload.data.unsigned_transaction,
        signatures,
      })
      const signedTx = combine.data.signed_transaction

      return new SignedTransaction({ signedTx, protocol, type: TransactionType.TRANSFER })
    } catch (error) {
      handleRequestError(error)
    }
  }

  /**
   * Create transfer tokens transaction in Cardano blockchain
   * @param {import('../entity').CardanoTransferTransactionInput} input
   * @returns {Promise<SignedTransaction>}
   */
  async createCardanoTransferTransactionFromUTXO(input) {
    try {
      let { outputs, inputs } = input
      const headers = mountHeaders(this.config.apiKey)
      const protocol = Protocol.CARDANO
      const keyAddressMapper = {}
      const inputList = []

      await Promise.all(
        inputs.map(async (i) => {
          keyAddressMapper[i.address] = {
            secretKey: CardanoWasm.Bip32PrivateKey.from_128_xprv(
              new Uint8Array(i.privateKey.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)))
            ),
            publicKey: i.privateKey.slice(128, 192),
          }

          let utxo = await this.getUTXOs({ address: i.address, protocol })
          utxo.map((u) => {
            if (u.txHash === i.txHash && u.index.toString() === i.index) {
              inputList.push({ ...u, address: i.address })
            }
          })
        })
      )

      if (inputList.length !== inputs.length) throw new Error('One or more inputs are invalid')

      const apiRequest = getApiMethod({
        requests,
        key: 'preprocess',
        config: this.config,
      })
      const builtTx = buildOperationFromInputs(inputList, outputs)
      const options = await apiRequest(
        `${requests.preprocess.url}?protocol=${protocol}`,
        {
          operations: builtTx.operations,
          metadata: { relative_ttl: 1000 },
        },
        {
          headers,
        }
      )

      const metadata = await apiRequest(`${requests.getMetadata.url}?protocol=${protocol}`, {
        ...options.data,
      })
      const payload = await apiRequest(`${requests.getPayload.url}?protocol=${protocol}`, {
        operations: builtTx.operations,
        metadata: metadata.data.metadata,
      })
      const signatures = payload.data.payloads.map((signing_payload) => {
        const {
          account_identifier: { address },
        } = signing_payload
        return {
          signing_payload,
          public_key: {
            hex_bytes: keyAddressMapper[address].publicKey,
            curve_type: 'edwards25519',
          },
          signature_type: 'ed25519',
          hex_bytes: Buffer.from(
            CardanoWasm.make_vkey_witness(
              CardanoWasm.TransactionHash.from_bytes(Buffer.from(signing_payload.hex_bytes, 'hex')),
              keyAddressMapper[address].secretKey.to_raw_key()
            )
              .signature()
              .to_bytes()
          ).toString('hex'),
        }
      })
      const combine = await apiRequest(`${requests.combineSignatures.url}?protocol=${protocol}`, {
        unsigned_transaction: payload.data.unsigned_transaction,
        signatures,
      })
      const signedTx = combine.data.signed_transaction
      return new SignedTransaction({ signedTx, protocol, type: TransactionType.TRANSFER })
    } catch (error) {
      handleRequestError(error)
    }
  }

  /**
   * Create Solana transfer transaction
   *
   * @param {import('../entity').TransferTransactionInput} input
   * @returns {Promise<SignedTransaction>} signed transaction data
   */
  async createSolanaTransferTransaction(input) {
    validateSolanaTransferTransaction(input)
    const { wallet, destination, token, amount } = input
    const protocol = Protocol.SOLANA

    const apiRequest = getApiMethod({
      requests,
      key: 'getBlock',
      config: this.config,
    })
    const latestBlock = (await apiRequest(`${requests.getBlock.url}/latest?protocol=${protocol}`)).data.blockhash

    const signedTx = await buildSolanaTransferTransaction({ from: wallet, to: destination, token, amount, latestBlock })

    return new SignedTransaction({ signedTx, protocol, type: TransactionType.TRANSFER })
  }

  /**
   * Create Solana token burn transaction
   *
   * @param {import('../entity').TransferTransactionInput} input
   * @returns {Promise<SignedTransaction>} signed transaction data
   */
  async createSolanaTokenBurnTransaction(input) {
    validateSolanaTransferTransaction(input)
    const { wallet, token, amount } = input
    const protocol = Protocol.SOLANA

    const apiRequest = getApiMethod({
      requests,
      key: 'getBlock',
      config: this.config,
    })
    const latestBlock = (await apiRequest(`${requests.getBlock.url}/latest?protocol=${protocol}`)).data.blockhash

    const signedTx = await buildSolanaTokenBurnTransaction({ from: wallet, token, amount, latestBlock })

    return new SignedTransaction({ signedTx, protocol, type: TransactionType.SOLANA_TOKEN_BURN })
  }

  /**
   * Create Solana token mint transaction
   *
   * @param {import('../entity').TransferTransactionInput} input
   * @returns {Promise<SignedTransaction>} signed transaction data
   */
  async createSolanaTokenMintTransaction(input) {
    validateSolanaTransferTransaction(input)
    const { wallet, destination, token, amount } = input
    const protocol = Protocol.SOLANA

    const apiRequest = getApiMethod({
      requests,
      key: 'getBlock',
      config: this.config,
    })
    const latestBlock = (await apiRequest(`${requests.getBlock.url}/latest?protocol=${protocol}`)).data.blockhash

    const signedTx = await mintSolanaToken({ from: wallet, token, to: destination, amount, latestBlock })

    return new SignedTransaction({ signedTx, protocol, type: TransactionType.SOLANA_TOKEN_BURN })
  }

  /**
     * Create Solana token deploy transaction
     *
     * @param {import('../entity').SolanaTokenDeployInput} input
     * @returns {Promise<TransactionResponse>} token signature
     */
  async createSolanaTokenDeployTransaction(input) {
    validateSolanaDeployTransaction(input)
    const { wallet, destination, fixedSupply, decimals, amount, testnet } = input

    const hash = await deploySolanaToken({ from: wallet, to: destination, fixedSupply, decimals, amount, testnet: testnet !== undefined ? testnet : this.config.environment === 'development' })

    return new TransactionResponse({ hash })
  }

  /**
     * Create Solana NFT 
     *
     * @param {import('../entity').SolanaNFTInput} input
     * @returns {Promise<any>} token signature
     */
  async createSolanaNFT(input) {
    validateSolanaDeployNFT(input)
    const { wallet, maxSupply, uri, testnet } = input

    const response = await deploySolanaNFT({ from: wallet, maxSupply, uri, testnet: testnet !== undefined ? testnet : this.config.environment === 'development' })

    return ({ ...response })
  }

  /**
     * Create Solana NFT Edition
     *
     * @param {import('../entity').SolanaNFTEditionInput} input
     * @returns {Promise<TransactionResponse>} edition signature
     */
  async createSolanaNFTEdition(input) {
    validateSolanaDeployNFT(input)
    const { wallet, masterEdition, testnet } = input

    const hash = await mintEdition({ masterEdition, from: wallet, testnet: testnet !== undefined ? testnet : this.config.environment === 'development' })

    return new TransactionResponse({ hash })
  }

  /**
     * Update Solana NFT Metadata
     *
     * @param {import('../entity').SolanaUpdateMetadataInput} input
     * @returns {Promise<TransactionResponse>} token signature
     */
  async updateSolanaNFTMetadata(input) {
    validateSolanaDeployNFT(input)
    const { wallet, token, uri, testnet } = input

    const hash = await updateMetaplexMetadata({ from: wallet, token, uri, testnet: testnet !== undefined ? testnet : this.config.environment === 'development' })

    return new TransactionResponse({ hash })
  }

  /**
     * Create a Custom Solana Program Interaction
     *
     * @param {import('../entity').SolanaCustomProgramInput} input
     * @returns {Promise<SignedTransaction>} signed transaction
     */
  async createSolanaCustomProgramInteraction(input) {
    validateSolanaCustomProgramInput(input)
    const { from, keys, programId, data } = input
    const protocol = Protocol.SOLANA

    const apiRequest = getApiMethod({
      requests,
      key: 'getBlock',
      config: this.config,
    })
    const latestBlock = (await apiRequest(`${requests.getBlock.url}/latest?protocol=${protocol}`)).data.blockhash

    const signedTx = await buildSolanaCustomProgramInteraction({ from, keys, programId, data, latestBlock })

    return new SignedTransaction({ signedTx, protocol, type: TransactionType.CALL_CONTRACT_METHOD })
  }

  /**
   * Create Solana update auction authority transaction
   *
   * @param {import('../entity').TransferTransactionInput} input
   * @returns {Promise<TransactionResponse>} signed transaction data
   */
  async solanaUpdateAuctionAuthorityTransaction(input) {
    // validateSolanaTransferTransaction(input)
    const { testnet, from, auctionManager, auction } = input
    const protocol = Protocol.SOLANA

    const apiRequest = getApiMethod({
      requests,
      key: 'getBlock',
      config: this.config,
    })
    const latestBlock = (await apiRequest(`${requests.getBlock.url}/latest?protocol=${protocol}`)).data.blockhash

    const txHash = await updateAuctionAuthority({ from, auctionManager, auction, testnet: testnet !== undefined ? testnet : this.config.environment === 'development', latestBlock })

    return new TransactionResponse({ hash: txHash })
  }

  /**
     * Create Solana update auction authority transaction
     *
     * @param {import('../entity').TransferTransactionInput} input
     * @returns {Promise<TransactionResponse>} signed transaction data
     */
  async solanaEmptyPaymentAccountTransaction(input) {
    // validateSolanaTransferTransaction(input)
    const { testnet, from, auction, store, creatorIndex, creatorAddress } = input
    const protocol = Protocol.SOLANA

    const apiRequest = getApiMethod({
      requests,
      key: 'getBlock',
      config: this.config,
    })
    const latestBlock = (await apiRequest(`${requests.getBlock.url}/latest?protocol=${protocol}`)).data.blockhash

    const txHash = await emptyPaymentAccount({ from, auction, store, creatorIndex, creatorAddress, testnet: testnet !== undefined ? testnet : this.config.environment === 'development', latestBlock })

    return new TransactionResponse({ hash: txHash })
  }


  /**
   * Create Solana update token vault authority transaction
   *
   * @param {import('../entity').TransferTransactionInput} input
   * @returns {Promise<SignedTransaction>} signed transaction data
   */
  async solanaUpdateVaultAuthorityTransaction(input) {

    const { testnet, from, auctionManager, vault } = input
    const protocol = Protocol.SOLANA

    const apiRequest = getApiMethod({
      requests,
      key: 'getBlock',
      config: this.config,
    })
    const latestBlock = (await apiRequest(`${requests.getBlock.url}/latest?protocol=${protocol}`)).data.blockhash

    const txHash = await updateVaultAuthority({ from, auctionManager, vault, testnet: testnet !== undefined ? testnet : this.config.environment === 'development', latestBlock })

    return new TransactionResponse({ hash: txHash })
  }

  /**
   * Create Solana validate auction transaction
   *
   * @param {import('../entity').TransferTransactionInput} input
   * @returns {Promise<TransactionResponse>}
   */
  async validateSolanaSafetyDepositBoxes(input) {
    const { testnet, from, vault, nft, store, metadata, tokenStore, tokenTracker } = input
    const protocol = Protocol.SOLANA

    const apiRequest = getApiMethod({
      requests,
      key: 'getBlock',
      config: this.config,
    })
    const latestBlock = (await apiRequest(`${requests.getBlock.url}/latest?protocol=${protocol}`)).data.blockhash

    const txHash = await validateAuction({ testnet: testnet !== undefined ? testnet : this.config.environment === 'development', from, vault, nft, store, metadata, tokenStore, tokenTracker, latestBlock })

    return new TransactionResponse({ hash: txHash })
  }

  /**
   * Create Solana whitelist creators transaction
   *
   * @param {import('../entity').TransferTransactionInput} input
   * @returns {Promise<TransactionResponse>}
   */
  async whitelistCreatorsTransaction(input) {
    const protocol = Protocol.SOLANA

    const apiRequest = getApiMethod({
      requests,
      key: 'getBlock',
      config: this.config,
    })
    const latestBlock = (await apiRequest(`${requests.getBlock.url}/latest?protocol=${protocol}`)).data.blockhash

    const txHash = await whitelistCreators({ ...input, latestBlock })

    return new TransactionResponse({ hash: txHash })
  }

}
module.exports = Controller
