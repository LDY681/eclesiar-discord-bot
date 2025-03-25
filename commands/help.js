const { EmbedBuilder } = require("discord.js");

module.exports = {
  config: {
    name: 'help',
    description: 'Documentation for all commands.',
    usage: `!help`,
  },
  async run(bot, message, args) {
    console.log("!help command executed by " + message.author.username);

    // Create an embed for the help message
    const embed = new EmbedBuilder()
      .setColor("#0099ff") // Set the color of the embed
      .setTitle("Help - Command Documentation")
      .setDescription("Here are the available commands:")
      .addFields(
        { name: "!help", value: "Show documentation." },
        { 
          name: "!watch <warId> <side(left/attack/atk | right/defend/def)>", 
          value: "Monitor and alert if the wall is in the other side's favor. Example: `!watch 123 left`" 
        },
        { 
          name: "!timer <warId> t<minutes>", 
          value: "Set an alarm to alert when the battle is closing in X minutes. Example: `!timer 123 t3`" 
        },
        { name: "!war <warId>", value: "Outputs general war information. Example: `!war 123`" },
        { name: "!remind <minutes> <message>", value: "Set a reminder for personal agenda. Example: `!remind 5 check auctions`" }
      )
      .setFooter({ text: "Eclesiar Bot - For battle monitoring and alerts" })
      .setTimestamp();

    // Send the embed to the channel
    message.channel.send({ embeds: [embed] });
  }
};
