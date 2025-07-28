---
description: Repository Information Overview
alwaysApply: true
---

# DCS Discord Bot Information

## Summary
Advanced Discord bot with leveling system, economy, moderation, and Phasmophobia integration. The bot provides features like user leveling, virtual economy, moderation tools, ticket system, welcome messages, verification, and game integrations.

## Structure
- **src/**: Main source code directory
  - **commands/**: Bot commands organized by category
  - **events/**: Discord event handlers
  - **models/**: MongoDB data models
  - **utils/**: Utility functions and helpers
  - **assets/**: Static assets (images, sounds)
  - **data/**: Static data files

## Language & Runtime
**Language**: JavaScript (Node.js)
**Version**: Node.js 16.0.0 or newer
**Package Manager**: npm

## Dependencies
**Main Dependencies**:
- discord.js (v14.20.0): Core Discord API library
- @discordjs/voice (v0.18.0): Voice functionality
- mongoose (v8.16.0): MongoDB ODM
- dotenv (v17.2.0): Environment variable management
- node-cache (v5.1.2): In-memory caching
- node-cron (v4.2.1): Scheduled tasks
- ffmpeg-static (v5.2.0): Audio processing

## Build & Installation
```bash
# Clone repository
git clone https://github.com/yourusername/DCS-Discord-Bot.git
cd DCS-Discord-Bot

# Install dependencies
npm install

# Configure environment variables
# Create .env file with required variables from .env.example

# Deploy slash commands
npm run deploy

# Start the bot
npm start
```

## Environment Configuration
**Required Variables**:
- DISCORD_TOKEN: Discord bot authentication token
- CLIENT_ID: Discord application client ID
- GUILD_ID: Discord server ID
- MONGODB_URI: MongoDB connection string

## Main Entry Points
- **src/index.js**: Main bot initialization and configuration
- **src/deploy-commands.js**: Command registration with Discord API

## Features
- **Leveling System**: XP tracking, levels, achievements
- **Economy**: Virtual currency, shop, daily rewards
- **Moderation**: Auto-moderation, warning system, logs
- **Phasmophobia Integration**: Ghost database, evidence tracking
- **Ticket System**: Support ticket management
- **Welcome System**: Customizable welcome messages
- **Verification**: User verification process

## Performance Monitoring
The bot includes built-in performance monitoring with memory usage tracking, response time monitoring, and error logging capabilities.

## Commands
**Main Command Categories**:
- Administration: Server setup and configuration
- Phasmophobia: Game-related information and tools
- Leveling: User profiles and progression
- Economy: Currency and transactions
- Moderation: Server management tools