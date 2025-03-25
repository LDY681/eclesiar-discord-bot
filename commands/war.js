const { fetchWars, getCountdown, fetchWarStatus } = require("../middleware");
const { EmbedBuilder } = require('discord.js');

module.exports = {
  config: {
    name: 'war',
    description: 'Fetch war status for a given battle',
    usage: `!war <warId>`,
  },
  async run(bot, message, args) {
    console.log(`!war command executed by ${message.author.username}`, args);
    const warId = parseInt(args[0]);

    if (!warId || isNaN(warId)) {
      message.channel.send("Invalid war ID. Please use the format `!war <warId>`");
      return;
    }

    // Fetch the list of wars and get current round info
    try {
      const wars = await fetchWars();
      const warData = wars.find(war => war.id === warId);

      if (!warData) {
        console.log(`[WAR] War ID ${warId} not found.`);
        message.channel.send(`War ID ${warId} not found.`);
        return;
      }

      const { current_round_id: roundId } = warData;
      if (!roundId) {
        console.log(`[WAR] Failed to fetch round information for war ID ${warId}.`);
        message.channel.send(`Failed to fetch round information for war ID ${warId}.`);
        return;
      }

      // Fetch detailed war status from the /war/status endpoint
      await getWarStatus(warId, roundId, message, warData);

    } catch (error) {
      console.error('[WAR] An error occurred while fetching information for war ID:', warId, error);
      message.channel.send('An error occurred while fetching information for war ID:' + warId);
    }

    // Function to fetch the war status from the API
    async function getWarStatus(warId, roundId, message, warData) {
      try {
        const warStatusData = await fetchWarStatus(roundId)

        const attackersName = warData.attackers.name;
        const defendersName = warData.defenders.name;
        const regionName = warData.region.name;

        // Send war status summary to the channel
        const roundEndCountdown = getCountdown(new Date(warStatusData.roundEnd + " UTC").getTime() / 1000);  // Convert timestamp to countdown
        
        const embed = new EmbedBuilder()
          .setColor("#FFA500") // Orange color for war information
          .setTitle(`**[WARINFO]** - ${attackersName} VS ${defendersName}`)
          .setURL(`https://eclesiar.com/war/${warId}`) // Add the war URL to the title
          .setDescription(`War Status for battle of ${regionName}`)
          .addFields(
            { name: `Time: `, value: `${roundEndCountdown} (End: ${warData.current_round.end_date })` },
            { name: `**${attackersName}**`, value: `${warStatusData.attackerScore} dmg | ${warStatusData.attackerPoints} pts`, inline: true },
            { name: `**${defendersName}:**`, value: `${warStatusData.defenderScore} dmg | ${warStatusData.defenderPoints} pts`, inline: true }
          )
          .setTimestamp()
          .setFooter({ text: "Eclesiar Bot" });

        // Top 5 Attackers
        if (warStatusData.last5Attackers.length > 0) {
          const attackersField = warStatusData.last5Attackers
            .map((attacker, index) => `${index + 1}. ${attacker.username}`)
            .join('\n');
          
          embed.addFields({ name: `Top 5 Attackers`, value: `\`\`\`${attackersField}\`\`\`` });
        } else {
          embed.addFields({ name: `Top 5 Attackers`, value: '*No attackers found.*' });
        }

        // Top 5 Defenders
        if (warStatusData.last5Defenders.length > 0) {
          const defendersField = warStatusData.last5Defenders
            .map((defender, index) => `${index + 1}. ${defender.username}`)
            .join('\n');
          
          embed.addFields({ name: `Top 5 Defenders`, value: `\`\`\`${defendersField}\`\`\`` });
        } else {
          embed.addFields({ name: `Top 5 Defenders`, value: '*No defenders found.*' });
        }

        // Send the embed message
        console.log(`[WAR] Sending embed notification to channel ${message.channel.id}.`);
        message.channel.send({ embeds: [embed] });
      } catch (error) {
        console.error(`[WAR] Error fetching war status for round ${roundId}:`, error);
        message.channel.send('An error occurred while fetching war status for round ' + roundId);
      }
    }
  }
};
