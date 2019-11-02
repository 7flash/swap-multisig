pragma solidity ^0.5.11;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Multisig.sol";

contract MultisigFactory {
  IERC20 private _token;

  constructor(address token)
    public
  {
    _token = IERC20(token);
  }

  function create(address[] memory owners)
    public
  {
    require(owners.length == 2 || owners.length == 3);

    address firstOwner = owners[0];
    address secondOwner = owners[1];

    address thirdOwner = address(0x0);
    if (owners.length == 3) {
      thirdOwner = owners[2];
    }

    Multisig newMultisig = new Multisig(
      address(_token),
      firstOwner,
      secondOwner,
      thirdOwner
    );

    emit Created(address(newMultisig));
  }

  event Created(address multisig);
}
