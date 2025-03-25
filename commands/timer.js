const { fetchWars } = require("../middleware");
const timerStore = new Map(); // Track all timers
const warMonitorStore = new Map(); // Track centralized monitoring for wars
const { EmbedBuilder } = require("discord.js");

module.exports = {
  config: {
    name: "timer",
    description: "Set multiple timers for a specific battle to alert when the countdown reaches a threshold",
    usage: `!timer <warId> t<minutes>`,
  },
  async run(bot, message, args) {
    console.log(`!timer command executed by ${message.author.username}`, args);
    const warId = parseInt(args[0]);
    const timeThreshold = parseInt(args[1].replace("t", "")); // Only allow integers

    if (!warId || isNaN(warId) || isNaN(timeThreshold) || timeThreshold <= 0) {
      console.log(`[TIMER] Invalid war ID or tMinutes. Please use the format !timer <warId> t<minutes>`);
      message.channel.send("Invalid war ID or tMinutes. Please use the format `!timer <warId> t<minutes>` with minutes as an integer.");
      return;
    }

    message.channel.send(`Set timer for war ID ${warId}. Alert when countdown is less than ${timeThreshold} minutes.`);
    startTimer(bot, message, warId, timeThreshold);
  },
};

async function startTimer(bot, message, warId, timeThreshold) {
  const monitorKey = `${warId}-${message.guild.id}-${message.channel.id}`;
  let timers = timerStore.get(monitorKey) || [];

  if (timers.some((timer) => timer.timeThreshold === timeThreshold)) {
    return message.channel.send(`A timer with ${timeThreshold} minutes is already set for war ID ${warId}.`);
  }

  // Add timer to the store
  let hasAlerted = false;
  let roundEndTime = null;
  let attackersName = null;
  let defendersName = null;
  let regionName = null;

  // If no central monitor exists for this war, create one
  if (!warMonitorStore.has(warId)) {
    warMonitorStore.set(warId, { interval: null, roundEndTime: null });
    startMonitoringWar(warId);
  }

  const centralMonitor = warMonitorStore.get(warId);

  // Use the central monitor to track the new round information
  const startMonitoringRound = async () => {
    const warsData = await fetchWars();
    if (!warsData) return;

    const currentWar = warsData.find((war) => war.id === warId);
    if (!currentWar) {
      stopAllTimers(warId);
      message.channel.send(`Battle ${warId} is over. Timer stopped.`);
      return;
    }

    roundEndTime = new Date(currentWar.current_round.end_date + " UTC").getTime() / 1000; // Convert roundEnd to UTC in seconds
    attackersName = currentWar.attackers.name;
    defendersName = currentWar.defenders.name;
    regionName = currentWar.region.name;
    centralMonitor.roundEndTime = roundEndTime; // Update central monitor's roundEndTime
    hasAlerted = false;
  };

  // Call it initially to start monitoring the current round
  startMonitoringRound();

  const timerInterval = setInterval(() => {
    if (!centralMonitor.roundEndTime) return;

    const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
    const countdownSeconds = centralMonitor.roundEndTime - currentTime;

    if (countdownSeconds < 0) {
      // Don't handle round over logic in individual timers; it's centralized
      return;
    }

    const thresholdSeconds = timeThreshold * 60; // Convert timeThreshold to seconds

    if (countdownSeconds <= thresholdSeconds && !hasAlerted) {
      console.log(`[TIMER] Sending embed notification to channel ${message.channel.id}.`);
      const embed = new EmbedBuilder()
        .setColor("#FFD700") // Gold color for the timer alert
        .setTitle(`**[TIMER]** - ${attackersName} VS ${defendersName}`)
        .setURL(`https://eclesiar.com/war/${warId}`) // Add war URL here
        .setDescription(`T${timeThreshold} minutes left on battle of ${regionName}.\nPrepare to fight!`)
        .setTimestamp()
        .setFooter({ text: "Eclesiar Bot" });

      message.channel.send({ embeds: [embed] });
      hasAlerted = true;
    }
  }, 10000);

  timers.push({ timeThreshold, interval: timerInterval });
  timerStore.set(monitorKey, timers);
}

async function startMonitoringWar(warId) {
  const centralMonitor = warMonitorStore.get(warId);

  centralMonitor.interval = setInterval(async () => {
    const warsData = await fetchWars();
    if (!warsData) return;

    const currentWar = warsData.find((war) => war.id === warId);
    if (!currentWar) {
      // If the war no longer exists, stop all timers
      stopAllTimers(warId);
      return;
    }

    const roundEndTime = new Date(currentWar.current_round.end_date + " UTC").getTime() / 1000;
    centralMonitor.roundEndTime = roundEndTime;
  }, 30000); // Check every 30 seconds
}

function stopAllTimers(warId) {
  // Cancel all timers for a specific war
  for (const [monitorKey, timers] of timerStore.entries()) {
    if (monitorKey.startsWith(warId)) {
      timers.forEach((timer) => clearInterval(timer.interval));
      timerStore.delete(monitorKey);
    }
  }

  // Stop the central monitor for this war
  if (warMonitorStore.has(warId)) {
    clearInterval(warMonitorStore.get(warId).interval);
    warMonitorStore.delete(warId);
  }

  console.log(`[TIMER] Battle is over! All timers and central monitor for war ID ${warId} have been cancelled.`);
}