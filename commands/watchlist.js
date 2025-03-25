const db = require("../db");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  config: {
    name: "watchlist",
    description: "List all subscribed wars for this channel.",
    usage: `!watchlist`,
  },
  async run(bot, message, args) {
    const channelId = message.channel.id;

    db.all(
      `
      SELECT s.warId, s.favoredSide, w.attackerName, w.defenderName, w.regionName
      FROM war_subscriptions s
      JOIN war_details w ON s.warId = w.warId
      WHERE s.channelId = ?
      `,
      [channelId],
      (err, rows) => {
        if (err) {
          console.error("Error fetching watchlist:", err);
          message.channel.send("An error occurred while retrieving the watchlist.");
          return;
        }

        if (rows.length === 0) {
          message.channel.send("No active subscriptions for this channel.");
          return;
        }

        const embed = new EmbedBuilder()
          .setColor("#FFA500") // Orange for the watchlist
          .setTitle("**[WATCH]** - Active War Subscriptions")
          .setDescription(`A list of wars this channel is currently subscribed to:`)
          .setTimestamp()
          .setFooter({ text: "Eclesiar Bot" });

        rows.forEach((row, index) => {
          embed.addFields({
            name: `#${index + 1}: **War**: ${row.warId} **Side**: ${row.favoredSide.toUpperCase()}` ,
            value: `[**${row.attackerName}** VS **${row.defenderName}** **Region**: ${row.regionName}](https://eclesiar.com/war/${row.warId})`,
          });
        });

        message.channel.send({ embeds: [embed] });
      }
    );
  },
};
