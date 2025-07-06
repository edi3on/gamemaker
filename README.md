#  Twitter Duel Bot — Gamemaker

This project lets users engage in AI-judged Twitter “duels” — arguments, rap battles, or roasts — where an Emperor Agent (powered by OpenAI) determines the winner. Match results are immutably recorded on-chain, player profiles are tracked long-term, and rewards are distributed in real-time.

> Built for a multi-chain hackathon featuring Flow, Saga, and Ronin.

---

## 🌐 Live Demo

> Coming soon: [https://gamemaker.xyz](https://gamemaker.xyz)

---

## 🔗 Tech Stack

| Layer       | Tech                           |
|------------|--------------------------------|
| Frontend   | [V0.dev](https://v0.dev) + React + Tailwind |
| Backend    | Node.js + Express              |
| AI Agent   | OpenAI API (GPT-4 + Image Gen) |
| Contracts  | Solidity (Ronin), Cadence (Flow), Cosmos SDK (Saga Chainlet) |
| Cross-chain| Off-chain orchestrator using `ethers.js` + `fcl` |
| Storage    | IPFS for prompts + AI results  |

---

## 🧱 Architecture Overview

Player ↔ Twitter Bot ↔ AI Agent (Emperor)
↓
[Saga Chainlet] ← Record Duel Result + Prompt
↓
[Flow] ← Update Player Profile (Wins/Losses)
↓
[Ronin] ← Trigger XP / Reward Distribution

yaml
Copy
Edit

- **Saga:** Records immutable match outcomes + AI prompt.
- **Flow:** Manages evolving player profiles.
- **Ronin:** Handles reward logic and leaderboard stats.

All chains are coordinated via an off-chain backend that listens to events and triggers updates.

---

## ⚙️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/edi3on/gamemaker.git
cd gamemaker
2. Install Dependencies
bash
Copy
Edit
npm install
3. Environment Variables
Create a .env file in the root directory:

env
Copy
Edit
OPENAI_API_KEY=your_openai_api_key
FLOW_ACCESS_NODE=https://access-testnet.onflow.org
RONIN_RPC_URL=https://api.roninchain.com/rpc
SAGA_RPC_URL=https://your-saga-rpc-url
PRIVATE_KEY=your_wallet_private_key
Update with the actual credentials and endpoints for each chain.

4. Run the Backend Orchestrator
bash
Copy
Edit
npm run start
This backend service listens for duel events on Saga and updates Flow and Ronin accordingly.

🔨 Development Scripts
Command	Purpose
npm run dev	Start frontend in dev mode
npm run start	Run backend orchestrator
npm run build	Build frontend for production
npm run test	Run test suite

📦 Folder Structure
bash
Copy
Edit
/contracts        # Smart contracts for Flow, Ronin, and Saga
/frontend         # V0-generated React frontend
/backend          # Orchestration logic, AI agent, and chain triggers
/scripts          # CLI tools for deploying and testing
🤝 Sponsors & Chain Integration
Sponsor	Role in System
Saga	Match execution and prompt/result recording
Flow	Player identity and long-term duel stats
Ronin	Reward distribution and leaderboard logic

Each chain is used intentionally and exclusively for what it's best at — no overlap, no redundancy.

🧪 Features
🧠 AI-powered duel judgments (OpenAI)

✍️ Transparent prompt logging on-chain

⚔️ Real-time duel results and stats

🎮 XP system + leaderboards (Ronin)

🌍 Cross-chain architecture (Saga, Flow, Ronin)

📁 IPFS storage for prompt + result transparency

📝 License
MIT License. See LICENSE.

📬 Contact
Lead Developer: @edi3on

Project Website: https://gamemaker.xyz (coming soon)

🚀 Contributing
We welcome contributions! To contribute:

Fork the repo

Create a new branch:

bash
Copy
Edit
git checkout -b feat/my-feature
Make your changes and commit:

bash
Copy
Edit
git commit -m "Add new feature"
Push to your fork:

bash
Copy
Edit
git push origin feat/my-feature
Submit a Pull Request

🏆 Hackathon Info
Built for [INSERT HACKATHON NAME] using:

Saga → Immutable match recording

Flow → Player profile + stat management

Ronin → Fast rewards and leaderboard logic

Each sponsor integration is deliberate and modular — showcasing the best of each ecosystem.

yaml
Copy
Edit

---

Let me know:
- If you want to insert a **hackathon name**
- If you want to add **badges** (build passing, license, demo link, etc.)
- Or if you’d like help customizing the `.env.example` or setting up a `deploy.md` for contributors.








Ask ChatGPT
