const { isAdmin } = require("../middleware");
const { EmbedBuilder } = require("discord.js");

// !broadcast Bot has been updated, please restart any timers/watchers you have on, sorry for the inconvience! MAINTAINENCE ""
// !broadcast Tournament registeration for Friday Cup 2024-10-11 - 20:00 https://eclesiar.com/tournament/26 TOURNAMENT https://eclesiar.com/tournament/26
module.exports = {
  config: {
    name: "broadcast",
    description: "Broadcast a maintenance message to all channels. (Admin only)",
    usage: `!broadcast <message> [title] [url]`, 
  },
  async run(bot, message, args) {
    // Check if the user is an admin
    if (!isAdmin(message.author.username)) {
      message.channel.send("You do not have permission to use this command.");
      return;
    }

    // Ensure there is a message to broadcast
    if (args.length === 0) {
      message.channel.send("Please provide a message to broadcast.");
      return;
    }

    // Extract the last two arguments as title and URL, and join the rest as the message
    const broadcastMessage = args.slice(0, -2).join(" "); // All args except last two
    const broadcastTitle = args[args.length - 2] || "[BROADCAST]"; // Optional title
    const broadcastURL = args[args.length - 1]; // Optional URL

    // Broadcast the message to one channel per guild
    bot.guilds.cache.forEach(guild => {
      const channel = guild.channels.cache.find(
        channel =>
          channel.isTextBased() && 
          channel.permissionsFor(guild.members.me).has("SEND_MESSAGES")
      );

      // Send the broadcast message to the first valid channel
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor("#FFA500") // Orange color
          .setTitle(`**${broadcastTitle}**`)
          .setDescription(broadcastMessage)
          .setTimestamp()
          .setFooter({ text: "Eclesiar Bot" });

        // Set URL if provided and valid
        if (broadcastURL && isValidURL(broadcastURL)) {
          embed.setURL(broadcastURL);
        }

        channel.send({ embeds: [embed] });
      }
    });

    // Confirmation to the admin who used the command
    message.channel.send("Broadcast message sent to each guild.");
  },
};

// Helper function to validate URL
function isValidURL(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}