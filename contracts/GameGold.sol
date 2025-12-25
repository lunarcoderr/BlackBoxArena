// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.27;

import {ERC7984} from "confidential-contracts-v91/contracts/token/ERC7984/ERC7984.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";

/// @title GameGold
/// @notice Confidential token with black box rewards for players
contract GameGold is ERC7984, ZamaEthereumConfig {
    uint256 private constant INITIAL_BLACK_BOXES = 4;

    mapping(address player => uint256) private _blackBoxes;
    mapping(address player => bool) private _initialized;
    uint256 private _nonce;

    error NoBlackBoxesLeft(address player);

    event BlackBoxOpened(
        address indexed player,
        bool mintedTokens,
        uint256 clearRewardAmount,
        uint256 blackBoxesRemaining,
        euint64 encryptedMinted
    );

    constructor() ERC7984("GameGold", "GameGold", "") {}

    /// @notice Returns the number of unopened black boxes for a player.
    /// @param player Address of the player to query.
    function blackBoxesOf(address player) external view returns (uint256) {
        if (_initialized[player]) {
            return _blackBoxes[player];
        }
        return INITIAL_BLACK_BOXES;
    }

    /// @notice Initializes a player with the default black boxes if not initialized yet.
    function joinGame() external {
        _ensureInitialized(msg.sender);
    }

    /// @notice Opens a black box for the caller and mints rewards or an extra box.
    /// @return mintedAmount Encrypted amount minted to the caller (zero when no tokens were minted).
    /// @return boxesAfterOpen Remaining unopened black boxes for the caller.
    /// @return rewardedWithBox True if the reward was an additional black box instead of tokens.
    function openBlackBox()
        external
        returns (euint64 mintedAmount, uint256 boxesAfterOpen, bool rewardedWithBox)
    {
        _ensureInitialized(msg.sender);

        if (_blackBoxes[msg.sender] == 0) {
            revert NoBlackBoxesLeft(msg.sender);
        }

        _blackBoxes[msg.sender] -= 1;

        uint256 randomSeed = _nextRandomSeed(msg.sender);
        bool rewardTokens = randomSeed % 2 == 0;

        if (rewardTokens) {
            uint256 clearAmount = (randomSeed % 100) + 1;
            euint64 encryptedAmount = FHE.asEuint64(uint64(clearAmount));
            mintedAmount = _mint(msg.sender, encryptedAmount);
            boxesAfterOpen = _blackBoxes[msg.sender];
            rewardedWithBox = false;

            emit BlackBoxOpened(msg.sender, true, clearAmount, boxesAfterOpen, mintedAmount);
            return (mintedAmount, boxesAfterOpen, rewardedWithBox);
        }

        _blackBoxes[msg.sender] += 1;
        boxesAfterOpen = _blackBoxes[msg.sender];
        mintedAmount = FHE.asEuint64(0);
        rewardedWithBox = true;

        FHE.allow(mintedAmount, msg.sender);
        emit BlackBoxOpened(msg.sender, false, 0, boxesAfterOpen, mintedAmount);
    }

    function _ensureInitialized(address player) private {
        if (_initialized[player]) {
            return;
        }

        _initialized[player] = true;
        _blackBoxes[player] = INITIAL_BLACK_BOXES;
    }

    function _nextRandomSeed(address player) private returns (uint256) {
        unchecked {
            ++_nonce;
        }

        return uint256(keccak256(abi.encodePacked(block.prevrandao, block.timestamp, player, _nonce, _blackBoxes[player])));
    }
}
