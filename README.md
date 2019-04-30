# Penny Seed
_Decentralized Income_

## 📚 Table of Contents
- [The 4 Elements of Content](#the-4-elements-of-content)
- [Current Monetization Methods](#current-monetization-methods)
- [Problems](#problems)
- [Insight](#insight)
- [Solution](#solution)
- [User Experience](#user-experience)
- [Benefits](#benefits)
- [Use Cases](#use-cases)
- [Implementation](#implementation)
- [Profit Model](#profit-model)
- [Building a Community](#building-a-community)

## The 4 Elements of Content
🖌️ Creation
📡 Distribution
🔎 Discovery
💰 Monetization

## Current Monetization Methods
1. Pay-per-Media
2. Subscription
3. Advertising
4. Donations
5. Crowdfunding
6. Merchandise

## Problems
- Processing Fees
- Arbitrary Pricing with no guarantee of a stable income
- Not extendable for custom incentive structures

## Insight
- The Creator wants everyone to enjoy it
- Most of the money goes to living expenses
- Fans aren't paying for Content - they're paying for Future Content

## Solution
- A "Split-the-Bill" Model that divides the Target Amount by the number of Pledgers
- A Minimal Design that doesn't try to be a Social Network
- An Extendable Architecture that allows for integration with existing Content Production, Distribution, and Discovery Applications

## User Experience
1. A Creator creates a Campaign, specifying the following:
    - Campaign Description
    - Target Amount
    - Minimum number of Pledgers or Maximum Amount per Pledge
    - Deadline
2. A page is created, including the Campaign Details, the current number of Pledgers so far, and a "Pledge" button
3. The Creator shares the link with all of their followers
4. People pledge by paying (Target Amount)/(Minimum Pledgers)

By the deadline, if the Minimum number of Pledgers is met:

5. The Target Amount is sent to the Creator
6. Pledgers are refunded the difference between the Maximum Pledge Amount and the (Target Amount)/(Total Pledgers)

Otherwise, if the Minimum Number of Pledgers isn't met:

5. Pledgers are refunded the full Pledge Amount

## Benefits
- Creator is guarenteed the Exact Amount they specify
- Pledgers are incentivized to share the Campaign to reduce their Pledge Share
- Minimal Design allows for a wide range of applications

## Use Cases
- Artists
  - Artists can use the base model to maintain a stable income
  - Content can be made free to the public, making it easier to gain more and more followers
  - Pledgers can access "bonus content" using their pledger id
  - Earlier pledgers can receive a "dividend" as later campaigns pay a percentage back, crowdsourcing "Content Curators" as people look for new artists to support early
  - Different "Pledge Types" can be defined, allowing some pledgers to license the Artist's content. If the Pledger is also a PennySeed user, they can forward a percentage of their Campaigns to the Original Artist's Campaign

- Events
  - A Campaign can be made to cover all costs of the Event (venue, catering, staff)
  - People can attend by Pledging, using their pledger id as a ticket
  - The more "tickets" are sold, the lower the ticket price, incentivizing pledgers to get others to attend
  - Different types of "tickets" can be defined, from selling individual days for multi-day events
  - A "Maximum Pledgers" can be specified to ensure not "too many" people attend
  - A "Minimum Pledger Age" can be specified if alcohol is involved

- API Developers
  - Like Artists, API developers can use the base model for a standard income
  - Pledgers can use their pledge id as an API Access Key to use the API
  - The Pledge Amount can be based on API usage

- IoT Devices
  - A Campaign can be made to cover the cost of the device (e.g. a Coffee Machine shared by a Coworking Space
  - People use the IoT device by pledging, using the pledger id to access the device
  - The Pledge Amount can be based on usage (pledge multiple times for multiple uses) or a single pledge for "full access"
  - The Campaign can be set to be the day before its return policy, allowing the Campaigner to return the IoT device when the Campaign isn't met

- Coworking Spaces
  - A Recurring Campaign can be made to cover the total cost of running the Space (Rent, Utilities, Staff, Insurance, Maintenance)
  - Pledgers can use their pledge id to access the CoWorking Space, encouraging more people to join to lower costs
  - Pledge costs can vary based on attendance or usage of provided IoT equipment
  - Events can be hosted in the Space, whose venue costs are coupled to the rent costs
  - Startups and Unemployeed attendees can pledge indirectly with future earnings

- Startup Funding
  - Pledges can act as "shares"
  - A Recurring Campaign can forward a percent of Compaigns to past Campaign Pledgers, acing as a dividend
  - Product Startups can treat Pledges as Preorders, setting a Maximum number of Pledges for a fixed set of products

## Implementation
- Cryptocurrency for minimal processing fees
- Blockchain ledger for Proof-of-Pledge
- Smart Contracts for Third-Party Extensions

## Profit Model
- PennySeed will have a recurring Campaign with a dividend extension for "investors"
- All Campaigns pay a percent to a PennySeed fund
- Profits will come primarily from the former to the latter (and vice-versa for dividends)

## Building a Community
- Sponsoring Events by using PennySeed to fund the Events, including PennySeed Extension Hackathons
- Provide a way for existing pledges from external sources to act as retroactive pledges
