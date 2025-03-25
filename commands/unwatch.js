const { monitorStore } = require("../monitorStore.js");
const db = require("../db");

module.exports = {
  config: {
    name: "unwatch",
    description: "Stop watching a war",
    usage: `!unwatch <warId> <side>`,
  },
  async run(bot, message, args) {
    console.log(`!unwatch command executed by ${message.author.username}`, args);
    const warId = parseInt(args[0]);
    let side = args[1]?.toLowerCase();

    // Accept other side inputs as well
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

    if (!warId || (side !== "left" && side !== "right")) {
      console.log(
        "Invalid war ID or side. Please use the format `!unwatch <warId> <side>` with a valid war ID and side."
      );
      message.channel.send(
        "Invalid war ID or side. Please use the format `!unwatch <warId> <side(left/right)>` with a valid war ID and side."
      );
      return;
    }

    const channelId = message.channel.id;

    stopMonitoringWarAndChannel(bot, monitorStore, warId, side, channelId)

    // If no matching monitorKey is found
    console.log(`[UNWATCH] No active monitoring found for war ID ${warId}, side ${side}.`);
    message.channel.send(`No active monitoring found for war ID ${warId} and side ${side.toUpperCase()}.`);
  },
  stopMonitoringWarAndChannel
};

function stopMonitoringWarAndChannel(bot, monitorStore, warId, side, channelId) {
  const channel = bot.channels.cache.get(channelId);

  for (const [monitorKey, monitor] of monitorStore.entries()) {
    if (monitorKey === `${warId}-${side}`) {
      // Remove the specific channel from the subscribers
      const initialSubscriberCount = monitor.subscribers.length;
      monitor.subscribers = monitor.subscribers.filter(
        (subscriber) => subscriber.channelId !== channelId
      );

      if (monitor.subscribers.length < initialSubscriberCount) {
        console.log(`[UNWATCH] Removed channel ${channelId} from monitoring war ID ${warId}, side ${side}.`);
        channel.send(`Stopped watching war ID ${warId} for side ${side.toUpperCase()} in this channel.`);

        // Update the database to delete only this channel's subscription
        db.run(
          `DELETE FROM war_subscriptions WHERE warId = ? AND channelId = ? AND favoredSide = ?`,
          [warId, channelId, side],
          (err) => {
            if (err) console.error("[DB ERROR] Failed to delete subscription:", err);
          }
        );

        // If no subscribers remain, stop monitoring completely
        if (monitor.subscribers.length === 0) {
          clearInterval(monitor.interval);
          monitorStore.delete(monitorKey);
          console.log(`[UNWATCH] No more subscribers for war ID ${warId}, side ${side}. Monitoring stopped.`);
        }
      } else {
        console.log(`[UNWATCH] Channel ${channelId} was not subscribed to war ID ${warId}, side ${side}.`);
        channel.send(`This channel was not subscribed to war ID ${warId} for side ${side.toUpperCase()}.`);
      }

      return;
    }
  }
}
