pragma solidity ^0.5.11;

import "@openzeppelin/contracts/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Multisig {
  using ECDSA for bytes32;

  IERC20 private _token;
  address private _firstOwner;
  address private _secondOwner;
  address private _thirdOwner;

  uint256 public nonce = 0;

  event Send(address beneficiary, uint256 value);

  constructor(address token, address firstOwner, address secondOwner, address thirdOwner)
    public
  {
    address zeroAddress = address(0x0);

    require(firstOwner != zeroAddress);
    require(secondOwner != zeroAddress);

    require(firstOwner != secondOwner);
    require(secondOwner != thirdOwner);
    require(firstOwner != thirdOwner);

    _token = IERC20(token);
    _firstOwner = firstOwner;
    _secondOwner = secondOwner;
    _thirdOwner = thirdOwner;
  }

  function getToken()
    public view returns (address)
  {
    return address(_token);
  }

  function getOwners()
    public view returns(address, address, address)
  {
    return (_firstOwner, _secondOwner, _thirdOwner);
  }

  function prepare(address beneficiary, uint256 value)
    public view returns (bytes32)
  {
    require(beneficiary != address(this));

    bytes32 message = keccak256(
      abi.encodePacked(
        nonce,
        this,
        value,
        beneficiary
      )
    );

    return message;
  }

  function send(address beneficiary, uint256 value, bytes memory firstSignature, bytes memory secondSignature)
    public
  {
    require(_token.balanceOf(address(this)) >= value);
    require(_validSignatures(beneficiary, value, firstSignature, secondSignature));

    nonce += 1;

    _token.transfer(beneficiary, value);
    emit Send(beneficiary, value);
  }

  function _validSignatures(address beneficiary, uint256 value, bytes memory firstSignature, bytes memory secondSignature)
    private view returns (bool)
  {
    bytes32 hash = prepare(beneficiary, value).toEthSignedMessageHash();

    address firstSigner = hash.recover(firstSignature);
    address secondSigner = hash.recover(secondSignature);

    bool distinctSigners = firstSigner != secondSigner;

    return _isOwner(firstSigner) && _isOwner(secondSigner) && distinctSigners;
  }

  function _isOwner(address signer)
    private view returns (bool)
  {
    return signer == _firstOwner ||
      signer == _secondOwner ||
      signer == _thirdOwner;
  }
}
