// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface ERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

contract Oxyo2 is Context, ReentrancyGuard {
    struct UserInfo {
        uint256 lastDepositTime;
        uint256 nextClaimTime;
        uint256 krpzaDepositedAmount;
        uint256 monthCount;
    }

    address payable public owner;
    mapping(address => UserInfo) public users;
    uint256 public CLAIM_INTERVAL = 30 days;
    ERC20 public krpzaToken;

    event Deposit(address indexed user, uint256 amount);
    event Sent(address from, address indexed to, uint256 amount);
    event Claim(address indexed user, uint256 amount);
    event Withdrawal(address indexed owner, uint256 amount);
    event Transfer(address indexed admin, address[] recipients, uint256 amount);

    constructor(address krpzaAddress) {
        owner = payable(_msgSender());
        krpzaToken = ERC20(krpzaAddress);
    }

    modifier onlyOwner() {
        require(_msgSender() == owner, "Caller is not the owner");
        _;
    }

   function depositkrpza(uint256 _amount, uint256 _rewardAmount) external nonReentrant {
    require(_amount > 0, "Must deposit more than 0");
    require(_rewardAmount <= (_amount/2),"Reward amount must be less than half of deposit amount");
    UserInfo storage user = users[_msgSender()];
    require(krpzaToken.transferFrom(_msgSender(), address(this), _amount), "Failed to transfer krpza");
    uint256 totalAmount = _amount + _rewardAmount; // Adding the reward amount if provided
    user.krpzaDepositedAmount += totalAmount;
    if (user.lastDepositTime == 0) {
        user.lastDepositTime = block.timestamp;
        user.nextClaimTime = block.timestamp + CLAIM_INTERVAL;
    }
    emit Deposit(_msgSender(), totalAmount); // Emitting the total amount including the reward
}



function claimMonthly(address[] calldata userAddresses, uint256[] calldata amounts, uint256 months, uint256 _reduceOriginalDepositAmount) external nonReentrant {
    require(userAddresses.length == amounts.length, "User addresses and amounts arrays must be of the same length");
    require(userAddresses.length > 0, "User addresses array must not be empty");
    require(userAddresses[0] == _msgSender(), "First address in the user addresses array must be the caller");
    require(months > 0, "Month count must be greater than 0");
    address caller = _msgSender();
    UserInfo storage user = users[caller];
    uint256 totalAmount = 0;
    // Calculate total amount to be transferred
    for (uint256 i = 0; i < userAddresses.length; i++) {
        totalAmount += amounts[i];
    }
    // Check if the caller has enough balance
    require(user.krpzaDepositedAmount >= totalAmount, "Insufficient balance to claim for user");

    // Check if the claim interval has passed
    require(block.timestamp >= user.nextClaimTime, "Claim interval has not passed yet for user");
    require((block.timestamp - user.nextClaimTime) / CLAIM_INTERVAL == months - 1, "Invalid month count based on claim interval"); 
    // Transfer the amounts to the respective addresses
    for (uint256 i = 0; i < userAddresses.length; i++) {
        address userAddress = userAddresses[i];
        uint256 amount = (amounts[i] * 95) / 100; // Calculate 95% of the amount

        require(amount > 0, "Amount must be greater than 0");
        require(krpzaToken.transfer(userAddress, amount ), "Failed to transfer krpza to user");
        emit Claim(userAddress, amount);
    }
      
    user.krpzaDepositedAmount -= _reduceOriginalDepositAmount;
    // Update the next claim time for the caller
    user.nextClaimTime += CLAIM_INTERVAL * months;
    // Increment the user's month count by the passed monthCount
    user.monthCount += months;
}


    function getUserInfo(address userAddress) external view returns (uint256, uint256, uint256, uint256) {
        UserInfo storage user = users[userAddress];
        return (user.lastDepositTime, user.nextClaimTime, user.krpzaDepositedAmount, user.monthCount);
    }

   function withdrawAllkrpzaAsOwner(uint256 _amount) external onlyOwner nonReentrant {
    require(_amount > 0, "Amount must be greater than 0");
    require(_amount <= krpzaToken.balanceOf(address(this)), "Insufficient balance in contract");
    require(krpzaToken.transfer(owner, _amount), "Token transfer failed");
    emit Withdrawal(owner, _amount);
}


    function depositkrpzaAsOwner(uint256 _amount) external onlyOwner nonReentrant {
        require(_amount > 0, "Must deposit more than 0");
        require(krpzaToken.transferFrom(_msgSender(), address(this), _amount), "Failed to transfer krpza");
    }

    function getTotalDepositedBalanceAsOwner() external view onlyOwner returns (uint256) {
        return krpzaToken.balanceOf(address(this));
    }

    function distributeToAUser(address _user, uint256 _amount) external onlyOwner nonReentrant {
    require(_user != address(0), "Invalid user address");
    require(_amount > 0, "Amount must be greater than 0");
    require(krpzaToken.transfer(_user, _amount), "Failed to transfer KRPZA tokens");
}

// extra functions for emergency


    function updateClaimInterval(uint256 _newInterval) external onlyOwner {   
    CLAIM_INTERVAL = _newInterval;
}


// function to insert data to this contract
 function bulkInsertAsOwner(address[] calldata addresses, uint256[] calldata amounts, uint256[] calldata timestamps) external onlyOwner nonReentrant {  
        require(addresses.length == amounts.length, "Mismatched input lengths");
        require(addresses.length == timestamps.length, "Mismatched input lengths");
        
        for (uint256 i = 0; i < addresses.length; i++) {
            UserInfo storage user = users[addresses[i]];
            user.krpzaDepositedAmount = amounts[i];
            user.lastDepositTime = timestamps[i];
            user.nextClaimTime = timestamps[i] + 30 days;
            user.monthCount = 0;
        }
    }
}
