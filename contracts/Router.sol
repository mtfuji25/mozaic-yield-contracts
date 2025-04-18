// SPDX-License-Identifier: GPL-3.0-only

pragma solidity 0.7.6;
pragma abicoder v2;

// imports
import "@openzeppelin/contracts/access/Ownable.sol";
import {CodeDeployer} from "@balancer-labs/v2-solidity-utils/contracts/helpers/CodeDeployer.sol";
import "@balancer-labs/v2-vault/contracts/Vault.sol";
import "@balancer-labs/v2-vault/contracts/Authorizer.sol";
import "./Factory.sol";
import "./Pool.sol";
import "./Bridge.sol";

// interfaces
import {IAsset} from "@balancer-labs/v2-vault/contracts/interfaces/IAsset.sol";
import {IBaseWeightedPool} from "@balancer-labs/v2-pool-weighted/contracts/BaseWeightedPool.sol";
import {IPoolBalances} from "@balancer-labs/v2-vault/contracts/PoolBalances.sol";
// import {IVault} from "@balancer-labs/v2-vault/contracts/interfaces/IVault.sol";
import {IWeightedPoolFactory} from "@balancer-labs/v2-pool-weighted/contracts/WeightedPoolFactory.sol";
import {WeightedPool, IWeightedPool} from "@balancer-labs/v2-pool-weighted/contracts/WeightedPool.sol";
// import {IWETH} from "@balancer-labs/v2-solidity-utils/contracts/misc/IWETH.sol";
import "./interfaces/IStargateRouter.sol";
import "./interfaces/IStargateReceiver.sol";

// libraries
import "@openzeppelin/contracts/math/SafeMath.sol";

contract Router is IStargateRouter, Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    //---------------------------------------------------------------------------
    // CONSTANTS
    uint8 internal constant TYPE_REDEEM_LOCAL_RESPONSE = 1;
    uint8 internal constant TYPE_REDEEM_LOCAL_CALLBACK_RETRY = 2;
    uint8 internal constant TYPE_SWAP_REMOTE_RETRY = 3;

    //---------------------------------------------------------------------------
    // STRUCTS
    struct CachedSwap {
        address token;
        uint256 amountLD;
        address to;
        bytes payload;
    }

    //---------------------------------------------------------------------------
    // VARIABLES
    Factory public factory; // used for creating pools
    Bridge public bridge;
    IVault public balancerVault;

    address public mintFeeOwner; // can call methods to pull mint fees collected in pools
    address public protocolFeeOwner; // can call methods to pull Stargate fees collected in pools
    address public balancerWeightedPoolFactory;

    mapping(uint16 => mapping(bytes => mapping(uint256 => bytes))) public revertLookup; //[chainId][srcAddress][nonce]
    mapping(uint16 => mapping(bytes => mapping(uint256 => CachedSwap))) public cachedSwapLookup; //[chainId][srcAddress][nonce]
    mapping(uint256 => bytes32) public balancerAndStargatePoolLookup; // [stargatePoolId]

    IWETH private immutable _weth;

    //---------------------------------------------------------------------------
    // EVENTS
    event Revert(uint8 bridgeFunctionType, uint16 chainId, bytes srcAddress, uint256 nonce);
    event CachedSwapSaved(
        uint16 chainId,
        bytes srcAddress,
        uint256 nonce,
        address token,
        uint256 amountLD,
        address to,
        bytes payload,
        bytes reason
    );
    event RevertRedeemLocal(
        uint16 srcChainId,
        uint256 _srcPoolId,
        uint256 _dstPoolId,
        bytes to,
        uint256 redeemAmountSD,
        uint256 mintAmountSD,
        uint256 indexed nonce,
        bytes indexed srcAddress
    );
    event RedeemLocalCallback(
        uint16 srcChainId,
        bytes indexed srcAddress,
        uint256 indexed nonce,
        uint256 srcPoolId,
        uint256 dstPoolId,
        address to,
        uint256 amountSD,
        uint256 mintAmountSD
    );

    //---------------------------------------------------------------------------
    // MODIFIERS
    modifier onlyBridge() {
        require(msg.sender == address(bridge), "Bridge: caller must be Bridge.");
        _;
    }

    constructor(
        IWETH weth,
        IVault _balancerVault,
        address _balancerWeightedPoolFactory
    ) {
        _weth = weth;
        balancerVault = _balancerVault;
        balancerWeightedPoolFactory = _balancerWeightedPoolFactory;
    }

    function setBridgeAndFactory(Bridge _bridge, Factory _factory) external onlyOwner {
        require(address(bridge) == address(0x0) && address(factory) == address(0x0), "Stargate: bridge and factory already initialized"); // 1 time only
        require(address(_bridge) != address(0x0), "Stargate: bridge cant be 0x0");
        require(address(_factory) != address(0x0), "Stargate: factory cant be 0x0");

        bridge = _bridge;
        factory = _factory;
    }

    //---------------------------------------------------------------------------
    // VIEWS
    function _getPool(uint256 _poolId) internal view returns (Pool pool) {
        pool = factory.getPool(_poolId);
        require(address(pool) != address(0x0), "Stargate: Pool does not exist");
    }

    //---------------------------------------------------------------------------
    // INTERNAL
    function _safeTransferFrom(
        address token,
        address from,
        address to,
        uint256 value
    ) private {
        // bytes4(keccak256(bytes('transferFrom(address,address,uint256)')));
        (bool success, bytes memory data) = token.call(abi.encodeWithSelector(0x23b872dd, from, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))), "Stargate: TRANSFER_FROM_FAILED");
    }

    //---------------------------------------------------------------------------
    // LOCAL CHAIN FUNCTIONS
    function _addLiquidity(
        uint256 _poolId,
        uint256 _amountLD,
        address _to
    ) internal {
        Pool pool = _getPool(_poolId);
        uint256 convertRate = pool.convertRate();
        _amountLD = _amountLD.div(convertRate).mul(convertRate);
        _safeTransferFrom(pool.token(), msg.sender, address(pool), _amountLD);
        pool.mint(_to, _amountLD);
    }

    function _WETH() internal view returns (IWETH) {
        return _weth;
    }

    function _isETH(IAsset asset) internal pure returns (bool) {
        return address(asset) == address(0);
    }

    function _asIERC20(IAsset asset) internal pure returns (IERC20) {
        return IERC20(address(asset));
    }

    function _translateToIERC20(IAsset asset) internal view returns (IERC20) {
        return _isETH(asset) ? IERC20(address(_weth)) : _asIERC20(asset);
    }

    function _translateToIERC20(IAsset[] memory assets) internal view returns (IERC20[] memory) {
        IERC20[] memory tokens = new IERC20[](assets.length);
        for (uint256 i = 0; i < assets.length; ++i) {
            tokens[i] = _translateToIERC20(assets[i]);
        }
        return tokens;
    }

    function _calculateAmountLD(
        bytes32 _balancerPoolId,
        address sender,
        address recipient,
        IVault.JoinPoolRequest memory request
    ) internal returns (uint256 amountLD) {
        (address balancerPool, ) = balancerVault.getPool(_balancerPoolId);
        IPoolBalances.PoolBalanceChange memory change = IPoolBalances(balancerPool).toJoinPoolBalanceChange(request);
        IERC20[] memory tokens = _translateToIERC20(change.assets);
        uint256[] memory scalingFactors = IWeightedPool(balancerPool).getWeightedPoolScalingFactors();
        (, uint256[] memory balances, ) = balancerVault.getPoolTokens(_balancerPoolId);
        (uint256[] memory normalizedWeights, ) = IBaseWeightedPool(balancerPool).getNormalizedWeightsAndMaxWeightIndex();
        amountLD = IBaseWeightedPool(balancerPool).calculateExactTokensInForBPTOut(balances, normalizedWeights, scalingFactors, change.userData);
    }

    function addBalancerLiquidity(
        uint256 _poolId,
        IVault.JoinPoolRequest memory request
    ) external payable override nonReentrant {
        bytes32 balancerPoolId = balancerAndStargatePoolLookup[_poolId];
        balancerVault.joinPool(balancerPoolId, msg.sender, owner(), request);
        uint256 amountLD = _calculateAmountLD(balancerPoolId, msg.sender, owner(), request);
        _addLiquidity(_poolId, amountLD, owner());
    }

    function swap(
        uint16 _dstChainId,
        uint256 _srcPoolId,
        uint256 _dstPoolId,
        address payable _refundAddress,
        uint256 _amountLD,
        uint256 _minAmountLD,
        lzTxObj memory _lzTxParams,
        bytes calldata _to,
        bytes calldata _payload
    ) external payable override nonReentrant {
        require(_amountLD > 0, "Stargate: cannot swap 0");
        require(_refundAddress != address(0x0), "Stargate: _refundAddress cannot be 0x0");
        Pool.SwapObj memory s;
        Pool.CreditObj memory c;
        {
            Pool pool = _getPool(_srcPoolId);
            {
                uint256 convertRate = pool.convertRate();
                _amountLD = _amountLD.div(convertRate).mul(convertRate);
            }

            s = pool.swap(_dstChainId, _dstPoolId, msg.sender, _amountLD, _minAmountLD, true);
            _safeTransferFrom(pool.token(), msg.sender, address(pool), _amountLD);
            c = pool.sendCredits(_dstChainId, _dstPoolId);
        }
        bridge.swap{value: msg.value}(_dstChainId, _srcPoolId, _dstPoolId, _refundAddress, c, s, _lzTxParams, _to, _payload);
    }

    // function _redeemRemote(
    //     uint16 _dstChainId,
    //     uint256 _srcPoolId,
    //     uint256 _dstPoolId,
    //     address payable _refundAddress,
    //     uint256 _amountLP,
    //     uint256 _minAmountLD,
    //     bytes calldata _to,
    //     lzTxObj memory _lzTxParams
    // ) external payable override nonReentrant {
    //     require(_refundAddress != address(0x0), "Stargate: _refundAddress cannot be 0x0");
    //     require(_amountLP > 0, "Stargate: not enough lp to redeemRemote");
    //     Pool.SwapObj memory s;
    //     Pool.CreditObj memory c;
    //     {
    //         Pool pool = _getPool(_srcPoolId);
    //         uint256 amountLD = pool.amountLPtoLD(_amountLP);
    //         // perform a swap with no liquidity
    //         s = pool.swap(_dstChainId, _dstPoolId, msg.sender, amountLD, _minAmountLD, false);
    //         pool.redeemRemote(_dstChainId, _dstPoolId, msg.sender, _amountLP);
    //         c = pool.sendCredits(_dstChainId, _dstPoolId);
    //     }
    //     // equal to a swap, with no payload ("0x") no dstGasForCall 0
    //     bridge.swap{value: msg.value}(_dstChainId, _srcPoolId, _dstPoolId, _refundAddress, c, s, _lzTxParams, _to, "");
    // }

    function removeBalancerLiquidityRemote(
        uint16 _dstChainId,
        uint256 _srcPoolId,
        uint256 _dstPoolId,
        address payable _refundAddress,
        uint256 _amountLP,
        uint256 _minAmountLD,
        bytes calldata _to,
        lzTxObj memory _lzTxParams,
        IVault.ExitPoolRequest memory request
    ) external payable override nonReentrant {
        // bytes32 balancerPoolId = balancerAndStargatePoolLookup[_dstPoolId];
        // balancerVault.exitPool(balancerPoolId, address(this), payable(owner()), request);

        require(_refundAddress != address(0x0), "Stargate: _refundAddress cannot be 0x0");
        require(_amountLP > 0, "Stargate: not enough lp to redeemRemote");
        Pool.SwapObj memory s;
        Pool.CreditObj memory c;
        {
            Pool pool = _getPool(_srcPoolId);
            uint256 amountLD = pool.amountLPtoLD(_amountLP);
            // perform a swap with no liquidity
            s = pool.swap(_dstChainId, _dstPoolId, msg.sender, amountLD, _minAmountLD, false);
            pool.redeemRemote(_dstChainId, _dstPoolId, msg.sender, _amountLP);
            c = pool.sendCredits(_dstChainId, _dstPoolId);
        }
        // equal to a swap, with no payload ("0x") no dstGasForCall 0
        // bridge.swap{value: msg.value}(_dstChainId, _srcPoolId, _dstPoolId, _refundAddress, c, s, _lzTxParams, _to, "");
    }

    function _instantRedeemLocal(
        uint16 _srcPoolId,
        uint256 _amountLP,
        address _to
    ) internal returns (uint256 amountSD) {
        require(_amountLP > 0, "Stargate: not enough lp to redeem");
        Pool pool = _getPool(_srcPoolId);
        amountSD = pool.instantRedeemLocal(msg.sender, _amountLP, _to);
    }

    function instantRemoveBalancerLiquidityLocal(
        uint16 _srcPoolId,
        uint256 _amountLP,
        address _to,
        IVault.ExitPoolRequest memory request
    ) external override nonReentrant {
        uint256 amountSD = _instantRedeemLocal(_srcPoolId, _amountLP, _to);
        bytes32 balancerPoolId = balancerAndStargatePoolLookup[_srcPoolId];
        balancerVault.exitPool(balancerPoolId, address(this), payable(owner()), request);
    }

    // function _redeemLocal(
    //     uint16 _dstChainId,
    //     uint256 _srcPoolId,
    //     uint256 _dstPoolId,
    //     address payable _refundAddress,
    //     uint256 _amountLP,
    //     bytes calldata _to,
    //     lzTxObj memory _lzTxParams
    // ) internal payable override {
    //     require(_refundAddress != address(0x0), "Stargate: _refundAddress cannot be 0x0");
    //     Pool pool = _getPool(_srcPoolId);
    //     require(_amountLP > 0, "Stargate: not enough lp to redeem");
    //     uint256 amountSD = pool.redeemLocal(msg.sender, _amountLP, _dstChainId, _dstPoolId, _to);
    //     require(amountSD > 0, "Stargate: not enough lp to redeem with amountSD");

    //     Pool.CreditObj memory c = pool.sendCredits(_dstChainId, _dstPoolId);
    //     bridge.redeemLocal{value: msg.value}(_dstChainId, _srcPoolId, _dstPoolId, _refundAddress, c, amountSD, _to, _lzTxParams);
    // }

    function removeBalancerLiquidityLocal(
        uint16 _dstChainId,
        uint256 _srcPoolId,
        uint256 _dstPoolId,
        address payable _refundAddress,
        uint256 _amountLP,
        bytes calldata _to,
        lzTxObj memory _lzTxParams,
        IVault.ExitPoolRequest memory request
    ) external payable override nonReentrant {
        require(_refundAddress != address(0x0), "Stargate: _refundAddress cannot be 0x0");
        bytes32 balancerPoolId = balancerAndStargatePoolLookup[_dstPoolId];
        balancerVault.exitPool(balancerPoolId, address(this), payable(owner()), request);

        Pool pool = _getPool(_srcPoolId);
        require(_amountLP > 0, "Stargate: not enough lp to redeem");
        uint256 amountSD = pool.redeemLocal(msg.sender, _amountLP, _dstChainId, _dstPoolId, _to);
        require(amountSD > 0, "Stargate: not enough lp to redeem with amountSD");

        Pool.CreditObj memory c = pool.sendCredits(_dstChainId, _dstPoolId);
        // bridge.redeemLocal{value: msg.value}(_dstChainId, _srcPoolId, _dstPoolId, _refundAddress, c, amountSD, _to, _lzTxParams);
    }

    function sendCredits(
        uint16 _dstChainId,
        uint256 _srcPoolId,
        uint256 _dstPoolId,
        address payable _refundAddress
    ) external payable override nonReentrant {
        require(_refundAddress != address(0x0), "Stargate: _refundAddress cannot be 0x0");
        Pool pool = _getPool(_srcPoolId);
        Pool.CreditObj memory c = pool.sendCredits(_dstChainId, _dstPoolId);
        bridge.sendCredits{value: msg.value}(_dstChainId, _srcPoolId, _dstPoolId, _refundAddress, c);
    }

    function quoteLayerZeroFee(
        uint16 _dstChainId,
        uint8 _functionType,
        bytes calldata _toAddress,
        bytes calldata _transferAndCallPayload,
        Router.lzTxObj memory _lzTxParams
    ) external view override returns (uint256, uint256) {
        return bridge.quoteLayerZeroFee(_dstChainId, _functionType, _toAddress, _transferAndCallPayload, _lzTxParams);
    }

    function revertRedeemLocal(
        uint16 _dstChainId,
        bytes calldata _srcAddress,
        uint256 _nonce,
        address payable _refundAddress,
        lzTxObj memory _lzTxParams
    ) external payable {
        require(_refundAddress != address(0x0), "Stargate: _refundAddress cannot be 0x0");
        bytes memory payload = revertLookup[_dstChainId][_srcAddress][_nonce];
        require(payload.length > 0, "Stargate: no retry revert");
        {
            uint8 functionType;
            assembly {
                functionType := mload(add(payload, 32))
            }
            require(functionType == TYPE_REDEEM_LOCAL_RESPONSE, "Stargate: invalid function type");
        }

        // empty it
        revertLookup[_dstChainId][_srcAddress][_nonce] = "";

        uint256 srcPoolId;
        uint256 dstPoolId;
        assembly {
            srcPoolId := mload(add(payload, 64))
            dstPoolId := mload(add(payload, 96))
        }

        Pool.CreditObj memory c;
        {
            Pool pool = _getPool(dstPoolId);
            c = pool.sendCredits(_dstChainId, srcPoolId);
        }

        bridge.redeemLocalCallback{value: msg.value}(_dstChainId, _refundAddress, c, _lzTxParams, payload);
    }

    // function revertRemoveBalancerLiquidityLocal() external payable {
    //     _revertRedeemLocal(_dstChainId, _srcAddress, _nonce, _refundAddress, _lzTxParams);
    // }

    function retryRevert(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint256 _nonce
    ) external payable {
        bytes memory payload = revertLookup[_srcChainId][_srcAddress][_nonce];
        require(payload.length > 0, "Stargate: no retry revert");

        // empty it
        revertLookup[_srcChainId][_srcAddress][_nonce] = "";

        uint8 functionType;
        assembly {
            functionType := mload(add(payload, 32))
        }

        if (functionType == TYPE_REDEEM_LOCAL_CALLBACK_RETRY) {
            (, uint256 srcPoolId, uint256 dstPoolId, address to, uint256 amountSD, uint256 mintAmountSD) = abi.decode(
                payload,
                (uint8, uint256, uint256, address, uint256, uint256)
            );
            _redeemLocalCallback(_srcChainId, _srcAddress, _nonce, srcPoolId, dstPoolId, to, amountSD, mintAmountSD);
        }
        // for retrying the swapRemote. if it fails again, retry
        else if (functionType == TYPE_SWAP_REMOTE_RETRY) {
            (, uint256 srcPoolId, uint256 dstPoolId, uint256 dstGasForCall, address to, Pool.SwapObj memory s, bytes memory p) = abi.decode(
                payload,
                (uint8, uint256, uint256, uint256, address, Pool.SwapObj, bytes)
            );
            _swapRemote(_srcChainId, _srcAddress, _nonce, srcPoolId, dstPoolId, dstGasForCall, to, s, p);
        } else {
            revert("Stargate: invalid function type");
        }
    }

    function clearCachedSwap(
        uint16 _srcChainId,
        bytes calldata _srcAddress,
        uint256 _nonce
    ) external {
        CachedSwap memory cs = cachedSwapLookup[_srcChainId][_srcAddress][_nonce];
        require(cs.to != address(0x0), "Stargate: cache already cleared");
        // clear the data
        cachedSwapLookup[_srcChainId][_srcAddress][_nonce] = CachedSwap(address(0x0), 0, address(0x0), "");
        IStargateReceiver(cs.to).sgReceive(_srcChainId, _srcAddress, _nonce, cs.token, cs.amountLD, cs.payload);
    }

    function creditChainPath(
        uint16 _dstChainId,
        uint256 _dstPoolId,
        uint256 _srcPoolId,
        Pool.CreditObj memory _c
    ) external onlyBridge {
        Pool pool = _getPool(_srcPoolId);
        pool.creditChainPath(_dstChainId, _dstPoolId, _c);
    }

    //---------------------------------------------------------------------------
    // REMOTE CHAIN FUNCTIONS
    function redeemLocalCheckOnRemote(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint256 _nonce,
        uint256 _srcPoolId,
        uint256 _dstPoolId,
        uint256 _amountSD,
        bytes calldata _to
    ) external onlyBridge {
        Pool pool = _getPool(_dstPoolId);
        try pool.redeemLocalCheckOnRemote(_srcChainId, _srcPoolId, _amountSD) returns (uint256 redeemAmountSD, uint256 mintAmountSD) {
            revertLookup[_srcChainId][_srcAddress][_nonce] = abi.encode(
                TYPE_REDEEM_LOCAL_RESPONSE,
                _srcPoolId,
                _dstPoolId,
                redeemAmountSD,
                mintAmountSD,
                _to
            );
            emit RevertRedeemLocal(_srcChainId, _srcPoolId, _dstPoolId, _to, redeemAmountSD, mintAmountSD, _nonce, _srcAddress);
        } catch {
            // if the func fail, return [swapAmount: 0, mintAMount: _amountSD]
            // swapAmount represents the amount of chainPath balance deducted on the remote side, which because the above tx failed, should be 0
            // mintAmount is the full amount of tokens the user attempted to redeem on the src side, which gets converted back into the lp amount
            revertLookup[_srcChainId][_srcAddress][_nonce] = abi.encode(TYPE_REDEEM_LOCAL_RESPONSE, _srcPoolId, _dstPoolId, 0, _amountSD, _to);
            emit Revert(TYPE_REDEEM_LOCAL_RESPONSE, _srcChainId, _srcAddress, _nonce);
        }
    }

    function redeemLocalCallback(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint256 _nonce,
        uint256 _srcPoolId,
        uint256 _dstPoolId,
        address _to,
        uint256 _amountSD,
        uint256 _mintAmountSD
    ) external onlyBridge {
        _redeemLocalCallback(_srcChainId, _srcAddress, _nonce, _srcPoolId, _dstPoolId, _to, _amountSD, _mintAmountSD);
    }

    function _redeemLocalCallback(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint256 _nonce,
        uint256 _srcPoolId,
        uint256 _dstPoolId,
        address _to,
        uint256 _amountSD,
        uint256 _mintAmountSD
    ) internal {
        Pool pool = _getPool(_dstPoolId);
        try pool.redeemLocalCallback(_srcChainId, _srcPoolId, _to, _amountSD, _mintAmountSD) {} catch {
            revertLookup[_srcChainId][_srcAddress][_nonce] = abi.encode(
                TYPE_REDEEM_LOCAL_CALLBACK_RETRY,
                _srcPoolId,
                _dstPoolId,
                _to,
                _amountSD,
                _mintAmountSD
            );
            emit Revert(TYPE_REDEEM_LOCAL_CALLBACK_RETRY, _srcChainId, _srcAddress, _nonce);
        }
        emit RedeemLocalCallback(_srcChainId, _srcAddress, _nonce, _srcPoolId, _dstPoolId, _to, _amountSD, _mintAmountSD);
    }

    function swapRemote(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint256 _nonce,
        uint256 _srcPoolId,
        uint256 _dstPoolId,
        uint256 _dstGasForCall,
        address _to,
        Pool.SwapObj memory _s,
        bytes memory _payload
    ) external onlyBridge {
        _swapRemote(_srcChainId, _srcAddress, _nonce, _srcPoolId, _dstPoolId, _dstGasForCall, _to, _s, _payload);
    }

    function _swapRemote(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint256 _nonce,
        uint256 _srcPoolId,
        uint256 _dstPoolId,
        uint256 _dstGasForCall,
        address _to,
        Pool.SwapObj memory _s,
        bytes memory _payload
    ) internal {
        Pool pool = _getPool(_dstPoolId);
        // first try catch the swap remote
        try pool.swapRemote(_srcChainId, _srcPoolId, _to, _s) returns (uint256 amountLD) {
            if (_payload.length > 0) {
                // then try catch the external contract call
                try IStargateReceiver(_to).sgReceive{gas: _dstGasForCall}(_srcChainId, _srcAddress, _nonce, pool.token(), amountLD, _payload) {
                    // do nothing
                } catch (bytes memory reason) {
                    cachedSwapLookup[_srcChainId][_srcAddress][_nonce] = CachedSwap(pool.token(), amountLD, _to, _payload);
                    emit CachedSwapSaved(_srcChainId, _srcAddress, _nonce, pool.token(), amountLD, _to, _payload, reason);
                }
            }
        } catch {
            revertLookup[_srcChainId][_srcAddress][_nonce] = abi.encode(
                TYPE_SWAP_REMOTE_RETRY,
                _srcPoolId,
                _dstPoolId,
                _dstGasForCall,
                _to,
                _s,
                _payload
            );
            emit Revert(TYPE_SWAP_REMOTE_RETRY, _srcChainId, _srcAddress, _nonce);
        }
    }

    //---------------------------------------------------------------------------
    // DAO Calls
    function _createPool(
        uint256 _poolId,
        address _token,
        uint8 _sharedDecimals,
        uint8 _localDecimals,
        string memory _name,
        string memory _symbol
    ) internal returns (address) {
        require(_token != address(0x0), "Stargate: _token cannot be 0x0");
        return factory.createPool(_poolId, _token, _sharedDecimals, _localDecimals, _name, _symbol);
    }

    function createBalancerPool(
        uint256 _poolId, // Stargate Pool ID
        string memory _name, // Balancer Pool Name
        string memory _symbol, // Balancer Pool Symbol
        IERC20[] memory _tokens, // Balancer Pool Tokens
        uint256[] memory _weights, // Balancer Pool Token Weights
        address[] memory _assetManagers, // Balancer Asset Managers Per Token
        uint256 _swapFeePercentage // Balancer Pool Swap Fee Percentage
    ) external override returns (address poolAddress) {
        address balancerPoolAddress = IWeightedPoolFactory(balancerWeightedPoolFactory).create(
            _name,
            _symbol,
            _tokens,
            _weights,
            _assetManagers,
            _swapFeePercentage,
            owner()
        );
        uint8 sharedDecimals = 18; // All balancer pool token decimals are 18
        uint8 localDecimals = sharedDecimals;
        poolAddress = _createPool(_poolId, balancerPoolAddress, sharedDecimals, localDecimals, _name, _symbol);
        WeightedPool pool = WeightedPool(balancerPoolAddress);
        bytes32 balancerPoolId = pool.getPoolId();
        balancerAndStargatePoolLookup[_poolId] = balancerPoolId;
    }

    function createChainPath(
        uint256 _poolId,
        uint16 _dstChainId,
        uint256 _dstPoolId,
        uint256 _weight
    ) external onlyOwner {
        Pool pool = _getPool(_poolId);
        pool.createChainPath(_dstChainId, _dstPoolId, _weight);
    }

    function activateChainPath(
        uint256 _poolId,
        uint16 _dstChainId,
        uint256 _dstPoolId
    ) external onlyOwner {
        Pool pool = _getPool(_poolId);
        pool.activateChainPath(_dstChainId, _dstPoolId);
    }

    function setWeightForChainPath(
        uint256 _poolId,
        uint16 _dstChainId,
        uint256 _dstPoolId,
        uint16 _weight
    ) external onlyOwner {
        Pool pool = _getPool(_poolId);
        pool.setWeightForChainPath(_dstChainId, _dstPoolId, _weight);
    }

    function setProtocolFeeOwner(address _owner) external onlyOwner {
        require(_owner != address(0x0), "Stargate: _owner cannot be 0x0");
        protocolFeeOwner = _owner;
    }

    function setMintFeeOwner(address _owner) external onlyOwner {
        require(_owner != address(0x0), "Stargate: _owner cannot be 0x0");
        mintFeeOwner = _owner;
    }

    function setFees(uint256 _poolId, uint256 _mintFeeBP) external onlyOwner {
        Pool pool = _getPool(_poolId);
        pool.setFee(_mintFeeBP);
    }

    function setFeeLibrary(uint256 _poolId, address _feeLibraryAddr) external onlyOwner {
        Pool pool = _getPool(_poolId);
        pool.setFeeLibrary(_feeLibraryAddr);
    }

    function setSwapStop(uint256 _poolId, bool _swapStop) external onlyOwner {
        Pool pool = _getPool(_poolId);
        pool.setSwapStop(_swapStop);
    }

    function setDeltaParam(
        uint256 _poolId,
        bool _batched,
        uint256 _swapDeltaBP,
        uint256 _lpDeltaBP,
        bool _defaultSwapMode,
        bool _defaultLPMode
    ) external onlyOwner {
        Pool pool = _getPool(_poolId);
        pool.setDeltaParam(_batched, _swapDeltaBP, _lpDeltaBP, _defaultSwapMode, _defaultLPMode);
    }

    function callDelta(uint256 _poolId, bool _fullMode) external {
        Pool pool = _getPool(_poolId);
        pool.callDelta(_fullMode);
    }

    function withdrawMintFee(uint256 _poolId, address _to) external {
        require(mintFeeOwner == msg.sender, "Stargate: only mintFeeOwner");
        Pool pool = _getPool(_poolId);
        pool.withdrawMintFeeBalance(_to);
    }

    function withdrawProtocolFee(uint256 _poolId, address _to) external {
        require(protocolFeeOwner == msg.sender, "Stargate: only protocolFeeOwner");
        Pool pool = _getPool(_poolId);
        pool.withdrawProtocolFeeBalance(_to);
    }
}
