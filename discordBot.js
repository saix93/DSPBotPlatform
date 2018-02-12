const Discord     = require('discord.js');
const Config      = require('./config.js');
const Client      = new Discord.Client();

Client.login(Config.discord.auth.token);

Client.on('ready', () => {
  console.log('Discord bot is ready!');
});

module.exports = {
  client: Client
}