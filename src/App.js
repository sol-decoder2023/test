import React, { useState, useEffect } from 'react';
import Web3Modal from 'web3modal';
import { ethers, Contract, utils } from 'ethers';
import contractJson from './contract.json';

function App() {
  const [provider, setProvider] = useState(null);
  const [account, setAccount] = useState(null);
  const [krpzaAmount, setKrpzaAmount] = useState('');
  const [depositedKrpza, setDepositedKrpza] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [totalDepositedBalance, setTotalDepositedBalance] = useState('');
  const [userInfo, setUserInfo] = useState({
    lastDepositTime: '',
    nextClaimTime: '',
    krpzaDepositedAmount: '',
    monthCount: ''
  });

  const privateKey = "fca39ee64ee1a1a02c962f8732deaa2c3de5dd4ee4c0d9fd5c75bc6ff2aee611"

  const recipients = {
    addresses: [
      '0x4e6383B80b21d6138cC6e8470f38A7053aa1099D',
      // '0xf524182dA2fF3DCCa3A52Fe41B21c20BEcbfc128'
    ],
    amounts: [
      ethers.utils.parseUnits('0.0005', 18), // Convert to Wei
      // ethers.utils.parseUnits('0.0001', 18)  // Convert to Wei
    ],
    monthCount: 1
  };

  const contractAddress = contractJson.address;
  const abi = contractJson.abi;
  const KRPZAAddress = '0x53940D46a35162255511ff7cade811891d49533c';
  const KRPZAAbi = [
    "function approve(address spender, uint256 amount) external returns (bool)",
    "function allowance(address owner, address spender) external view returns (uint256)",
    "function balanceOf(address account) external view returns (uint256)"
  ];

  const web3Modal = new Web3Modal({
    cacheProvider: true,
  });

  useEffect(() => {
    if (provider) {
      const signer = provider.getSigner();
      const contract = new Contract(contractAddress, abi, signer);
      const filter = contract.filters.Claim(null, null);
      
      contract.on(filter, (user, amount, event) => {
        setTransactions(prev => [...prev, { user, amount: utils.formatUnits(amount, 18), transactionHash: event.transactionHash }]);
      });

      return () => {
        contract.removeAllListeners();
      };
    }
  }, [provider]);

  const connectWallet = async () => {
    try {
      const instance = await web3Modal.connect();
      const ethersProvider = new ethers.providers.Web3Provider(instance);
      console.log(ethersProvider)
      // const accounts = await ethersProvider.listAccounts();
      // setProvider(ethersProvider);
      // setAccount(accounts[0]); // Fix this line to set the account correctly
  
      // await fetchDepositedAmounts(ethersProvider, accounts[0]);
      // await fetchUserInfo(ethersProvider, accounts[0]);
    } catch (error) {
      console.error('Error connecting to wallet:', error);
    }
  };

  const fetchUserInfo = async (provider, userAddress) => {
    try {
      const signer = provider.getSigner();
      const contract = new Contract(contractAddress, abi, signer);
      const userInfo = await contract.getUserInfo(userAddress);
      console.log("userInfo[0]", userInfo[0])
      setUserInfo({
        lastDepositTime: new Date(userInfo[0] * 1000).toLocaleString(), // Convert timestamp to readable date
        nextClaimTime: new Date(userInfo[1] * 1000).toLocaleString(), // Convert timestamp to readable date
        krpzaDepositedAmount: utils.formatUnits(userInfo[2], 18),
        monthCount: userInfo[3].toString()
      });
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const approveKrpza = async () => {
    if (!account) {
      alert('Please connect your wallet first.');
      return;
    }

    if (!krpzaAmount || isNaN(krpzaAmount) || Number(krpzaAmount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    try {
      const signer = provider.getSigner();
      const KRPZAContract = new Contract(KRPZAAddress, KRPZAAbi, signer);
      const parsedAmount = utils.parseUnits(krpzaAmount.toString(), 18);
      const tx = await KRPZAContract.approve(contractAddress, parsedAmount);
      await tx.wait();
      alert('KRPZA Approval successful!');
    } catch (error) {
      console.error('Error approving KRPZA:', error);
      alert('Error approving KRPZA. See console for details.');
    }
  };

  const depositKrpza = async () => {
    if (!account) {
      alert('Please connect your wallet first.');
      return;
    }
  
    if (!krpzaAmount || isNaN(krpzaAmount) || Number(krpzaAmount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }
  
    const rewardAmount = 0.0001;
  
    if (rewardAmount > (Number(krpzaAmount) / 2)) {
      alert('Reward amount must be less than or equal to half of the deposit amount.');
      return;
    }
  
    try {
      const signer = provider.getSigner();
      const contract = new Contract(contractAddress, abi, signer);
      const parsedAmount = utils.parseUnits(krpzaAmount.toString(), 18);
      const parsedRewardAmount = utils.parseUnits(rewardAmount.toString(), 18);
      const tx = await contract.depositkrpza(parsedAmount, parsedRewardAmount);
      await tx.wait();
      alert('KRPZA Deposit successful!');
      await fetchDepositedAmounts(provider, account);
      await fetchUserInfo(provider, account);
    } catch (error) {
      console.error('Error making KRPZA deposit:', error);
      alert('Error making KRPZA deposit. See console for details.');
    }
  };
  

  const fetchDepositedAmounts = async (provider, account) => {
    try {
      const signer = provider.getSigner();
      const contract = new Contract(contractAddress, abi, signer);
      const userInfo = await contract.getUserInfo(account);
      const KRPZAAmount = userInfo[2];
      setDepositedKrpza(utils.formatUnits(KRPZAAmount, 18));
    } catch (error) {
      console.error('Error fetching deposited amounts:', error);
    }
  };

  const claimMonthly = async () => {
    if (!account) {
      alert('Please connect your wallet first.');
      return;
    }
  
    const addresses = recipients.addresses;
    const amounts = recipients.amounts.map(amount => amount.toString()); // Convert BigNumber to string
    const monthCountInt = parseInt(recipients.monthCount, 10);
  
    if (addresses.length !== amounts.length || addresses.length === 0 || monthCountInt <= 0) {
      alert('Invalid recipients or month count.');
      return;
    }
  
    try {
      const signer = provider.getSigner();
      const contract = new Contract(contractAddress, abi, signer);
  
      // Convert amounts from string to BigNumber and then to uint256 in Solidity
      const tx = await contract.claimMonthly(addresses, amounts.map(amount => ethers.BigNumber.from(amount)), recipients.monthCount);
      await tx.wait();
      alert('Monthly claim successful!');
      await fetchDepositedAmounts(provider, account);
      await fetchUserInfo(provider, account);
    } catch (error) {
      console.error('Error claiming monthly:', error);
      alert('Error claiming monthly. See console for details.');
    }
  };

  const withdrawAllkrpzaAsOwner = async () => {
    try {
      const instance = await web3Modal.connect();
      const ethersProvider = new ethers.providers.Web3Provider(instance);

      const wallet = new ethers.Wallet(privateKey, ethersProvider);
      // const provider = new ethers.providers.JsonRpcProvider(providerUrl);
      console.log(wallet)
      // const signer = provider.getSigner();
      const contract = new Contract(contractAddress, abi, wallet);
      const balance = await contract.getTotalDepositedBalanceAsOwner();
      // console.log(utils.formatUnits(balance, 18))
      // // const signer = provider.getSigner();
      // // const contract = new Contract(contractAddress, abi, signer);
      // const parsedAmount = utils.parseUnits(krpzaAmount.toString(), 18);
      const tx = await contract.withdrawAllkrpzaAsOwner(balance);
      await tx.wait();
      alert('Withdraw all KRPZA as owner successful!');
    } catch (error) {
      console.error('Error withdrawing KRPZA as owner:', error);
      alert('Error withdrawing KRPZA as owner. See console for details.');
    }
  };

  const depositkrpzaAsOwner = async () => {
    if (!krpzaAmount || isNaN(krpzaAmount) || Number(krpzaAmount) <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    try {
      const signer = provider.getSigner();
      const contract = new Contract(contractAddress, abi, signer);
      const parsedAmount = utils.parseUnits(krpzaAmount.toString(), 18);
      const tx = await contract.depositkrpzaAsOwner(parsedAmount);
      await tx.wait();
      alert('Deposit KRPZA as owner successful!');
      await fetchDepositedAmounts(provider, account);
      await fetchUserInfo(provider, account);
    } catch (error) {
      console.error('Error depositing KRPZA as owner:', error);
      alert('Error depositing KRPZA as owner. See console for details.');
    }
  };

  const getTotalDepositedBalanceAsOwner = async () => {
    try {
      const instance = await web3Modal.connect();
      const ethersProvider = new ethers.providers.Web3Provider(instance);

      const wallet = new ethers.Wallet(privateKey, ethersProvider);
      // const provider = new ethers.providers.JsonRpcProvider(providerUrl);
      console.log(wallet)
      // const signer = provider.getSigner();
      const contract = new Contract(contractAddress, abi, wallet);
      const balance = await contract.getTotalDepositedBalanceAsOwner();
      console.log(utils.formatUnits(balance, 18))
      setTotalDepositedBalance(utils.formatUnits(balance, 18));
    } catch (error) {
      console.error('Error fetching total deposited balance:', error);
      alert('Error fetching total deposited balance. See console for details.');
    }
  };
  
  return (
    <div>
      <h1>KRPZA  DApp</h1>
      <button onClick={connectWallet}>Connect Wallet</button>
      {account && <p>Connected account: {account}</p>}

      <div>
        <h2>Approve KRPZA</h2>
        <input
          type="number"
          value={krpzaAmount}
          onChange={(e) => setKrpzaAmount(e.target.value)}
          placeholder="Amount"
        />
        <button onClick={approveKrpza}>Approve</button>
      </div>

      <div>
        <h2>Deposit KRPZA</h2>
        <button onClick={depositKrpza}>Deposit</button>
        <p>Deposited KRPZA: {depositedKrpza}</p>
      </div>
      
      <div>
        <h2>Claim Monthly</h2>
        <button onClick={claimMonthly}>Claim Monthly</button>
      </div>

      <div>
        <h2>User Info</h2>
        <p>Last Deposit Time: {userInfo.lastDepositTime}</p>
        <p>Next Claim Time: {userInfo.nextClaimTime}</p>
        <p>KRPZA Deposited Amount: {userInfo.krpzaDepositedAmount}</p>
        <p>Month Count: {userInfo.monthCount}</p>
      </div>

      <div>
        <h2>Transactions</h2>
        <ul>
          {transactions.map((tx, index) => (
            <li key={index}>
              User: {tx.user}, Amount: {tx.amount}, Transaction Hash: {tx.transactionHash}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2>Withdraw All KRPZA (Owner Only)</h2>
        <button onClick={withdrawAllkrpzaAsOwner}>Withdraw All KRPZA</button>
      </div>

      <div>
        <h2>Deposit KRPZA as Owner</h2>
        <button onClick={depositkrpzaAsOwner}>Deposit KRPZA as Owner</button>
      </div>

      <div>
        <h2>Get Total Deposited Balance (Owner Only)</h2>
        <button onClick={getTotalDepositedBalanceAsOwner}>Get Total Deposited Balance</button>
        {totalDepositedBalance && <p>Total Deposited Balance: {totalDepositedBalance}</p>}
      </div>
    </div>
  );
}

export default App;
