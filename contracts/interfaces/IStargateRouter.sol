// SPDX-License-Identifier: GPL-3.0-only

pragma solidity 0.7.6;
pragma abicoder v2;

import "@balancer-labs/v2-solidity-utils/contracts/openzeppelin/IERC20.sol";
import {IVault} from "@balancer-labs/v2-vault/contracts/interfaces/IVault.sol";

interface IStargateRouter {
    struct lzTxObj {
        uint256 dstGasForCall;
        uint256 dstNativeAmount;
        bytes dstNativeAddr;
    }

    function createBalancerPool(
        uint256 _poolId,
        string memory _name,
        string memory _symbol,
        IERC20[] memory _tokens,
        uint256[] memory _weights,
        address[] memory _assetManagers,
        uint256 _swapFeePercentage
    ) external returns (address);

    function addBalancerLiquidity(
        uint256 _poolId, 
        IVault.JoinPoolRequest memory request
    ) external payable;

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
    ) external payable;

    // function _redeemRemote(
    //     uint16 _dstChainId,
    //     uint256 _srcPoolId,
    //     uint256 _dstPoolId,
    //     address payable _refundAddress,
    //     uint256 _amountLP,
    //     uint256 _minAmountLD,
    //     bytes calldata _to,
    //     lzTxObj memory _lzTxParams
    // ) external payable;

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
    ) external payable;

    // function _instantRedeemLocal(
    //     uint16 _srcPoolId,
    //     uint256 _amountLP,
    //     address _to
    // ) external returns (uint256);

    function instantRemoveBalancerLiquidityLocal(
        uint16 _srcPoolId,
        uint256 _amountLP,
        address _to,
        IVault.ExitPoolRequest memory request
    ) external;

    // function _redeemLocal(
    //     uint16 _dstChainId,
    //     uint256 _srcPoolId,
    //     uint256 _dstPoolId,
    //     address payable _refundAddress,
    //     uint256 _amountLP,
    //     bytes calldata _to,
    //     lzTxObj memory _lzTxParams
    // ) external payable;

    function removeBalancerLiquidityLocal(
        uint16 _dstChainId,
        uint256 _srcPoolId,
        uint256 _dstPoolId,
        address payable _refundAddress,
        uint256 _amountLP,
        bytes calldata _to,
        lzTxObj memory _lzTxParams,
        IVault.ExitPoolRequest memory request
    ) external payable;

    function sendCredits(
        uint16 _dstChainId,
        uint256 _srcPoolId,
        uint256 _dstPoolId,
        address payable _refundAddress
    ) external payable;

    function quoteLayerZeroFee(
        uint16 _dstChainId,
        uint8 _functionType,
        bytes calldata _toAddress,
        bytes calldata _transferAndCallPayload,
        lzTxObj memory _lzTxParams
    ) external view returns (uint256, uint256);
}
