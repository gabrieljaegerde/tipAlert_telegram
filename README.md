# TipAlert Telegram Bot

With this bot users will be notified of any changes to tips relevant to their address(es) (finder + benefitiary) on the respective substrate chains.

This project is open-source and your contributions more than welcome!!!

If you enjoy this tool and would like to support my future projects:

KSM: Hgcdd6sjp37KD1cKrAbwMZ6sBZTAVwb6v2GTssv9L2w1oN3
DOT: 19W2RarZyGCQwc3zuT8qMZ88b8PwieEtvpakwoF87wMmkVy

Much appreciated!

## Usage

Setting up an alert is super easy:

Step 1: Select the tip events that you want to be notified for (new tip request, new tip, tip request closing, tip request closed)

Step 2: Enter address of wallet that should be tracked

A user can easily view, edit and delete any of their alerts.

## Installation

##### Database
Create a mongodb with [atlas](https://www.mongodb.com/atlas/database) for example.

##### Telegram API Key
Create a bot api key on telegram by messaging the BotFather.

##### .env
Create a .env file with the .env-sample structure. Fill in the required fields.

```npm install```

```tsc```

```node dist/index.js```

### License
Apache License 2.0
