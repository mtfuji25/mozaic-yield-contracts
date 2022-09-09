# Mozaic

"by periodically investing in an index fund, the know-nothing investors can actually outperform most investment professionals." - warren buffett

What is Mozaic Finance?
The core principle of Mozaic Finance is to provide a seamless user interface, to target both crypto and retail participants, to a one click and forget high yielding index strategies. Unlike most index’ we aim to use the tokens to efficiently yield farm by auto compounding and auto switching protocols at the most efficient time

Project Vision
To establish a strong hold on Avalanche network before being multichain like https://www.beefy.finance/. We will likely move to Optimism next and then to Zksync as each chain will have a different APY for coins and fees will be cheap enough to be viable. May skip optimism to straight Zksync depending on TVL at the time. Zksync is a game changer for ETH and I expect this to be Ethereum's layer 2 solution winner. Building a strong presence on there first is important

Why Avalanche Network?
Cheap fees and fast network
Growing community and no index funds yet (first mover advantage, especially if we yield farm and autoswitch protocols)
Ava rush 180mil incentives
Good connections through Cyberfi (launchpad we are using)
Big protocols soon to be compatible with Avalanche
Solidity compatible dapps (can move to other solidity chains easier)
Avalanche plans to tokenize traditional markets (https://cryptoseq.medium.com/avalanche-looks-set-for-exponential-growth-with-subnets-enterprise-partnerships-defi-blue-chips-2ede71f62d35)


Defi protocols on Avalanche
https://defillama.com/chain/Avalanche
Can use sub headings to easily find other protocols eg lending

Protocols to start with 
Lending
Benqi
Aave
Crv (coming)
Aggregators
Yieldyak
Stormswap
Snowball
Dex
Trader Joe

Protocols to swap tokens
Zapper
PNG
Trader Joe


Technical Overview

Simplicity to the user is key
Deposit stablecoin or underlying asset into vault
Vault will change asset to correct weighting on next rebalance
Each vault will be an index of sorts for different sectors, eg gaming, avax ecosystem, stables, defi ect. 
Future iterations can introduce strategies but for now just being an index seems like a good start
The Mozaic algo will jump between each pool that has the highest yield on each platform, for each separate token in the vault, every hour to ensure the user gets the highest possible return
If no new location shows a higher reward, the algo auto compounds
Rewards from other protocols are sold instantly and reused in the vault
Mozaic holders can withdraw whenever they want for a 1% withdraw fee
Performance fee of 20% to be charged when? Yfi does every time a vault harvests a strategy. Traditional markets do monthly or quarterly. Do we do it just when people withdraw?




Tokenomics

The total MOZ token supply is set at 100,000,000.
Not finalized but will be similar

FLA
Will be using Copper for a LBP 3 day event. This helps establish a fair price and liquidity for the pool. May need to do 1:1 swap from eth to avax. (still working on this)

Ecosystem
2 year incentive program on vaults to boost rewards to entice users
Also saving some for when we move to other chains and we can do another 2 years incentive program on that chain
Also boosting MOZ staking rewards for 2 years
Also considering doing 2 weeks of high rewards just to get the protocol out there, best form of advertising
(may do token rewards over 4 years to reduce inflation)
Bootstrap other chains with ecosystem rewards

Treasury 
includes insurance fund and possibly bug bounty

Launchpad
Going with Cyberfi and raising 200-300k

Seed Investors
Raised 200k at same price as launchpad

Mozaic Release Schedule
FLA
No lockup
Team and advisors
Unlocking 6 months after mainnet launch 10% per 3-month period
Seed Investors 
Unlocking ¼ of their tokens each quarter beginning from mainnet launch
Launchpad
***need to talk to cyberfi


Fees
Management Fee
0%
Withdraw Fee
1%
Performance Fee
20% - UPDATED
	50% towards staking, 20% to buy and burn, 30% into treasury (not finalized, will need to do modeling to find correct ratio and not provide sell pressure)

The MOZ token is primarily a utility token designed to reward holders when investors use the Mozaic Protocol and to allow a fully decentralized governance of the protocol.
To incentivize governance participation, we have designed the following incentive structure:

1.
Staking rewards increase as more users use the protocol > 2. More rewards increase demand for MOZ > 3. MOZ token awareness increases > 4. Protocol awareness increases > 5. Protocol volume increases > Back to 1.

Image from Piedao but we will pretty much do the same

Use cases for Mozaic token
Governance and equity through staking

Staking
Two ways to profit using Mozaic Finance. The first is the profit through the vaults and the second is being part owner by staking. 
Stakers will receive 50% of the performance fee, 


Governance
Will transition into a DAO after established
If you stake for over 3 months you have the right to vote
Governance changing all the time in the space so will wait to decide how to do it when the time is right but being decentralized is important for long term success especially if legislation comes in
Voting takes 3-4 days
Longer you stake the more voting power accumulates? CRV format

Weighting
Some are even split of each token
Some are weighed by marketcap (some of piedao)
Consider volatility, slippage, random spikes of APY (move portions over at a time because of this?) (YFI might have scaling solutions)
In a vault with 5 tokens could do 10% each then a floating 50% towards highest apy
May need universal weighting formula across all vaults
Index Weight Calculation
The $MVI uses a combination of root market cap and liquidity weighting to arrive at the final index weights. We believe that liquidity is an important consideration in this space and should be considered when determining portfolio allocation.
TW = 75%*RMCW + 25% * LW
Where,
TW – token weight in the $MVI
RMCW – square root of market cap weighted allocation
LW – liquidity weighted allocation

Risks
overcollateralized loans
smart contract bugs
attacks on liquidity pools
counterparty risk
slippage

Random thoughts and notes
Create stickiness after launch. Not pump and dump free but creates time to make more utility
Need a strong community - how to do this?
Treasury will go to DAO
Make sure people are already using the airdrop, reward early users, reward people who use the protocol. Make the utility way more attractive than dumping
Focus on problem solved then business model then how to use tokens to incentivise
zksync form to get on their testnet
https://docs.google.com/forms/d/e/1FAIpQLSdIyI71PKPAM5IQkup53Aoo9imxORGx8RSX_khCJuCceDD6mw/viewform
Inequality hurts growth, fairly distribute tokens
Add value by holding the token (lock up bonus rewards? Cream have done this)
bug bounty with immunefi so whitehats can constantly test your project and try find vulnerabilities


Engineering standpoint:
Connector logic that instadapp users and work on integrating with a bunch of protocols first and then when we have a working product move on to asking projects for a grant to integrate them into our product to help scale the protocol
https://docs.instadapp.io/guides/create-connectors

Token economics framework:
Market Design
Thickness
No congestion
Safety
Mechanism design
Governance
Non-financial incentives
Structure
Token design
Token policy
Financial incentives
architecture

Advisors
Friend working at Perp Protocol
Said we can get more funding from their VCs once we are established 
Possible integration with perp down the road but just random talk
OMG lead dev for 3 years
Good for high-level technical aspects of software and blockchain if we need
Cyberfi
Good for technicals on avax i think
Also friends with Big twitter personalities ranging from 20-60k followers due to working at the same firm with them
Good for advertising when we are ready

Useful links
Competition (not on avax and they also don't yield farm except for piedao)
https://www.tokensets.com/explore
https://www.piedao.org/#/pies
https://app.enzyme.finance/depositor/leaderboard
https://powerindex.io/
Other links we may use
https://yieldfarming.info/
https://thegraph.com/en/
APIs for data
https://docs.instadapp.io/guides/create-connectors
