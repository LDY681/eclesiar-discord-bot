const { fetchWars, getCountdown } = require("../middleware");
const { EmbedBuilder } = require("discord.js");
const { stopMonitoringWarAndChannel } = require("./unwatch.js");
const { monitorStore } = require("../monitorStore.js");

const db = require("../db");
module.exports = {
  config: {
    name: "watch",
    description: "Watch a war and report if the wall is in opponents favor",
    usage: `!watch <warId> <side(left/right)> <optional(role=here/everyone level=round/battle(default value))>`,
  },
  async run(bot, message, args) {
    console.log(`!watch command executed by ${message.author.username}`, args);
    const warId = parseInt(args[0]);
    let side = args[1]?.toLowerCase();

    // Side: Accept other side inputs as well
    const sideMapping = {
      attacker: "left",
      attack: "left",
      atk: "left",
      lft: "left",
      defender: "right",
      defend: "right",
      def: "right",
      rgt: "right",
    };
    side = sideMapping[side] || side; // Map side to "left" or "right"

    // Parse optional arguments
    let role = "";  // optional role tagging
    let level = "battle"; // By default, monitoring the whole battle

    args.slice(2).forEach(arg => {
      if (arg.startsWith("role=")) {
        role = arg.split("=")[1].toLowerCase(); // Extract role value (e.g., 'here' or 'everyone')
      } else if (arg.startsWith("level=")) {
        level = arg.split("=")[1].toLowerCase(); // Extract level value (e.g., 'round' or 'battle')
      }
    });

    // Validate war ID and side
    if (!warId || (side !== "left" && side !== "right")) {
      console.log(
        "Invalid war ID or side. Please use the format `!watch <warId> <side(left/right)> <optional(role=here/everyone level=round/battle(default value))>` with a valid war ID and side."
      );
      message.channel.send(
        "Invalid war ID or side. Please use the format `!watch <warId> <side(left/right)> <optional(role=here/everyone level=round/battle(default value))>` with a valid war ID and side."
      );
      return;
    }

    await startMonitoring(bot, message, warId, side, { role, level });
  },
  loadSubscriptions
};

// Load subscriptions from the database into state monitorStore and resume intervals
function loadSubscriptions(bot) {
  db.all(`SELECT * FROM war_subscriptions`, (err, rows) => {
    if (err) {
      console.error("Error loading subscriptions:", err);
    } else {
      rows.forEach((row) => {
        const monitorKey = `${row.warId}-${row.favoredSide}`;
        if (!monitorStore.has(monitorKey)) {
          const monitor = {
            subscribers: [{ guildId: row.guildId, channelId: row.channelId, role: row.role, level: row.level}],
            favoredSide: row.favoredSide,
            lastReportedFavor: null,
            interval: null,
          };
          monitorStore.set(monitorKey, monitor);
          console.log(`Resume monitoring on: ${monitorKey}`);
          startMonitoringWar(bot, row.warId, monitorKey, monitor); // Resume monitoring
        } else {
          monitorStore.get(monitorKey).subscribers.push({ guildId: row.guildId, channelId: row.channelId, role: row.role, level: row.level});
        }
      });
    }
  });
}

/**
 * Create a new monitor or add new subscriber to an existing monitor
 */
async function startMonitoring(bot, message, warId, side, { role, level }) {
  const monitorKey = `${warId}-${side}`;
  const favoredSide = side;
  let lastReportedFavor = null;

  //! CASE A: If a monitor is already existing, add channel to the monitor
  if (monitorStore.has(monitorKey)) {
    const monitor = monitorStore.get(monitorKey);
    const alreadySubscribed = monitor.subscribers.some(
      (sub) => sub.guildId === message.guild.id && sub.channelId === message.channel.id
    );
    if (!alreadySubscribed) {
      // add subscription to monitorStore
      monitor.subscribers.push({ guildId: message.guild.id, channelId: message.channel.id, ...{ role, level} });
      message.channel.send(`Added this channel to watch war ID: ${warId} for side: ${side.toUpperCase()}.`);
      // add subscription to database
      db.run(
        `INSERT INTO war_subscriptions (warId, channelId, guildId, favoredSide, role, level) VALUES (?, ?, ?, ?, ?, ?)`,
        [warId, message.channel.id, message.guild.id, favoredSide, role, level],
        (err) => {
          if (err) console.error("Error adding subscription:", err);
        }
      );
    } else {
      message.channel.send(`This channel is already subscribed to war ID: ${warId} for side: ${side.toUpperCase()}.`);
    }
    return;
  }

  //! CASE B: If a monitor doesn't exist, set the monitor with current subscription
  // add subscription to state
  const monitor = {
    interval: null,
    favoredSide,
    lastReportedFavor,
    subscribers: [{ guildId: message.guild.id, channelId: message.channel.id, ...{ role, level}}],
  };
  monitorStore.set(monitorKey, monitor);
  // add subscription to database
  db.run(
    `INSERT INTO war_subscriptions (warId, channelId, guildId, favoredSide, role, level) VALUES (?, ?, ?, ?, ?, ?)`,
    [warId, message.channel.id, message.guild.id, favoredSide, role, level],
    (err) => {
      if (err) console.error("Error adding subscription:", err);
    }
  );

  // Start the monitor for monitorKey
  startMonitoringWar(bot, warId, monitorKey, monitor);
  // Monitor the war every 30 seconds
  monitorStore.set(monitorKey, monitor);
  
  message.channel.send(
    `Started monitoring war ID: ${warId} for the **${favoredSide.toUpperCase()}** side. Alert when situation changes.`
  );
}

/**
 * The real time interval that handles the monitoring logics
 * Each monitorKey has one interval
 */
async function startMonitoringWar(bot, warId, monitorKey, monitor) {
  let lastRoundId = null; // Track the last seen round ID
  const monitorInterval = async () => {
    const warsData = await fetchWars();
    if (!warsData) return;

    const currentWar = warsData.find((war) => war.id === warId);

    // If war exists
    if (currentWar) {
      const currentRoundId = currentWar.current_round_id;

      // Update database where roundId is empty
      if (monitorStore.has(monitorKey)) {
        const monitor = monitorStore.get(monitorKey);
        const updatedSubscribers = [];

        monitor.subscribers.forEach((subscriber) => {
          // If any subscriber doesn't have roundId, update roundId to current one
          if (!subscriber.roundId) {
            subscriber.roundId = currentRoundId;
            console.log(`[WATCH] Updated roundId for subscriber in monitorStore: ${currentRoundId}`);
          }
          // If any subscribers have different roundId than currentRoundId, and the level is set to round, stop the individual monitor
          if (subscriber.roundId && subscriber.level == "round" && subscriber.roundId != currentRoundId) {
            stopMonitoringWarAndChannel(bot, monitorStore, warId, monitor.favoredSide, subscriber.channelId)
            console.log(`[WATCH] Stop a round-level subscriber: ${currentRoundId}`);
          } else {
            // Keep the subscriber if it doesn't need to be stopped
            updatedSubscribers.push(subscriber); 
          }
        });
        monitor.subscribers = updatedSubscribers;
        monitorStore.set(monitorKey, monitor);
      }

      // Update roundId to the database
      db.run(
        `UPDATE war_subscriptions SET roundId = ? WHERE warId = ? AND (roundId IS NULL OR roundId = '')`,
        [currentRoundId, warId],
        (err) => {
          if (err) {
            console.error(`[WATCH] Error updating roundId for warId ${warId}:`, err);
          }
        }
      );
    }

    // if war cannot be found(war has ended), or attackers_score/defenders_score is over 5 (win more than 5 rounds in total of 9 rounds), war-over and stop monitoring further
    if (!currentWar) { // TODO || currentWar.attackers_score >= 5 || currentWar.defenders_score >= 5
      stopMonitoringWar(warId);
      monitor.subscribers.forEach((sub) => {
        const channel = bot.channels.cache.get(sub.channelId);
        if (channel) {
          channel.send(`Battle ${warId} is over. Watcher stopped.`);
        }
      });
      return;
    }

    const currentRound = currentWar.current_round;
    const roundEndTime = new Date(
      currentRound.end_date + " UTC"
    ).getTime() / 1000;
    const { attackers_score, defenders_score, attackers_points, defenders_points, id: currentRoundId } = currentRound;

    // NEW ROUND: If the last round doesn't match with current round
    if (lastRoundId && lastRoundId !== currentRoundId) {
      for (const subscriber of monitor.subscribers) {
        console.log(`[WATCH] Sending embed notification to channel ${subscriber.channelId}.`);
        const channel = bot.channels.cache.get(subscriber.channelId);
        if (channel) {
          const newRoundEmbed = new EmbedBuilder()
            .setColor("#00FF00") // Green for new round
            .setTitle(`**[NEW ROUND]** - ${currentWar.attackers.name} VS ${currentWar.defenders.name}`)
            .setURL(`https://eclesiar.com/war/${warId}`)
            .setDescription(`A new round has started in the battle for ${currentWar.region.name}.`)
            .addFields(
              { name: "Time:", value: `${getCountdown(roundEndTime)} (End: ${currentRound.end_date})` }
            )
            .setTimestamp()
            .setFooter({ text: "Eclesiar Bot" });
          channel.send({ embeds: [newRoundEmbed] });
        }
      }
    }
    lastRoundId = currentRoundId; // Update to track the latest round

    // If no damage on both sides, skip this iteration
    if (attackers_score === 0 && defenders_score === 0) {
      console.log(`[WATCH] No damage on both sides for Battle ${warId}. Skipping this iteration.`);
      return;
    }

    const attackersName = currentWar.attackers.name;
    const defendersName = currentWar.defenders.name;
    const regionName = currentWar.region.name;
    const currentFavor = attackers_score > defenders_score ? "left" : "right";

    // Check if our favoredSide is losing, report only if it's a new situation, and if the battle is already over (one side has 2401 points or more)
    let alreadyOver = parseInt(attackers_points) >= 2401 || parseInt(defenders_points) >= 2401 && false; // TODO && false
    console.log("monitor.favoredSide:", monitor.favoredSide, "currentFavor", currentFavor, "lastReportedFavor", monitor.lastReportedFavor, "attackers_points", attackers_points, "defenders_points", defenders_points)
    if (
      currentFavor !== monitor.favoredSide &&
      monitor.lastReportedFavor !== currentFavor &&
      !alreadyOver
    ) {
      for (const subscriber of monitor.subscribers) {
        const channel = bot.channels.cache.get(subscriber.channelId);
        if (channel) {
          const embed = new EmbedBuilder()
            .setColor(currentFavor === "left" ? "#FF0000" : "#0000FF")
            .setTitle(`**[WATCH]** - ${attackersName} VS ${defendersName}`)
            .setURL(`https://eclesiar.com/war/${warId}`)
            .setDescription(`We are losing on battle of ${regionName}`)
            .addFields(
              {
                name: `Time: `,
                value: `${getCountdown(roundEndTime)} (End: ${currentRound.end_date})`,
              },
              {
                name: `**${attackersName}**`,
                value: `${attackers_score} dmg | ${attackers_points} pts`,
                inline: true,
              },
              {
                name: `**${defendersName}:**`,
                value: `${defenders_score} dmg | ${defenders_points} pts`,
                inline: true,
              }
            )
            .setTimestamp()
            .setFooter({ text: "Eclesiar Bot" });

          let roleParams = subscriber.role ? {content: `@${subscriber.role}`} : {}
          channel.send({ ...roleParams, embeds: [embed] });
        }
      }
      monitor.lastReportedFavor = currentFavor;
    }

    // If favored side is back to us, reset lastReportedFavor to us (neccessary to reset alert but actually not reported).
    if (currentFavor === monitor.favoredSide && monitor.lastReportedFavor !== monitor.favoredSide) {
      monitor.lastReportedFavor = currentFavor;
    }
  };

  monitor.interval = setInterval(monitorInterval, 30000);
}

function stopMonitoringWar(warId) {
  for (const [monitorKey, monitor] of monitorStore.entries()) {
    if (monitorKey.startsWith(warId)) {
      // delete subscription in state
      clearInterval(monitor.interval);
      monitorStore.delete(monitorKey);

      // delete subscription in database
      db.run(`DELETE FROM war_subscriptions WHERE warId = ?`, [warId], (err) => {
        if (err) console.error("Error deleting subscription:", err);
      });
      console.log(`[WATCH] Stopped monitoring war ID ${warId}.`);
    }
  }
}